import { v4 as uuidv4 } from 'uuid'
import { db } from '../config/firebase'
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  limit,
  Timestamp
} from 'firebase/firestore'

// ─── Slug helpers ─────────────────────────────────────────────────────────────

const ACCENT_MAP = {
  á: 'a', à: 'a', ä: 'a', â: 'a', ã: 'a',
  é: 'e', è: 'e', ë: 'e', ê: 'e',
  í: 'i', ì: 'i', ï: 'i', î: 'i',
  ó: 'o', ò: 'o', ö: 'o', ô: 'o', õ: 'o',
  ú: 'u', ù: 'u', ü: 'u', û: 'u',
  ñ: 'n', ç: 'c'
}

export function generateSlug(companyName) {
  return companyName
    .toLowerCase()
    .trim()
    .replace(/[áàäâãéèëêíìïîóòöôõúùüûñç]/g, ch => ACCENT_MAP[ch] || ch)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40)
}

async function getUniqueSlug(baseSlug) {
  const exists = async (candidate) => {
    const q = query(
      collection(db, 'onboarding_tokens'),
      where('slug', '==', candidate),
      limit(1)
    )
    const snap = await getDocs(q)
    return !snap.empty
  }

  if (!(await exists(baseSlug))) return baseSlug

  let counter = 2
  while (counter <= 99) {
    const candidate = `${baseSlug}-${counter}`
    if (!(await exists(candidate))) return candidate
    counter++
  }
  // Fallback: append short random suffix
  return `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
}

// ─── UUID detector ────────────────────────────────────────────────────────────

function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Generates an access token and returns { token (UUID), slug (clean URL id) }
 */
export async function generateAccessToken(clientEmail, clientCompany) {
  const token = uuidv4()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  // Append first 5 hex chars of the UUID so each link is inherently unique
  const shortId = token.replace(/-/g, '').slice(0, 5)
  const slug = await getUniqueSlug(`${generateSlug(clientCompany)}-${shortId}`)

  try {
    await setDoc(doc(db, 'onboarding_tokens', token), {
      token,
      slug,
      clientEmail,
      clientCompany,
      createdAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(expiresAt),
      usedAt: null,
      status: 'active',
      viewCount: 0,
      lastAccessAt: null
    })

    return { token, slug }
  } catch (error) {
    console.error('Error generating token:', error)
    throw new Error('Failed to generate access token')
  }
}

/**
 * Resolves a slug to its internal token UUID.
 * Returns null if not found.
 */
async function resolveSlugToToken(slug) {
  const q = query(
    collection(db, 'onboarding_tokens'),
    where('slug', '==', slug),
    limit(1)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  return snap.docs[0].data().token
}

/**
 * Validates a token or slug.
 * Accepts: UUID token (legacy) or clean slug (new).
 */
export async function validateToken(tokenOrSlug) {
  try {
    let internalToken = tokenOrSlug

    // If it's not a UUID, try resolving as slug
    if (!isUUID(tokenOrSlug)) {
      const resolved = await resolveSlugToToken(tokenOrSlug)
      if (!resolved) {
        return { valid: false, error: 'Link no encontrado o no válido' }
      }
      internalToken = resolved
    }

    const tokenDoc = await getDoc(doc(db, 'onboarding_tokens', internalToken))

    if (!tokenDoc.exists()) {
      return { valid: false, error: 'Token no encontrado' }
    }

    const tokenData = tokenDoc.data()
    const now = new Date()

    if (tokenData.expiresAt.toDate() < now) {
      return { valid: false, error: 'El link ha expirado' }
    }

    if (tokenData.status !== 'active') {
      return { valid: false, error: `El link no está disponible (estado: ${tokenData.status})` }
    }

    await updateDoc(doc(db, 'onboarding_tokens', internalToken), {
      viewCount: (tokenData.viewCount || 0) + 1,
      lastAccessAt: Timestamp.fromDate(now)
    })

    return {
      valid: true,
      clientEmail: tokenData.clientEmail,
      clientCompany: tokenData.clientCompany,
      token: internalToken,
      slug: tokenData.slug || null
    }
  } catch (error) {
    console.error('Error validating token:', error)
    return { valid: false, error: 'Error al validar el link' }
  }
}

/**
 * Retrieves client data after validating a token or slug.
 */
export async function getClientDataByToken(tokenOrSlug) {
  try {
    const validation = await validateToken(tokenOrSlug)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    const clientQuery = query(
      collection(db, 'clientes'),
      where('email', '==', validation.clientEmail)
    )
    const clientSnapshot = await getDocs(clientQuery)

    if (clientSnapshot.empty) {
      const clientDocRef = doc(collection(db, 'clientes'))
      const newClientData = {
        email: validation.clientEmail,
        empresa: validation.clientCompany,
        createdAt: Timestamp.fromDate(new Date()),
        estado_cliente: 'no_iniciado',
        estado_admin: 'pendiente',
        progreso: 0
      }
      await setDoc(clientDocRef, newClientData)
      return { clientId: clientDocRef.id, clientData: newClientData, isNew: true }
    } else {
      const clientDoc = clientSnapshot.docs[0]
      return { clientId: clientDoc.id, clientData: clientDoc.data(), isNew: false }
    }
  } catch (error) {
    console.error('Error getting client data:', error)
    throw new Error('Failed to retrieve client data')
  }
}

export async function markTokenAsUsed(token) {
  try {
    await updateDoc(doc(db, 'onboarding_tokens', token), {
      usedAt: Timestamp.fromDate(new Date()),
      status: 'used'
    })
  } catch (error) {
    console.error('Error marking token as used:', error)
    throw new Error('Failed to mark token as used')
  }
}

export async function revokeToken(token) {
  try {
    await updateDoc(doc(db, 'onboarding_tokens', token), {
      status: 'expired'
    })
  } catch (error) {
    console.error('Error revoking token:', error)
    throw new Error('Failed to revoke token')
  }
}

export async function getTokenInfo(token) {
  try {
    const tokenDoc = await getDoc(doc(db, 'onboarding_tokens', token))
    if (!tokenDoc.exists()) throw new Error('Token not found')
    return tokenDoc.data()
  } catch (error) {
    console.error('Error getting token info:', error)
    throw error
  }
}

export async function getTokensByCompany(clientCompany) {
  try {
    const tokenQuery = query(
      collection(db, 'onboarding_tokens'),
      where('clientCompany', '==', clientCompany)
    )
    const tokenSnapshot = await getDocs(tokenQuery)
    return tokenSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (error) {
    console.error('Error getting tokens by company:', error)
    throw error
  }
}

export default {
  generateAccessToken,
  validateToken,
  markTokenAsUsed,
  revokeToken,
  getClientDataByToken,
  getTokenInfo,
  getTokensByCompany,
  generateSlug
}
