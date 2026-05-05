# Quick Reference - Alphalux Onboarding SAAS

## Start Development

```bash
cd Onboarding_SAAS
npx http-server -c-1 -p 8000
# Open http://localhost:8000
```

---

## Browser Console Commands

### Database Seeding

```javascript
// Load seed module
const module = await import('./js/seed-database.js');

// Seed database with 4 test clients + 6 invitations
await module.seedDatabase();

// Verify data was added
await module.verifySeedData();

// Clear all clients (use with caution!)
await module.clearCollection('clientes');

// Clear all invitations
await module.clearCollection('invitations');

// Full reset (destructive!)
await module.resetDatabase();
```

### Check Admin Panel Data

```javascript
// From admin.html console
console.log('Admin ready:', typeof allClientes !== 'undefined');
console.log('Total clients loaded:', allClientes?.length || 0);
console.log('First client:', allClientes?.[0]);

// View specific client
console.log(allClientes.find(c => c.email === 'test@company.com'));

// Check modal state
console.log('Modal visible:', document.getElementById('detailModal')?.classList.contains('active'));
```

### Test Modal Functions

```javascript
// From admin.html console after logging in and seeding data

// Open modal
showClientDetails('test_client_001');

// Check modal state
document.getElementById('detailModal').classList.contains('active'); // true

// Close modal
closeModal();

// Check modal is closed
document.getElementById('detailModal').classList.contains('active'); // false
```

### Check Firebase Connection

```javascript
// From any page console
import { auth, db } from './js/firebase-config.js';
console.log('Firebase Auth:', typeof auth);
console.log('Firebase Firestore:', typeof db);
console.log('Auth user:', auth?.currentUser);
```

### Monitor Firestore Calls

```javascript
// From any page console
const originalConsoleLog = console.log;
console.log = function(...args) {
    if (args[0]?.includes?.('Getting collection') || args[0]?.includes?.('Setting document')) {
        originalConsoleLog('📡 Firestore:', ...args);
    }
    originalConsoleLog(...args);
};
```

---

## Test Data

### After Seeding - Available Test Clients

| Email | Company | Progress | Status | Code |
|-------|---------|----------|--------|------|
| test@company.com | Test Company S.A. | 75% | en_proceso | TEST001XYZ |
| hello@innovate.com | InnovateTech | 30% | en_proceso | INNOV002DEF |
| info@globalcorp.de | GlobalCorp | 100% | completado | GLOBAL003GHI |
| contact@startupv.io | StartupVentures | 45% | en_proceso | STARTUP004JKL |

### Pending Invitation Codes

| Code | Email | Company |
|------|-------|---------|
| DEMO001ABC | newclient@example.com | Example Corp |
| ALPHA002XYZ | prospect@techco.com | TechCo Industries |

---

## Common Workflows

### Setup Admin

1. Go to `http://localhost:8000/admin-login.html`
2. Click "Registrarse"
3. Fill form (any valid email/password)
4. Click "Crear Cuenta"
5. Redirects to admin dashboard

### Seed Test Data

```javascript
// In any page console
const mod = await import('./js/seed-database.js');
await mod.seedDatabase();
location.reload(); // Refresh to see data
```

### Test Client Login

1. Go to `http://localhost:8000/client-login.html`
2. Enter:
   - Code: `DEMO001ABC`
   - Email: `newclient@example.com`
   - Company: `Example Corp`
3. Click "Acceder"
4. Redirected to client dashboard

### View Client in Admin

1. Log in as admin
2. See clients in table
3. Click "Ver" on any row
4. Modal opens with client details
5. Click × or outside to close

---

## Useful Code Snippets

### Check if Admin Logged In

```javascript
import { auth } from './js/firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const user = auth.currentUser;
console.log('Logged in:', user?.email);

// Check if admin
if (user) {
    const docSnap = await getDoc(doc(db, "users", user.uid));
    console.log('Is admin:', docSnap.data()?.role === 'admin');
}
```

### Export Client Data as JSON

```javascript
// From admin console
const clientsJSON = JSON.stringify(allClientes, null, 2);
console.log(clientsJSON);
// Copy and save to file
```

### Search Clients in Admin

```javascript
// From admin console
const search = 'test';
const results = allClientes.filter(c => 
    c.nombre_empresa?.toLowerCase().includes(search) ||
    c.email?.toLowerCase().includes(search)
);
console.log('Results:', results);
```

### Check Module Progress

```javascript
// From admin console
const clientId = 'test_client_001';
const client = allClientes.find(c => c.id === clientId);

const modules = [
    'info_basica',
    'meta_ads',
    'google_ads',
    'comunicacion',
    'materiales',
    'ia_config',
    'agendamiento'
];

modules.forEach(mod => {
    const completed = client[mod]?.completado || 
                     client[mod]?.slack_configurado ||
                     client[mod]?.archivos?.length > 0;
    console.log(`${mod}: ${completed ? '✓' : '✗'}`);
});
```

---

## Debug Logs to Watch

**Key success logs:**

```
✅ Login exitoso
✅ Admin registrado
✅ Cliente creado
✅ Cliente accediendo con código de invitación
ADMIN READY
```

**Important error logs:**

```
❌ Error: (any error in console)
💥 ERROR: (major issue)
❌ Usuario no encontrado
❌ Código inválido o usado
```

---

## File Locations

### Configuration
- Firebase: `js/firebase-config.js`
- Auth: `js/auth.js`
- Styles: `css/styles.css`

### Pages
- Landing: `index.html`
- Admin login: `admin-login.html`
- Admin panel: `admin.html` → `js/admin.js`
- Client login: `client-login.html` → `js/auth.js`
- Client dashboard: `dashboard.html` → `js/dashboard-client.js`

### Helpers
- Database seeding: `js/seed-database.js`
- Notifications: `js/notifications.js`

### Documentation
- Setup: `FIREBASE_SETUP.md`
- Development: `DEVELOPMENT_GUIDE.md`
- This file: `QUICK_REFERENCE.md`
- Sample data: `sample-data.json`

---

## Firestore Collections

```
firestore/
├── users/
│   └── {uid} → { email, empresa, role: 'admin' }
│
├── clientes/
│   ├── test_client_001 → { ...full client data }
│   ├── test_client_002 → { ...full client data }
│   └── ...
│
└── invitations/
    ├── {id} → { codigo, estado, email_cliente, ... }
    └── ...
```

---

## Performance Checks

### Check Page Load Time

```javascript
console.time('page-load');
// ... actions ...
console.timeEnd('page-load');
```

### Monitor Network Activity

Open DevTools → Network tab → Filter by XHR/Fetch

**Normal Firestore calls:**
- getDocs → GET
- setDoc → PATCH/POST
- updateDoc → PATCH
- deleteDoc → DELETE

---

## Keyboard Shortcuts

| Action | Keys |
|--------|------|
| Toggle DevTools | F12 or Ctrl+Shift+I |
| Console Tab | Ctrl+Shift+K |
| Network Tab | Ctrl+Shift+E |
| Search Page | Ctrl+F |
| Refresh | F5 or Ctrl+R |
| Full Refresh | Ctrl+Shift+R |

---

## Email Test Accounts

After seeding database, use these to test:

**Admin:**
- Email: Any unique email (e.g., admin@test.com)
- Password: Test123456

**Clients (pre-seeded):**
- test@company.com (code: TEST001XYZ)
- hello@innovate.com (code: INNOV002DEF)
- info@globalcorp.de (code: GLOBAL003GHI)
- contact@startupv.io (code: STARTUP004JKL)

**Pending Codes:**
- newclient@example.com (code: DEMO001ABC)
- prospect@techco.com (code: ALPHA002XYZ)

---

## Important Dates in Sample Data

- Test Company: Created 2026-04-13
- InnovateTech: Created 2026-04-20
- GlobalCorp: Created 2026-02-01, Meeting scheduled 2026-04-25
- StartupVentures: Created 2026-03-10, Meeting scheduled 2026-05-01

---

## Troubleshooting Quick Links

| Issue | Check |
|-------|-------|
| Modal won't open | Check console for errors, verify allClientes has data |
| No clients showing | Seed database, check Firestore has documents |
| Can't log in | Verify Firebase config, check auth is enabled |
| Data not saving | Check Firestore rules, verify write permissions |
| Progress not updating | Check module data structure matches schema |
| Images not loading | Check storage bucket URL, verify permissions |

---

## Next Steps for Development

- [ ] Implement proper Firebase security rules
- [ ] Add email verification for clients
- [ ] Add progress notifications to admin
- [ ] Implement client status webhooks
- [ ] Add client activity logs
- [ ] Create admin reports/analytics
- [ ] Implement multi-language support
- [ ] Add dark mode toggle
- [ ] Create mobile-responsive design
- [ ] Implement automated testing

---

**Last updated:** 2026-04-30  
**Version:** 1.0  
**Status:** Development Ready
