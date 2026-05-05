import { auth, db } from '../config/firebase'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import {
  doc,
  getDoc
} from 'firebase/firestore'

/**
 * Login para admin
 */
export async function adminLogin(email, password) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password)
    const userDoc = await getDoc(doc(db, 'users', result.user.uid))

    if (!userDoc.exists()) {
      await signOut(auth)
      throw new Error('Usuario no encontrado en la base de datos')
    }

    const userData = userDoc.data()

    if (userData.role !== 'admin') {
      await signOut(auth)
      throw new Error('No tienes permisos de administrador')
    }

    return result.user
  } catch (error) {
    console.error('Admin login error:', error)

    // Si es un error de Firebase con código
    if (error.code) {
      throw new Error(getErrorMessage(error.code))
    }

    // Si es nuestro error personalizado
    throw error
  }
}

/**
 * Logout para admin
 */
export async function adminLogout() {
  try {
    await signOut(auth)
    return { success: true }
  } catch (error) {
    console.error('Logout error:', error)
    throw error
  }
}

/**
 * Verifica si el usuario actual es admin
 */
export async function checkIfAdmin(user) {
  if (!user) return false

  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid))
    return userDoc.exists() && userDoc.data().role === 'admin'
  } catch (error) {
    console.error('Error checking admin role:', error)
    return false
  }
}

/**
 * Obtiene información del usuario admin
 */
export async function getAdminInfo(uid) {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid))
    if (!userDoc.exists()) {
      throw new Error('Usuario no encontrado')
    }
    return userDoc.data()
  } catch (error) {
    console.error('Error getting admin info:', error)
    throw error
  }
}

/**
 * Mapea códigos de error a mensajes en español
 */
function getErrorMessage(code) {
  const messages = {
    'auth/invalid-email': 'Email inválido',
    'auth/user-not-found': 'Usuario no encontrado',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/email-already-in-use': 'Este email ya está registrado',
    'auth/weak-password': 'Contraseña muy débil (mínimo 6 caracteres)',
    'auth/operation-not-allowed': 'Operación no permitida',
    'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
    'auth/network-request-failed': 'Error de conexión. Verifica tu internet'
  }

  return messages[code] || 'Error en la autenticación. Intenta de nuevo.'
}

export default {
  adminLogin,
  adminLogout,
  checkIfAdmin,
  getAdminInfo
}
