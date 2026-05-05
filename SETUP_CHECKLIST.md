# Setup Checklist - Alphalux Onboarding SAAS

Complete each section in order. Check off items as you complete them.

---

## Phase 1: Environment Setup

### Development Tools
- [ ] Node.js 16+ installed
- [ ] npm installed
- [ ] Code editor ready (VS Code, etc.)
- [ ] Modern browser installed (Chrome, Firefox, Safari)
- [ ] Git installed (optional but recommended)

### Project Download
- [ ] Project folder cloned/downloaded
- [ ] Located at: `C:\Users\Yeison Andres\Desktop\Trabajo de EUU\SAAS\Onboarding_SAAS\`
- [ ] All files present (check 5+ files in root directory)

### Dependencies
- [ ] npm modules installed (run: `npm install` if package.json exists)
- [ ] http-server installed globally: `npm install -g http-server`

---

## Phase 2: Firebase Setup

### Create Firebase Project
- [ ] Go to [Firebase Console](https://console.firebase.google.com/)
- [ ] Create new project (or use existing)
- [ ] Project name noted: ___________________
- [ ] Enable Firestore Database
- [ ] Enable Authentication (Email/Password)
- [ ] Enable Cloud Storage (for file uploads)

### Get Firebase Credentials
- [ ] Go to Project Settings → General
- [ ] Scroll to "Your apps" section
- [ ] Click "Add app" → Web
- [ ] Copy Firebase config
- [ ] Update `js/firebase-config.js` with your config:
  ```javascript
  const firebaseConfig = {
      apiKey: "YOUR_KEY",
      authDomain: "your-project.firebaseapp.com",
      projectId: "your-project",
      storageBucket: "your-project.firebasestorage.app",
      messagingSenderId: "YOUR_ID",
      appId: "YOUR_APP_ID"
  };
  ```

### Create Collections
- [ ] Go to Firestore Database
- [ ] Create collection named: `users`
- [ ] Create collection named: `clientes`
- [ ] Create collection named: `invitations`

---

## Phase 3: Server Startup

### Start Development Server
- [ ] Open terminal in project root
- [ ] Run: `npx http-server -c-1 -p 8000`
- [ ] Server started successfully ✓

### Test Server Access
- [ ] Open browser to `http://localhost:8000`
- [ ] Page loads without errors ✓
- [ ] See Alphalux landing page

---

## Phase 4: Create Admin User

### Register First Admin

#### Option A: Manual Registration (via UI)
- [ ] Navigate to `http://localhost:8000/admin-login.html`
- [ ] Click "Registrarse" (Register tab)
- [ ] Fill registration form:
  - Company: `Alphalux Consulting`
  - Email: `admin@alphalux.com`
  - Password: `Test123456`
  - Confirm: `Test123456`
- [ ] Click "Crear Cuenta" button
- [ ] See success message
- [ ] Redirected to admin dashboard

#### Option B: Manual Firestore Entry
- [ ] Firebase Console → Authentication
- [ ] Click "Add user"
- [ ] Email: `admin@alphalux.com`
- [ ] Password: `Test123456`
- [ ] Go to Firestore → `users` collection
- [ ] Create document with ID = Firebase user's UID
- [ ] Add document data:
  ```json
  {
    "email": "admin@alphalux.com",
    "empresa": "Alphalux Consulting",
    "role": "admin",
    "createdAt": 2026-04-30
  }
  ```

### Verify Admin Created
- [ ] Check Firebase Auth shows user
- [ ] Check Firestore users collection has document
- [ ] Try logging in at `admin-login.html`

---

## Phase 5: Seed Test Data

### Method 1: Browser Console (Recommended)

1. [ ] Log in as admin (from Phase 4)
2. [ ] You should be on admin dashboard (`http://localhost:8000/admin.html`)
3. [ ] Open browser DevTools (F12)
4. [ ] Go to Console tab
5. [ ] Paste and run:
   ```javascript
   const mod = await import('./js/seed-database.js');
   await mod.seedDatabase();
   ```
6. [ ] Wait for "✅ Database seeding completed successfully!"
7. [ ] Run verification:
   ```javascript
   await mod.verifySeedData();
   ```
8. [ ] Should show: `✓ Clientes count: 4` and `✓ Invitations count: 6`

### Method 2: Manual Import

1. [ ] Download `sample-data.json` from project
2. [ ] Firebase Console → Firestore
3. [ ] Go to `clientes` collection
4. [ ] Click "Import collection"
5. [ ] Select `sample-data.json`
6. [ ] Confirm import
7. [ ] Repeat for `invitations` collection with same file

### Verify Data Seeded
- [ ] Refresh admin dashboard (F5)
- [ ] See "4 clientes" in statistics
- [ ] See table with 4 client rows
- [ ] See companies: Test Company S.A., InnovateTech, GlobalCorp, StartupVentures

---

## Phase 6: Admin Panel Testing

### Test Admin Dashboard
- [ ] [ ] Logged in (email shown in top-right)
- [ ] [ ] Client table shows 4 rows
- [ ] [ ] Statistics show: 4 total, 2 completed/in process mix
- [ ] [ ] Progress bars visible

### Test View Modal
- [ ] [ ] Click "Ver" button on first client
- [ ] [ ] Modal opens with client details
- [ ] [ ] See company name "Test Company S.A."
- [ ] [ ] See all 7 modules displayed
- [ ] [ ] See progress at 75%

### Test Modal Close
- [ ] [ ] Click × button (top right of modal)
- [ ] [ ] Modal closes
- [ ] [ ] Click "Ver" again
- [ ] [ ] Modal opens again
- [ ] [ ] Click outside modal (on dark overlay)
- [ ] [ ] Modal closes

### Test Filters
- [ ] [ ] Click "En Proceso" filter
- [ ] [ ] Table updates to show only in-progress clients
- [ ] [ ] Click "Completados" filter
- [ ] [ ] See "GlobalCorp International" (100% complete)
- [ ] [ ] Click "Todos" to show all

### Test Search
- [ ] [ ] Click search input
- [ ] [ ] Type "test"
- [ ] [ ] Table filters to show only "Test Company S.A."
- [ ] [ ] Clear search
- [ ] [ ] All clients show again

### Test Logout
- [ ] [ ] Click logout button (top right)
- [ ] [ ] Redirected to login page
- [ ] [ ] Login again to confirm session works

---

## Phase 7: Client Access Testing

### Test Client Login Flow

#### Test with Pending Code
1. [ ] Navigate to `http://localhost:8000/client-login.html`
2. [ ] Enter:
   - Code: `DEMO001ABC`
   - Email: `newclient@example.com`
   - Company: `Example Corp`
3. [ ] Click "Acceder"
4. [ ] Redirected to client dashboard

#### Verify Client Dashboard
- [ ] [ ] See onboarding wizard (8 steps)
- [ ] [ ] Step 0 shown (Welcome)
- [ ] [ ] Progress bar at 0%
- [ ] [ ] "Siguiente →" button visible

#### Complete Module 1
- [ ] [ ] Click "Siguiente →"
- [ ] [ ] Step 1 loads (Información Básica)
- [ ] [ ] Form fields visible
- [ ] [ ] Fill company name: "Test Company"
- [ ] [ ] Fill services: "Consulting services"
- [ ] [ ] Click "Guardar y Continuar"
- [ ] [ ] Data saves (check Firestore)
- [ ] [ ] Progresses to Module 2

#### Complete Module 2 (Meta Ads)
- [ ] [ ] See video and setup instructions
- [ ] [ ] Click "✓ Ya lo hice"
- [ ] [ ] Saves completion state
- [ ] [ ] Continues to Module 3

#### Test Other Modules
- [ ] [ ] Module 3 (Google Ads) - Click done
- [ ] [ ] Module 4 (Slack) - Check "configurado" checkbox
- [ ] [ ] Module 5 (Files) - Upload a file (browser handles upload)
- [ ] [ ] Module 6 (IA) - Fill some fields
- [ ] [ ] Module 7 (Meeting) - Click through calendar

#### Verify Progress Updated
- [ ] [ ] Progress bar increases with each completed module
- [ ] [ ] Can navigate back with "← Anterior"
- [ ] [ ] Data persists when refreshing page

### Test Logout from Client
- [ ] [ ] Check if logout button visible
- [ ] [ ] Or manually navigate to `client-login.html`

---

## Phase 8: Complete Application Flow

### Full Admin-to-Client Journey
1. [ ] Generate new invitation code in admin
2. [ ] Copy invitation code
3. [ ] Logout from admin
4. [ ] Go to client login
5. [ ] Use new code with test email
6. [ ] Complete a few onboarding modules
7. [ ] Go back to admin login
8. [ ] See new client in table
9. [ ] View client details

### Verify Data Persistence
- [ ] [ ] Close browser completely
- [ ] [ ] Reopen `http://localhost:8000`
- [ ] [ ] Log in as admin
- [ ] [ ] All clients still present
- [ ] [ ] Client progress saved
- [ ] [ ] Client module completion saved

---

## Phase 9: Final Verification

### Quality Assurance Checks

#### Functionality
- [ ] Admin can log in/out
- [ ] Admin can view clients
- [ ] Admin can generate codes
- [ ] Admin can view client details
- [ ] Client can access via code
- [ ] Client can save progress
- [ ] Progress calculation works
- [ ] All form inputs save correctly

#### UI/UX
- [ ] No console errors (F12 Console tab)
- [ ] No broken images
- [ ] All buttons clickable
- [ ] Modal opens/closes smoothly
- [ ] Responsive on different window sizes
- [ ] Loading states work
- [ ] Error messages display

#### Data
- [ ] Firestore has 4+ clients
- [ ] Firestore has 6+ invitations
- [ ] Client data structure is complete
- [ ] Module data saves correctly
- [ ] Timestamps save in Firestore

### Browser Console Check
- [ ] [ ] Open DevTools (F12)
- [ ] [ ] Go to Console tab
- [ ] [ ] No red errors
- [ ] [ ] See success logs from admin.js: "ADMIN READY"
- [ ] [ ] No warnings about Firebase

### Performance Check
- [ ] [ ] Page loads in < 3 seconds
- [ ] [ ] Modals open instantly
- [ ] [ ] Form submission responsive
- [ ] [ ] No lag when typing

---

## Phase 10: Documentation

### Review Documentation
- [ ] [ ] `FIREBASE_SETUP.md` read
- [ ] [ ] `DEVELOPMENT_GUIDE.md` read
- [ ] [ ] `QUICK_REFERENCE.md` bookmarked
- [ ] [ ] Sample data structure understood
- [ ] [ ] Database schema verified

### Create Your Own Notes
- [ ] [ ] Document any custom changes
- [ ] [ ] Note Firebase project details:
  - Project ID: ___________________
  - Database region: ___________________
  - Auth domain: ___________________

---

## Phase 11: Deployment Preparation

### Before Going Live

#### Security
- [ ] [ ] Firebase security rules implemented
- [ ] [ ] API keys restricted (not exposed)
- [ ] [ ] Authentication working properly
- [ ] [ ] Input validation added
- [ ] [ ] CORS configured

#### Performance
- [ ] [ ] Test with 100+ clients in database
- [ ] [ ] Monitor Firestore read/write counts
- [ ] [ ] Optimize queries if needed
- [ ] [ ] Enable Firestore caching

#### Backup
- [ ] [ ] Firebase automated backups enabled
- [ ] [ ] Export test data backup
- [ ] [ ] Document recovery procedures

#### Monitoring
- [ ] [ ] Firebase monitoring enabled
- [ ] [ ] Error tracking configured
- [ ] [ ] Analytics enabled
- [ ] [ ] Daily backup schedule set

---

## Phase 12: Go Live Checklist

### Final Checks Before Launch
- [ ] [ ] All tests pass
- [ ] [ ] No console errors
- [ ] [ ] Firebase security rules in place
- [ ] [ ] SSL/HTTPS enabled
- [ ] [ ] Domain configured
- [ ] [ ] Email service configured
- [ ] [ ] Admin super-user created
- [ ] [ ] Test client created for demo
- [ ] [ ] Documentation complete
- [ ] [ ] Support contact available

### Deployment
- [ ] [ ] Deploy to Firebase Hosting (or your server)
- [ ] [ ] Verify all pages accessible
- [ ] [ ] Test all workflows again on live site
- [ ] [ ] Monitor for 24 hours
- [ ] [ ] Ready for client onboarding

---

## Troubleshooting During Setup

### Issue: Firebase credentials not working
- [ ] Verify config in `js/firebase-config.js`
- [ ] Check Firebase project is initialized
- [ ] Ensure Firestore database created
- [ ] Check browser console for specific error

### Issue: Collections not appearing in Firestore
- [ ] Create collections manually if not auto-created
- [ ] Verify you're in correct Firebase project
- [ ] Check Firestore is enabled in project

### Issue: Can't log in as admin
- [ ] Verify user exists in Firebase Auth
- [ ] Verify matching document in `users` collection
- [ ] Check password is correct
- [ ] Clear browser cache/cookies

### Issue: Seed data not appearing
- [ ] Check console for errors during seed
- [ ] Verify Firestore collections exist
- [ ] Run verifySeedData() in console
- [ ] Check Firestore rules allow writes

### Issue: Modal won't open
- [ ] Refresh page
- [ ] Check browser console for errors
- [ ] Verify clients loaded in admin
- [ ] Check sample data was seeded

---

## Success Criteria

✅ **You've successfully completed setup when:**

1. Admin dashboard shows 4+ clients
2. Client detail modal opens and closes properly
3. Client can log in with invitation code
4. Client can complete onboarding steps
5. Progress saves to Firestore
6. No console errors
7. All pages load without issues
8. Modal close button works (✓ from previous fix)

---

## Support Resources

| Issue | Resource |
|-------|----------|
| Firebase setup | `FIREBASE_SETUP.md` |
| Development help | `DEVELOPMENT_GUIDE.md` |
| Quick commands | `QUICK_REFERENCE.md` |
| Sample data structure | `sample-data.json` |
| Database seeding | `js/seed-database.js` |

---

## Keep These Handy

- **Admin login:** `admin@alphalux.com` / `Test123456`
- **Test client code:** `DEMO001ABC`
- **Test client email:** `newclient@example.com`
- **Dev server:** `http://localhost:8000`
- **Firebase Console:** `https://console.firebase.google.com/`

---

**Setup Date:** ___________  
**Completed By:** ___________  
**Notes:** ___________________________________________________________

✨ **Ready to go live!**
