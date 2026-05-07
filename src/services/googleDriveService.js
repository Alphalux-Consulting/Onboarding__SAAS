/**
 * Google Drive Service
 * Handles all Google Drive API interactions for client brand materials
 *
 * Features:
 * - Automatic folder creation for new clients
 * - Category-based file organization (Identidad Visual, Multimedia, Comercial, Referencias)
 * - Direct file upload to Drive
 * - Linking existing Drive folders
 * - File metadata retrieval
 * - Team access and sharing
 */

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3'
const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder'

// Category folder structure
export const BRAND_CATEGORIES = {
  identidad_visual: {
    name: 'Identidad Visual',
    description: 'Logos, colores, tipografías, guías de estilo',
    icon: '🎨'
  },
  multimedia: {
    name: 'Multimedia',
    description: 'Videos, imágenes, animaciones, banners',
    icon: '🎬'
  },
  comercial: {
    name: 'Comercial',
    description: 'Presentaciones, propuestas, PDFs comerciales',
    icon: '📊'
  },
  referencias: {
    name: 'Referencias',
    description: 'Inspiración, referencias visuales, competencia',
    icon: '📎'
  }
}

/**
 * Get Google Drive access token from session or Firebase Auth
 * @returns {Promise<string>} Access token for Drive API
 */
async function getAccessToken() {
  try {
    // Try to get from sessionStorage first (if user logged in with Google)
    const storedToken = sessionStorage.getItem('googleDriveToken')
    if (storedToken) {
      return storedToken
    }

    // If no token, we need to prompt user to login
    // This will be handled in the component
    throw new Error('No Google Drive access token available. Please authenticate first.')
  } catch (error) {
    console.error('Error getting access token:', error)
    throw error
  }
}

/**
 * Setup Google Drive folder structure for a new client
 * Creates: /Clientes/{companyName}_{clientId}/ with subfolders for each category
 *
 * @param {string} clientId - Client ID from Firestore
 * @param {string} companyName - Company/Commercial name
 * @param {string} parentFolderId - Parent folder ID in Drive (optional, defaults to root)
 * @returns {Promise<Object>} Object with main folder ID and category folder IDs
 */
export async function setupClientDriveFolder(clientId, companyName, parentFolderId = 'root') {
  try {
    const token = await getAccessToken()

    // Sanitize company name for folder name
    const folderName = `Clientes/${companyName}_${clientId}`.replace(/[<>:"/\\|?*]/g, '-')

    // Create main client folder
    const mainFolderResponse = await fetch(`${DRIVE_API_BASE}/files?supportsAllDrives=true`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: FOLDER_MIME_TYPE,
        parents: [parentFolderId],
        description: `Carpeta de brand materials para ${companyName}`
      })
    })

    if (!mainFolderResponse.ok) {
      throw new Error(`Failed to create main folder: ${mainFolderResponse.statusText}`)
    }

    const mainFolder = await mainFolderResponse.json()
    const mainFolderId = mainFolder.id

    // Create category subfolders
    const categoryFolders = {}
    const categoryPromises = Object.entries(BRAND_CATEGORIES).map(async ([key, category]) => {
      const categoryResponse = await fetch(`${DRIVE_API_BASE}/files?supportsAllDrives=true`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: category.name,
          mimeType: FOLDER_MIME_TYPE,
          parents: [mainFolderId],
          description: category.description
        })
      })

      if (!categoryResponse.ok) {
        throw new Error(`Failed to create ${category.name} folder: ${categoryResponse.statusText}`)
      }

      const categoryFolder = await categoryResponse.json()
      categoryFolders[key] = categoryFolder.id
      return { key, folderId: categoryFolder.id }
    })

    await Promise.all(categoryPromises)

    return {
      success: true,
      mainFolderId,
      categoryFolders,
      folderName,
      driveUrl: `https://drive.google.com/drive/folders/${mainFolderId}`
    }
  } catch (error) {
    console.error('Error setting up Drive folder:', error)
    throw error
  }
}

/**
 * Upload a file to Google Drive in the appropriate category folder
 *
 * @param {File} file - File object to upload
 * @param {string} categoryFolderId - Drive folder ID for the category
 * @param {string} clientId - Client ID (for metadata)
 * @returns {Promise<Object>} File metadata (id, name, webViewLink, webContentLink, size, mimeType)
 */
export async function uploadFileToDrive(file, categoryFolderId, clientId) {
  try {
    const token = await getAccessToken()

    // Create form data for multipart upload
    const formData = new FormData()

    // File metadata
    const metadata = {
      name: file.name,
      parents: [categoryFolderId],
      properties: {
        clientId,
        uploadedAt: new Date().toISOString()
      }
    }

    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    formData.append('file', file)

    // Upload using resumable upload protocol
    const uploadResponse = await fetch(
      `${DRIVE_API_BASE}/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink,webContentLink,fileSize,mimeType,createdTime`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      }
    )

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`)
    }

    const uploadedFile = await uploadResponse.json()

    return {
      success: true,
      fileId: uploadedFile.id,
      name: uploadedFile.name,
      viewUrl: uploadedFile.webViewLink,
      downloadUrl: uploadedFile.webContentLink,
      size: uploadedFile.fileSize,
      mimeType: uploadedFile.mimeType,
      createdAt: uploadedFile.createdTime
    }
  } catch (error) {
    console.error('Error uploading file to Drive:', error)
    throw error
  }
}

/**
 * Parse a Google Drive folder link and extract folder ID
 * Supports:
 * - /drive/folders/{folderId}
 * - ?folderId={folderId}
 * - /open?id={folderId}
 *
 * @param {string} driveLink - Google Drive folder link
 * @returns {string|null} Folder ID or null if invalid
 */
export function parseDriveFolderLink(driveLink) {
  if (!driveLink || typeof driveLink !== 'string') return null

  try {
    const url = new URL(driveLink)

    // Check for /drive/folders/{id} pattern
    const folderMatch = driveLink.match(/\/drive\/folders\/([a-zA-Z0-9-_]+)/)
    if (folderMatch) return folderMatch[1]

    // Check for ?folderId={id} pattern
    const folderIdParam = url.searchParams.get('folderId')
    if (folderIdParam) return folderIdParam

    // Check for /open?id={id} pattern
    const idParam = url.searchParams.get('id')
    if (idParam) return idParam

    return null
  } catch (error) {
    // Try as simple folder ID string
    if (/^[a-zA-Z0-9-_]+$/.test(driveLink)) {
      return driveLink
    }
    return null
  }
}

/**
 * Link an existing Drive folder to a client
 * Validates folder accessibility and sets up category structure if needed
 *
 * @param {string} folderId - Google Drive folder ID
 * @param {string} clientId - Client ID
 * @param {string} companyName - Company name
 * @returns {Promise<Object>} Linked folder info
 */
export async function linkDriveFolderToClient(folderId, clientId, companyName) {
  try {
    const token = await getAccessToken()

    // Verify folder exists and is accessible
    const folderResponse = await fetch(
      `${DRIVE_API_BASE}/files/${folderId}?supportsAllDrives=true&fields=id,name,webViewLink`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    )

    if (!folderResponse.ok) {
      throw new Error(`Cannot access folder. Ensure it's shared with you and the link is correct.`)
    }

    const folderData = await folderResponse.json()

    // List existing subfolders to see if category structure exists
    const filesResponse = await fetch(
      `${DRIVE_API_BASE}/files?q=trashed=false and '${folderId}' in parents and mimeType='${FOLDER_MIME_TYPE}'&supportsAllDrives=true&fields=files(id,name)`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    )

    let categoryFolders = {}
    if (filesResponse.ok) {
      const files = await filesResponse.json()
      // Map existing folders to categories if they match names
      files.files?.forEach(folder => {
        Object.entries(BRAND_CATEGORIES).forEach(([key, category]) => {
          if (folder.name === category.name) {
            categoryFolders[key] = folder.id
          }
        })
      })
    }

    // Create missing category folders
    const missingCategories = Object.keys(BRAND_CATEGORIES).filter(key => !categoryFolders[key])
    for (const categoryKey of missingCategories) {
      const category = BRAND_CATEGORIES[categoryKey]
      const categoryResponse = await fetch(`${DRIVE_API_BASE}/files?supportsAllDrives=true`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: category.name,
          mimeType: FOLDER_MIME_TYPE,
          parents: [folderId],
          description: category.description
        })
      })

      if (categoryResponse.ok) {
        const categoryFolder = await categoryResponse.json()
        categoryFolders[categoryKey] = categoryFolder.id
      }
    }

    return {
      success: true,
      mainFolderId: folderId,
      folderName: folderData.name,
      categoryFolders,
      driveUrl: folderData.webViewLink
    }
  } catch (error) {
    console.error('Error linking Drive folder:', error)
    throw error
  }
}

/**
 * Get all files in a category folder
 *
 * @param {string} categoryFolderId - Drive folder ID for category
 * @returns {Promise<Array>} Array of file objects
 */
export async function listCategoryFiles(categoryFolderId) {
  try {
    const token = await getAccessToken()

    const response = await fetch(
      `${DRIVE_API_BASE}/files?q='${categoryFolderId}' in parents and trashed=false&supportsAllDrives=true&fields=files(id,name,webViewLink,webContentLink,fileSize,mimeType,createdTime,modifiedTime,owners(displayName))`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to list files: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      success: true,
      files: data.files || [],
      count: (data.files || []).length
    }
  } catch (error) {
    console.error('Error listing category files:', error)
    throw error
  }
}

/**
 * Delete a file from Google Drive
 *
 * @param {string} fileId - Google Drive file ID
 * @returns {Promise<Object>} Success confirmation
 */
export async function deleteFileFromDrive(fileId) {
  try {
    const token = await getAccessToken()

    const response = await fetch(
      `${DRIVE_API_BASE}/files/${fileId}?supportsAllDrives=true`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to delete file: ${response.statusText}`)
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting file from Drive:', error)
    throw error
  }
}

/**
 * Share a Drive folder with team members
 *
 * @param {string} folderId - Drive folder ID
 * @param {Array<string>} emails - Email addresses to share with
 * @param {string} role - Role: 'reader', 'commenter', or 'writer' (default: 'reader')
 * @returns {Promise<Object>} Share confirmation
 */
export async function shareFolderWithTeam(folderId, emails, role = 'reader') {
  try {
    const token = await getAccessToken()

    const sharePromises = emails.map(email =>
      fetch(`${DRIVE_API_BASE}/files/${folderId}/permissions?supportsAllDrives=true`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'user',
          role: role,
          emailAddress: email,
          sendNotificationEmail: true
        })
      })
    )

    const results = await Promise.all(sharePromises)
    const allSuccess = results.every(r => r.ok)

    if (!allSuccess) {
      throw new Error('Some shares failed. Check that emails are valid.')
    }

    return {
      success: true,
      sharedWith: emails,
      role: role
    }
  } catch (error) {
    console.error('Error sharing folder:', error)
    throw error
  }
}

/**
 * Get Google Drive authentication URL for OAuth flow
 * @returns {string} OAuth consent URL
 */
export function getGoogleAuthUrl() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const redirectUri = `${window.location.origin}/auth/google-callback`
  const scopes = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive'
  ]

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent'
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export default {
  setupClientDriveFolder,
  uploadFileToDrive,
  parseDriveFolderLink,
  linkDriveFolderToClient,
  listCategoryFiles,
  deleteFileFromDrive,
  shareFolderWithTeam,
  getGoogleAuthUrl,
  BRAND_CATEGORIES
}
