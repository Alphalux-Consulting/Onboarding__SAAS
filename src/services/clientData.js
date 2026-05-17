import { db, storage } from '../config/firebase'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  deleteDoc
} from 'firebase/firestore'
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage'

/**
 * Obtiene datos del cliente
 */
export async function getClientData(clientId) {
  try {
    const docSnap = await getDoc(doc(db, 'clientes', clientId))
    if (!docSnap.exists()) {
      return null
    }
    return {
      id: docSnap.id,
      ...docSnap.data()
    }
  } catch (error) {
    console.error('Error getting client data:', error)
    throw error
  }
}

/**
 * Actualiza datos del cliente
 */
export async function updateClientData(clientId, data) {
  try {
    const updateData = {
      ...data,
      updatedAt: Timestamp.fromDate(new Date()),
      lastEditedAt: Timestamp.fromDate(new Date())
    }

    // Use setDoc with merge to create if not exists, update if exists
    await setDoc(doc(db, 'clientes', clientId), updateData, { merge: true })

    return {
      success: true,
      message: 'Datos actualizados correctamente'
    }
  } catch (error) {
    console.error('Error updating client data:', error)
    throw error
  }
}

/**
 * Guarda un módulo del cliente
 */
export async function saveClientModule(clientId, moduleName, moduleData) {
  try {
    const clientDoc = await getDoc(doc(db, 'clientes', clientId))
    const currentData = clientDoc.data() || {}

    // Actualizar solo el módulo específico
    const updateData = {
      ...currentData,
      [moduleName]: moduleData,
      updatedAt: Timestamp.fromDate(new Date()),
      lastEditedAt: Timestamp.fromDate(new Date())
    }

    // Use setDoc with merge to create if not exists, update if exists
    await setDoc(doc(db, 'clientes', clientId), updateData, { merge: true })

    return {
      success: true,
      message: `${moduleName} guardado correctamente`
    }
  } catch (error) {
    console.error(`Error saving module ${moduleName}:`, error)
    throw error
  }
}

/**
 * Calcula el progreso del cliente
 */
export async function calculateProgress(clientId) {
  try {
    const clientData = await getClientData(clientId)
    if (!clientData) return 0

    // Contar módulos completados
    const modules = [
      'info_basica',
      'servicio_principal',
      'cliente_ideal',
      'marca',
      'meta',
      'google',
      'slack',
      'ia',
      'inspiracion',
      'agendamiento'
    ]

    let completedModules = 0
    modules.forEach(module => {
      if (clientData[module] && Object.keys(clientData[module]).length > 0) {
        completedModules++
      }
    })

    const progress = Math.round((completedModules / modules.length) * 100)

    // Actualizar progreso - use setDoc with merge for robustness
    await setDoc(doc(db, 'clientes', clientId), {
      progreso: progress,
      updatedAt: Timestamp.fromDate(new Date())
    }, { merge: true })

    return progress
  } catch (error) {
    console.error('Error calculating progress:', error)
    return 0
  }
}

/**
 * Sube un archivo para el cliente
 */
export async function uploadClientFile(clientId, file, folder = 'general') {
  try {
    const fileRef = ref(storage, `clients/${clientId}/${folder}/${Date.now()}_${file.name}`)
    const snapshot = await uploadBytes(fileRef, file)
    const downloadURL = await getDownloadURL(snapshot.ref)

    return {
      name: file.name,
      url: downloadURL,
      uploadedAt: new Date(),
      size: file.size,
      type: file.type
    }
  } catch (error) {
    console.error('Error uploading file:', error)
    throw error
  }
}

/**
 * Elimina un archivo del cliente
 */
export async function deleteClientFile(filePath) {
  try {
    const fileRef = ref(storage, filePath)
    await deleteObject(fileRef)
    return { success: true }
  } catch (error) {
    console.error('Error deleting file:', error)
    throw error
  }
}

/**
 * Marca un cliente como completado
 */
export async function markClientComplete(clientId) {
  try {
    await updateDoc(doc(db, 'clientes', clientId), {
      estado_cliente: 'completado',
      completedAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date())
    })

    return { success: true }
  } catch (error) {
    console.error('Error marking client as complete:', error)
    throw error
  }
}

/**
 * Obtiene todos los clientes de una empresa (para admin)
 */
export async function getCompanyClients(empresa) {
  try {
    const q = query(
      collection(db, 'clientes'),
      where('empresa', '==', empresa)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error getting company clients:', error)
    throw error
  }
}

/**
 * Actualiza el estado de un cliente (admin)
 */
export async function updateClientStatus(clientId, estado) {
  try {
    await updateDoc(doc(db, 'clientes', clientId), {
      estado_cliente: estado,
      updatedAt: Timestamp.fromDate(new Date())
    })

    return { success: true }
  } catch (error) {
    console.error('Error updating client status:', error)
    throw error
  }
}

/**
 * Actualiza el estado del admin para un cliente
 */
export async function updateAdminStatus(clientId, adminStatus) {
  try {
    await updateDoc(doc(db, 'clientes', clientId), {
      estado_admin: adminStatus,
      updatedAt: Timestamp.fromDate(new Date())
    })

    return { success: true }
  } catch (error) {
    console.error('Error updating admin status:', error)
    throw error
  }
}

/**
 * Crea un nuevo cliente
 */
export async function createClient(empresa, email, nombre_comercial) {
  try {
    const now = Timestamp.fromDate(new Date())

    const newClientRef = doc(collection(db, 'clientes'))

    const clientData = {
      empresa: 'default',  // Always use 'default' to match admin company filter
      nombre_comercial: nombre_comercial || empresa || 'Sin nombre',
      nombre_empresa: empresa || 'Sin nombre',  // Store actual empresa name separately
      email: email || '',
      progreso: 0,
      estado_cliente: 'no_iniciado',
      estado_admin: 'pendiente',
      createdAt: now,
      updatedAt: now,
      lastEditedAt: now
    }

    await setDoc(newClientRef, clientData)

    return {
      success: true,
      clientId: newClientRef.id,
      message: 'Cliente creado correctamente'
    }
  } catch (error) {
    console.error('Error creating client:', error)
    throw error
  }
}

export default {
  getClientData,
  updateClientData,
  saveClientModule,
  calculateProgress,
  uploadClientFile,
  deleteClientFile,
  markClientComplete,
  getCompanyClients,
  updateClientStatus,
  updateAdminStatus,
  createClient
}
