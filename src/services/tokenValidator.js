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
  Timestamp
} from 'firebase/firestore'

/**
 * Genera un token de acceso en formato UUID
 */
export async function generateAccessToken(clientEmail, clientCompany) {
  const token = uuidv4()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 días

  try {
    await setDoc(doc(db, 'onboarding_tokens', token), {
      token,
      clientEmail,
      clientCompany,
      createdAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(expiresAt),
      usedAt: null,
      status: 'active',
      viewCount: 0,
      lastAccessAt: null
    })

    return token
  } catch (error) {
    console.error('Error generating token:', error)
    throw new Error('Failed to generate access token')
  }
}

/**
 * Valida un token de onboarding
 */
export async function validateToken(token) {
  try {
    const tokenDoc = await getDoc(doc(db, 'onboarding_tokens', token))

    if (!tokenDoc.exists()) {
      return {
        valid: false,
        error: 'Token no encontrado'
      }
    }

    const tokenData = tokenDoc.data()
    const now = new Date()

    // Verificar si el token está expirado
    if (tokenData.expiresAt.toDate() < now) {
      return {
        valid: false,
        error: 'El token ha expirado'
      }
    }

    // Verificar si el token está activo
    if (tokenData.status !== 'active') {
      return {
        valid: false,
        error: `El token no está disponible (estado: ${tokenData.status})`
      }
    }

    // Incrementar view count
    await updateDoc(doc(db, 'onboarding_tokens', token), {
      viewCount: (tokenData.viewCount || 0) + 1,
      lastAccessAt: Timestamp.fromDate(now)
    })

    return {
      valid: true,
      clientEmail: tokenData.clientEmail,
      clientCompany: tokenData.clientCompany,
      token
    }
  } catch (error) {
    console.error('Error validating token:', error)
    return {
      valid: false,
      error: 'Error al validar el token'
    }
  }
}

/**
 * Marca un token como usado
 */
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

/**
 * Revoca un token (lo expira)
 */
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

/**
 * Obtiene datos del cliente por token
 */
export async function getClientDataByToken(token) {
  try {
    const validation = await validateToken(token)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // Buscar cliente existente
    const clientQuery = query(
      collection(db, 'clientes'),
      where('email', '==', validation.clientEmail)
    )
    const clientSnapshot = await getDocs(clientQuery)

    if (clientSnapshot.empty) {
      // Crear nuevo cliente
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
      return {
        clientId: clientDocRef.id,
        clientData: newClientData,
        isNew: true
      }
    } else {
      const clientDoc = clientSnapshot.docs[0]
      return {
        clientId: clientDoc.id,
        clientData: clientDoc.data(),
        isNew: false
      }
    }
  } catch (error) {
    console.error('Error getting client data by token:', error)
    throw new Error('Failed to retrieve client data')
  }
}

/**
 * Obtiene información del token (para admin)
 */
export async function getTokenInfo(token) {
  try {
    const tokenDoc = await getDoc(doc(db, 'onboarding_tokens', token))
    if (!tokenDoc.exists()) {
      throw new Error('Token not found')
    }
    return tokenDoc.data()
  } catch (error) {
    console.error('Error getting token info:', error)
    throw error
  }
}

/**
 * Obtiene todos los tokens de una empresa (para admin)
 */
export async function getTokensByCompany(clientCompany) {
  try {
    const tokenQuery = query(
      collection(db, 'onboarding_tokens'),
      where('clientCompany', '==', clientCompany)
    )
    const tokenSnapshot = await getDocs(tokenQuery)
    return tokenSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
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
  getTokensByCompany
}
