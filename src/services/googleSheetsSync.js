import { collection, getDocs, query, where, Timestamp, getDoc, doc } from 'firebase/firestore'
import { db } from '../config/firebase'

/**
 * Exporta los datos de clientes a Google Sheets
 * Retorna datos formateados para importar en Google Sheets o descargar como CSV
 */
export async function exportClientsToGoogleSheets(empresa = 'default') {
  try {
    // Obtener clientes de la empresa
    const q = query(
      collection(db, 'clientes'),
      where('empresa', '==', empresa)
    )
    const snapshot = await getDocs(q)
    const clients = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Formatear datos para Google Sheets
    const sheetData = clients.map(client => ({
      'ID Cliente': client.id || '',
      'Fecha Creación': formatTimestamp(client.createdAt) || '',
      'Última Actualización': formatTimestamp(client.updatedAt) || '',
      'Nombre Empresa': client.empresa || client.nombre_comercial || '',
      'Email': client.info_basica?.email || client.email || '',
      'Teléfono': client.info_basica?.telefono || client.telefono || '',
      'WhatsApp': client.info_basica?.whatsapp || client.whatsapp || '',
      'Progreso %': client.progreso || 0,
      'Estado Cliente': client.estado_cliente || 'no_iniciado',
      'Estado Admin': client.estado_admin || 'pendiente',
      'Servicio Principal': client.servicio_principal?.nombre_servicio || '',
      'Cliente Ideal': client.cliente_ideal?.cliente_ideal || '',
      'Marca': client.marca ? 'Sí' : 'No',
      'Meta': client.meta ? 'Sí' : 'No',
      'Google': client.google ? 'Sí' : 'No',
      'Slack': client.slack ? 'Sí' : 'No',
      'IA': client.ia ? 'Sí' : 'No',
      'Inspiración': client.inspiracion ? 'Sí' : 'No',
      'Meeting Agendado': client.agendamiento?.meeting_agendado ? 'Sí' : 'No',
      'Fecha Meeting': formatTimestamp(client.agendamiento?.fecha_agendamiento) || ''
    }))

    return sheetData
  } catch (error) {
    console.error('Error exporting to Google Sheets:', error)
    throw error
  }
}

/**
 * Descarga los datos de clientes como archivo CSV
 */
export async function downloadClientsAsCSV(empresa = 'default') {
  try {
    const sheetData = await exportClientsToGoogleSheets(empresa)

    // Convertir a CSV
    const csv = convertToCSV(sheetData)

    // Crear blob y descargar
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `clientes-${empresa}-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    return { success: true, message: 'CSV descargado correctamente' }
  } catch (error) {
    console.error('Error downloading CSV:', error)
    throw error
  }
}

/**
 * Descarga los datos de un cliente específico como JSON
 */
export async function downloadClientAsJSON(clientId, clientName = 'cliente') {
  try {
    const docSnap = await getDoc(doc(db, 'clientes', clientId))

    if (!docSnap.exists()) {
      throw new Error('Cliente no encontrado')
    }

    const clientData = docSnap.data()

    // Crear blob y descargar
    const blob = new Blob([JSON.stringify(clientData, null, 2)], {
      type: 'application/json;charset=utf-8;'
    })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `${clientName}-${new Date().toISOString().split('T')[0]}.json`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    return { success: true, message: 'JSON descargado correctamente' }
  } catch (error) {
    console.error('Error downloading JSON:', error)
    throw error
  }
}

/**
 * Descarga todos los clientes como un archivo JSON
 */
export async function downloadAllClientsAsJSON(empresa = 'default') {
  try {
    const q = query(
      collection(db, 'clientes'),
      where('empresa', '==', empresa)
    )
    const snapshot = await getDocs(q)
    const clients = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Crear blob y descargar
    const blob = new Blob([JSON.stringify(clients, null, 2)], {
      type: 'application/json;charset=utf-8;'
    })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `clientes-${empresa}-${new Date().toISOString().split('T')[0]}.json`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    return { success: true, message: `${clients.length} clientes descargados correctamente` }
  } catch (error) {
    console.error('Error downloading all clients as JSON:', error)
    throw error
  }
}

/**
 * Obtiene un objeto formateado para importar en Google Sheets
 */
export async function getFormattedSheetData(empresa = 'default') {
  try {
    const sheetData = await exportClientsToGoogleSheets(empresa)

    if (sheetData.length === 0) {
      return {
        success: true,
        data: [],
        message: 'No hay clientes para exportar'
      }
    }

    // Crear estructura compatible con Google Sheets API
    const headers = Object.keys(sheetData[0])
    const rows = [
      headers,
      ...sheetData.map(row => headers.map(header => row[header] || ''))
    ]

    return {
      success: true,
      data: rows,
      headers: headers,
      count: sheetData.length,
      message: `${sheetData.length} clientes formateados para Google Sheets`
    }
  } catch (error) {
    console.error('Error getting formatted sheet data:', error)
    throw error
  }
}

/**
 * Formatea timestamp de Firestore a string legible
 */
function formatTimestamp(timestamp) {
  if (!timestamp) return ''

  try {
    let date

    // Si es objeto Timestamp de Firestore
    if (timestamp.toDate) {
      date = timestamp.toDate()
    }
    // Si es Date normal
    else if (timestamp instanceof Date) {
      date = timestamp
    }
    // Si es string ISO
    else if (typeof timestamp === 'string') {
      date = new Date(timestamp)
    } else {
      return ''
    }

    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    console.error('Error formatting timestamp:', error)
    return ''
  }
}

/**
 * Convierte array de objetos a CSV
 */
function convertToCSV(data) {
  if (!data || data.length === 0) {
    return ''
  }

  const headers = Object.keys(data[0])
  const csvHeaders = headers.map(header => `"${header}"`).join(',')

  const csvRows = data.map(row => {
    return headers.map(header => {
      let value = row[header] || ''
      // Escapar comillas en valores
      if (typeof value === 'string') {
        value = value.replace(/"/g, '""')
      }
      return `"${value}"`
    }).join(',')
  })

  return [csvHeaders, ...csvRows].join('\n')
}

/**
 * Prepara una URL para importar datos en Google Sheets
 * Devuelve instrucciones para el usuario
 */
export function getGoogleSheetsImportInstructions(sheetName = 'Onboardings Clientes Alphalux') {
  return `
INSTRUCCIONES PARA IMPORTAR EN GOOGLE SHEETS:

1. Abre Google Sheets (https://sheets.google.com)
2. Crea una nueva hoja o abre una existente
3. Renombra la hoja a: "${sheetName}"
4. Ve a "Archivo" > "Importar"
5. Selecciona "Subir" y elige el archivo CSV que descargaste
6. Selecciona "Crear nueva hoja" y configura:
   - Separador: Coma
   - Convertir texto a números: Sí
7. ¡Listo! Tus datos de clientes están en Google Sheets

ALTERNATIVA - COPIAR Y PEGAR:
1. Descarga el CSV
2. Abre el archivo con Excel o Google Sheets
3. Selecciona todo (Ctrl+A)
4. Copia (Ctrl+C)
5. Pega en tu hoja de Google Sheets (Ctrl+V)
  `
}

export default {
  exportClientsToGoogleSheets,
  downloadClientsAsCSV,
  downloadClientAsJSON,
  downloadAllClientsAsJSON,
  getFormattedSheetData,
  getGoogleSheetsImportInstructions
}
