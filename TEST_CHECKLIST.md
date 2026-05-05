# Invitation Code System - Test Checklist

## Test 1: Admin Generates Invitation Code
- [ ] Open http://localhost:8000/index.html
- [ ] Click "Admin Nuevo" tab
- [ ] Register with: email=`admin@test.com`, password=`password123`, company=`Test Company`
- [ ] Redirect to admin.html should occur
- [ ] Navigate to "🔑 Códigos" section
- [ ] Click "+ Generar Código" button
- [ ] Enter client email: `client@test.com`
- [ ] Click "Generar"
- [ ] Copy the generated code (e.g., ABC123)
- [ ] Verify code appears in table with status "⏳ Pendiente"

## Test 2: Client Access via Invitation Code
- [ ] Log out from admin panel (click "Cerrar sesión")
- [ ] On index.html, click "Cliente" tab
- [ ] Enter:
  - Invitation Code: [paste copied code]
  - Email: `client@test.com`
- [ ] Click "Acceder" button
- [ ] Should redirect to dashboard.html
- [ ] Verify user email displays in top-right as "client@test.com"
- [ ] Verify welcome-step is active
- [ ] Verify progress shows 0%

## Test 3: Client Cannot Access Admin Page
- [ ] From dashboard.html, try navigating to http://localhost:8000/admin.html
- [ ] Should redirect back to dashboard.html (verify in browser console)

## Test 4: Admin Cannot Access Client Dashboard
- [ ] Open http://localhost:8000/index.html
- [ ] Log in as admin with `admin@test.com` / `password123`
- [ ] Try navigating to http://localhost:8000/dashboard.html
- [ ] Should redirect to admin.html

## Test 5: Client Dashboard - Module Navigation
- [ ] Log in as client (from Test 2)
- [ ] Verify all 8 step buttons are clickable
- [ ] Click through each step (modulo1 through modulo7)
- [ ] Verify "Paso X de 8" updates correctly
- [ ] Verify next/prev buttons show/hide appropriately (prev hidden on step 1, next becomes "✓ Completar" on step 8)

## Test 6: Client Dashboard - Data Persistence
- [ ] On modulo1-step, fill in:
  - Servicios: "Web Design, SEO"
  - Precios: "From $500"
  - Cliente Ideal: "Small Businesses"
  - Web: "https://example.com"
  - Identidad Marca: "Modern & Minimalist"
- [ ] Click "Siguiente →"
- [ ] Should move to modulo2 and update progress
- [ ] Go back to modulo1 (click "← Anterior")
- [ ] Verify data is still there (persisted in Firestore)

## Test 7: Client File Upload
- [ ] Navigate to modulo5-step (Materiales)
- [ ] Create a test file (e.g., test.txt with "test content")
- [ ] Click file upload and select the test file
- [ ] Verify file appears in uploaded files list
- [ ] Click on file link to verify download works
- [ ] Click delete button (🗑️) and confirm
- [ ] Verify file is removed from list

## Test 8: Admin Invitation Code Status
- [ ] Log in as admin: http://localhost:8000/index.html → Admin tab
- [ ] Navigate to "🔑 Códigos" section
- [ ] Verify the code used in Test 2 now shows:
  - Status: "✅ Usado"
  - Used By: "client@test.com"
- [ ] No delete button should appear for used codes

## Test 9: Client Logout
- [ ] From client dashboard, click logout button
- [ ] Should redirect to index.html
- [ ] Verify localStorage.clientId is cleared (check browser dev tools)
- [ ] Try navigating to dashboard.html directly
- [ ] Should redirect back to index.html

## Test 10: Invalid Invitation Code
- [ ] On index.html, click "Cliente" tab
- [ ] Enter:
  - Invitation Code: "INVALID"
  - Email: "anything@test.com"
- [ ] Click "Acceder"
- [ ] Should show error: "Código de invitación inválido"

## Test 11: Email Mismatch
- [ ] On index.html, click "Cliente" tab
- [ ] Enter valid code but WRONG email
- [ ] Should show error: "El email no coincide con el código"

## Test 12: Reused Code Prevention
- [ ] Try using the same invitation code twice with correct email
- [ ] Second attempt should show: "Este código ya ha sido utilizado"

## Test 13: Progress Tracking
- [ ] Log in as client
- [ ] Complete multiple modules (fill in required fields and click "Siguiente")
- [ ] Verify progress percentage increases:
  - Module 1 complete = ~14%
  - Module 2 complete = ~29%
  - Module 3 complete = ~43%
  - etc. up to 100% for all 7
- [ ] Log in as admin and view client details
- [ ] Verify progress percentage matches client's self-reported progress

## Test 14: Admin Client Detail View
- [ ] Log in as admin
- [ ] On Clientes tab, click "Ver" button for the test client
- [ ] Verify modal shows:
  - Client name/email
  - Progress bar and percentage
  - All module statuses
  - Estado Cliente: "en_proceso" (while not complete)
  - Agendamiento status
- [ ] Click "Marcar en Revisión" button
- [ ] Verify client's estado_admin changes to "🔄 En Revisión" in table
- [ ] Click "Ver" again
- [ ] Click "Marcar Finalizado"
- [ ] Verify client's estado_admin changes to "✅ Finalizado"

## Test 15: Statistics Dashboard
- [ ] Log in as admin
- [ ] Navigate to "📊 Estadísticas"
- [ ] Verify displays:
  - Total de Clientes: [count]
  - Completados: [count]
  - En Proceso: [count]
  - Promedio Progreso: [percentage]
  - Module percentages (should reflect test client's completion)

## Notes
- All tests should use http://localhost:8000 (not https)
- Check browser console for errors (F12 → Console tab)
- Firebase config uses demo key, so data persists in localStorage, not actual Firebase
- If using actual Firebase: ensure Firestore rules allow read/write for authenticated users
