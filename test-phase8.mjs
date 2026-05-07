/**
 * Phase 8 Testing Script: Entorno Google Module
 * Generates test tokens and test clients for each branch scenario
 */

import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  setDoc,
  doc,
  Timestamp,
  getDocs,
  query,
  where
} from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyCYGnhJwAPcshOQJfVG1zaDhXY3ndtPdTM',
  authDomain: 'alphalux-consulting.firebaseapp.com',
  projectId: 'alphalux-consulting',
  storageBucket: 'alphalux-consulting.firebasestorage.app',
  messagingSenderId: '864478354242',
  appId: '1:864478354242:web:e1db47e2686c2bdede86db'
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Helper to generate slug
function generateSlug(companyName) {
  const ACCENT_MAP = {
    á: 'a', à: 'a', ä: 'a', â: 'a', ã: 'a',
    é: 'e', è: 'e', ë: 'e', ê: 'e',
    í: 'i', ì: 'i', ï: 'i', î: 'i',
    ó: 'o', ò: 'o', ö: 'o', ô: 'o', õ: 'o',
    ú: 'u', ù: 'u', ü: 'u', û: 'u',
    ñ: 'n', ç: 'c'
  }
  return companyName
    .toLowerCase()
    .trim()
    .replace(/[áàäâãéèëêíìïîóòöôõúùüûñç]/g, ch => ACCENT_MAP[ch] || ch)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40)
}

// Create test client with specific Google module data
async function createTestClient(scenario) {
  const now = new Date()
  const clientId = uuidv4()
  const token = uuidv4()
  const shortId = token.replace(/-/g, '').slice(0, 5)
  const slug = `${generateSlug(scenario.company)}-test-${shortId}`

  // Base client data
  const baseClientData = {
    email: scenario.email,
    empresa: scenario.company,
    nombre_empresa: scenario.company,
    createdAt: Timestamp.fromDate(now),
    estado_cliente: 'en_proceso',
    estado_admin: 'en_revision',
    progreso: 60, // Assume they're partway through
    onboarding_data: {
      info_basica: {
        nombre_comercial: scenario.company,
        razon_social: `${scenario.company} S.A.C.`,
        sector: 'Tecnología',
        email: scenario.email,
        telefono: '+51 987 654 321',
        ciudad: 'Lima',
        pais: 'Perú'
      },
      google: scenario.googleData
    }
  }

  // Create token doc
  await setDoc(doc(db, 'onboarding_tokens', token), {
    token,
    slug,
    clientEmail: scenario.email,
    clientCompany: scenario.company,
    createdAt: Timestamp.fromDate(now),
    expiresAt: Timestamp.fromDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)),
    usedAt: null,
    status: 'active',
    viewCount: 0,
    lastAccessAt: null
  })

  // Create client doc
  await setDoc(doc(db, 'clientes', clientId), baseClientData)

  return {
    clientId,
    token,
    slug,
    scenario: scenario.name,
    email: scenario.email,
    company: scenario.company
  }
}

// Test scenarios for Phase 8
const testScenarios = [
  {
    name: 'Branch SI (Has Google Configured)',
    company: 'TechStart Solutions SI',
    email: 'test-si@techstart.test',
    googleData: {
      entorno_google_status: 'si',
      google_maps_link: 'https://maps.google.com/?q=techstart-si',
      entorno_google_help: false,
      entorno_google_confirmation: true
    }
  },
  {
    name: 'Branch NO (Needs Help)',
    company: 'TechStart Solutions NO',
    email: 'test-no@techstart.test',
    googleData: {
      entorno_google_status: 'no',
      google_maps_link: null,
      entorno_google_help: true,
      entorno_google_confirmation: true
    }
  },
  {
    name: 'Branch NO_SEGURO (Unsure)',
    company: 'TechStart Solutions NO_SEGURO',
    email: 'test-noseguro@techstart.test',
    googleData: {
      entorno_google_status: 'no_seguro',
      google_maps_link: null,
      entorno_google_help: null,
      entorno_google_confirmation: true
    }
  }
]

// Main execution
async function generateTestData() {
  try {
    console.log('🧪 Phase 8 Testing: Entorno Google Module')
    console.log('=' .repeat(80))
    console.log()

    const results = []

    for (const scenario of testScenarios) {
      console.log(`Creating test data for: ${scenario.name}`)
      const result = await createTestClient(scenario)
      results.push(result)
      console.log(`✓ Created successfully`)
      console.log(`  Token: ${result.token}`)
      console.log(`  Slug: ${result.slug}`)
      console.log(`  Email: ${result.email}`)
      console.log(`  Company: ${result.company}`)
      console.log()
    }

    console.log()
    console.log('=' .repeat(80))
    console.log('📋 TEST TOKENS FOR PHASE 8')
    console.log('=' .repeat(80))
    console.log()

    results.forEach((result, index) => {
      console.log(`Test Case ${index + 1}: ${result.scenario}`)
      console.log(`  Email: ${result.email}`)
      console.log(`  Company: ${result.company}`)
      console.log(`  Token: ${result.token}`)
      console.log(`  Slug: ${result.slug}`)
      console.log(`  Access URL: http://localhost:5173/validate/${result.token}`)
      console.log(`  OR: http://localhost:5173/validate?t=${result.token}`)
      console.log()
    })

    console.log('=' .repeat(80))
    console.log('✅ Test data created successfully!')
    console.log('=' .repeat(80))

    process.exit(0)
  } catch (error) {
    console.error('❌ Error creating test data:', error)
    process.exit(1)
  }
}

generateTestData()
