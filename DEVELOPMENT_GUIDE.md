# Alphalux Onboarding SAAS - Development Guide

## Quick Start

### Prerequisites
- Node.js 16+ (for dev server)
- Modern browser with ES6 module support
- Firebase project with Firestore enabled
- Web server (http-server or similar)

### Installation

1. **Clone/Download the project**
   ```bash
   cd Onboarding_SAAS
   ```

2. **Install dependencies** (optional, for dev server)
   ```bash
   npm install -g http-server
   ```

3. **Start development server**
   ```bash
   npx http-server -c-1 -p 8000
   ```

4. **Access the application**
   - Open `http://localhost:8000` in your browser

---

## Application Structure

### Pages

| Page | URL | Purpose | Access |
|------|-----|---------|--------|
| Welcome | `/index.html` | Landing/intro page | Public |
| Admin Login | `/admin-login.html` | Admin authentication | Public |
| Admin Dashboard | `/admin.html` | Client management panel | Admin only |
| Client Login | `/client-login.html` | Client access with invitation | Public |
| Client Dashboard | `/dashboard.html` | Onboarding wizard | Client only |

### Key Files

```
Onboarding_SAAS/
├── index.html                 # Landing page
├── admin-login.html          # Admin login/register
├── admin.html                # Admin dashboard (client management)
├── client-login.html         # Client access form
├── dashboard.html            # Client onboarding wizard
│
├── css/
│   └── styles.css           # All styling
│
├── js/
│   ├── firebase-config.js   # Firebase initialization
│   ├── auth.js              # Authentication logic
│   ├── admin.js             # Admin panel logic
│   ├── dashboard-client.js  # Client dashboard logic
│   ├── seed-database.js     # Database seeding helper
│   └── notifications.js     # Toast notifications
│
├── sample-data.json         # Sample test data (for import)
├── FIREBASE_SETUP.md        # Firebase configuration guide
└── DEVELOPMENT_GUIDE.md     # This file
```

---

## Firebase Configuration

### Required Collections

The application requires these Firestore collections:

1. **users** - Admin user data
2. **clientes** - Client onboarding records
3. **invitations** - Invitation codes for clients

See `FIREBASE_SETUP.md` for detailed structure.

### Firebase Credentials

Your Firebase config is in `js/firebase-config.js`:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project",
    storageBucket: "your-project.firebasestorage.app",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

---

## Database Seeding

### Method 1: Using the Seeding Script (Recommended)

1. **In Browser Console** (easiest for testing):
   ```javascript
   // Import the seed module dynamically
   const { seedDatabase } = await import('./js/seed-database.js');
   
   // Seed the database
   await seedDatabase();
   
   // Verify the data was added
   await verifySeedData();
   ```

2. **In Admin Panel**:
   - Log in as admin
   - Open browser DevTools → Console
   - Run the commands above
   - Refresh the admin panel to see the seeded data

### Method 2: Manual Import

1. Go to Firebase Console → Firestore
2. Click "Start collection" → Create `clientes` collection
3. Import data from `sample-data.json`

### Method 3: Using Firebase Admin SDK (Node.js)

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Import the sample data
const { clientes, invitations } = require('./sample-data.json');

async function seed() {
    const batch = db.batch();
    
    clientes.forEach(doc => {
        batch.set(db.collection('clientes').doc(doc.id), doc);
    });
    
    invitations.forEach(doc => {
        batch.set(db.collection('invitations').doc(), doc);
    });
    
    await batch.commit();
    console.log('Database seeded!');
}

seed();
```

---

## Workflow: Admin Setup

### Step 1: Register as Admin

1. Go to `http://localhost:8000/admin-login.html`
2. Click "Registrarse" (Register)
3. Fill in:
   - Company name: "My Company"
   - Email: "admin@mycompany.com"
   - Password: "Test123456"
   - Confirm: "Test123456"
4. Click "Crear Cuenta"

### Step 2: Access Admin Dashboard

1. You'll automatically redirect to `/admin.html`
2. You see the admin panel with:
   - Client table (empty initially)
   - Statistics dashboard
   - Invitation code generator

### Step 3: Generate Invitation Codes

1. Click "Generar Código" (Generate Code)
2. Fill in client details:
   - Email: "client@company.com"
   - Company: "Client Company"
3. Click "Generar"
4. Copy the generated code (e.g., `ABC123XYZ`)

### Step 4: Seed Test Data (Alternative)

Instead of manually creating clients, seed the database with 4 test clients:

```javascript
// In browser console on any page
const { seedDatabase } = await import('./js/seed-database.js');
await seedDatabase();
```

Then refresh the admin dashboard to see 4 test clients.

---

## Workflow: Client Access

### Step 1: Get Invitation Code

Either:
- Ask admin to generate a code, OR
- Seed the database (includes 2 pending codes)

Available pending codes after seeding:
- `DEMO001ABC` (for newclient@example.com)
- `ALPHA002XYZ` (for prospect@techco.com)

### Step 2: Access Dashboard

1. Go to `http://localhost:8000/client-login.html`
2. Enter:
   - Invitation Code: `DEMO001ABC` (or another valid code)
   - Email: `newclient@example.com` (must match code)
   - Company Name: `Example Corp` (optional)
3. Click "Acceder"

### Step 3: Complete Onboarding

1. You'll be redirected to `/dashboard.html`
2. Complete modules one by one:
   - Module 1: Basic Information
   - Module 2: Meta Ads Setup
   - Module 3: Google Ads Setup
   - Module 4: Slack Connection
   - Module 5: Upload Materials
   - Module 6: IA Configuration
   - Module 7: Schedule Meeting

Progress is saved automatically to Firestore.

---

## Features by Module

### Module 1: Información Básica (Basic Info)
- Company name, services, pricing, target client
- Brand identity details
- Website URL
- Auto-saves to `info_basica` field

### Module 2: Meta Ads Setup
- Video tutorial
- Simple completion checkbox
- Button: "Already Done" or "Need Help"

### Module 3: Google Ads Setup
- Video tutorial
- Completion checkbox
- Same "Done"/"Help" buttons

### Module 4: Slack Integration
- Setup instructions
- Confirmation checkbox
- Link to Slack app store

### Module 5: Material Upload
- Drag-and-drop file upload
- Supports: PDF, Word, Excel, PowerPoint, images, videos
- Stores metadata (not files themselves)

### Module 6: IA Configuration
- AI assistant name, contact info, schedule
- Main services description
- FAQ content
- Communication tone selection

### Module 7: Agendamiento (Meeting Scheduling)
- Embedded calendar booking widget
- Displays scheduled meeting details
- Integrates with external calendar service

---

## Admin Panel Features

### Client Table
- Lists all clients with:
  - Company name
  - Email
  - Progress bar (%)
  - Client status (not_started/in_progress/completed)
  - Admin status (pending/in_review/finalized)
  - Creation date
  - View button

### View Client Details
Click "Ver" button to open modal with:
- Client summary (name, email, progress, status)
- All 7 module completion statuses
- Action buttons:
  - Mark as reviewed / pending
  - Finalize client
  - Delete client

### Filter & Search
- Filter by status (all, pending, in_review, finalized)
- Search by company name or email

### Statistics Dashboard
- Total clients
- Completed clients
- In-progress clients
- Average progress %
- Module completion percentages

### Invitation Management
- View pending and used codes
- Copy invitation codes
- Delete codes
- Track which client used each code

---

## Testing the Modal

The admin panel has a detail modal that shows client information.

**Modal Features:**
- Opens when clicking "Ver" button on a client
- Shows comprehensive client data in 2-column layout
- Has action buttons (status, finalize, delete)
- Close button (×) in top-right
- Can close by clicking overlay

**Previous Fix:** The close button was non-functional in earlier versions. This is now fully fixed.

**Testing:**
```javascript
// In admin console after logging in
// If database is seeded with sample data:

// Check if allClientes has data
console.log('Total clients:', allClientes.length);

// Open a client detail modal
showClientDetails('test_client_001');

// Test close button
closeModal();

// Test reopening
showClientDetails('test_client_001');
```

---

## Debugging

### Enable Console Logging

All modules log important events to console:

```javascript
// auth.js logs:
console.log("🔥 auth.js cargado");
console.log("👨‍💼 Login admin");
console.log("✅ Login exitoso");

// admin.js logs:
console.log('ADMIN READY');
console.log('Cliente con código de invitación válido');

// dashboard-client.js logs:
console.log('✅ Cliente accediendo con código de invitación');
```

### Common Issues

#### "allClientes is empty"
**Cause:** No data in Firestore `clientes` collection

**Solution:** 
1. Seed database with sample data
2. Or create clients via client login with invitation codes

#### "Modal won't open"
**Cause:** Client data structure is malformed

**Solution:**
1. Check browser console for errors
2. Verify client document has all required fields
3. Use sample data structure from `sample-data.json`

#### "Progress bar not updating"
**Cause:** Module data not saved correctly

**Solution:**
1. Check Firestore document for field structure
2. Verify module data matches expected schema
3. Check browser console for save errors

#### "Can't log in"
**Cause:** Firebase auth/database issues

**Solution:**
1. Check Firebase console credentials
2. Verify Firestore is enabled
3. Check browser console for specific error
4. Verify Firebase rules allow read/write

---

## Performance Tips

1. **Lazy load data:** Only load clients when needed
2. **Use pagination:** Limit results per page
3. **Index Firestore:** Create composite indexes for complex queries
4. **Cache locally:** Store frequently accessed data in localStorage
5. **Monitor usage:** Check Firebase usage in console

---

## Security Notes

⚠️ **For Production:**

1. Never expose Firebase API keys in client code
2. Implement proper Firebase security rules
3. Use Firebase Authentication best practices
4. Enable CORS restrictions
5. Rate limit API calls
6. Use HTTPS only
7. Validate all user input
8. Don't store sensitive data in Firestore

See `FIREBASE_SETUP.md` for recommended security rules.

---

## API Reference

### auth.js Functions

```javascript
// Auto-handled, no direct calls needed
// Triggered by form submissions
```

### admin.js Functions

```javascript
// Load clients from Firestore
loadAllClientes()

// Open client detail modal
showClientDetails(clientId)

// Close detail modal
closeModal()

// Generate invitation code
generateInvitationCode()

// Close code generator modal
closeGenerateCodeModal()

// Update client status (called by button handlers)
// Update client as finalized
// Delete client
```

### dashboard-client.js Functions

```javascript
// Fetch client data from Firestore
loadClientData()

// Update all form fields with saved data
updateUI()

// Save module data to Firestore
// Called automatically on form submit
```

### seed-database.js Functions

```javascript
// Import these in browser console:
const { seedDatabase, clearCollection, resetDatabase, verifySeedData } = 
    await import('./js/seed-database.js');

// Populate with sample data
await seedDatabase()

// Remove all data from a collection
await clearCollection('clientes')

// Clear and reseed (destructive!)
await resetDatabase()

// Check current data counts
await verifySeedData()
```

---

## Useful Firebase Console Queries

### Count total clients
```
db.collectionGroup('clientes').count().get()
```

### Find clients by status
```
db.collection('clientes')
  .where('estado_cliente', '==', 'completado')
  .get()
```

### Get client by email
```
db.collection('clientes')
  .where('email', '==', 'test@company.com')
  .get()
```

---

## Contributing

When making changes:

1. Test in dev server locally
2. Seed database with sample data first
3. Test all user flows (admin and client)
4. Check browser console for errors
5. Update documentation if behavior changes
6. Commit changes with clear messages

---

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Web SDK](https://firebase.google.com/docs/firestore/quickstart)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

---

## Support

For issues or questions:

1. Check the browser console for error messages
2. Review `FIREBASE_SETUP.md` for data structure
3. Verify Firebase credentials in `js/firebase-config.js`
4. Check that collections exist in Firestore
5. Review the specific module's JavaScript file for implementation details
