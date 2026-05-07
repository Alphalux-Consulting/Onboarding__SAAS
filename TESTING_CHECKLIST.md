# Testing Mode - QA Checklist

## Pre-Testing Setup

- [ ] Development server running (`npm run dev`)
- [ ] `.env.local` has `VITE_TESTING_MODE=true`
- [ ] Browser console open (F12)
- [ ] No cache/old data (do hard refresh: Ctrl+Shift+R)

## 1. Testing Mode Detection

### Console Output
- [ ] Console shows `🧪 TESTING MODE ENABLED` message
- [ ] Console shows all features available:
  - [ ] bypassValidation: true
  - [ ] autoFill: true
  - [ ] skipSteps: true

### Visual Indicator
- [ ] Navigate to any form step
- [ ] Blue badge visible: "🧪 TESTING MODE ENABLED - Validación desactivada"
- [ ] Badge has pulsing blue glow animation

## 2. Validation Bypass Testing

### Leave Fields Empty
- [ ] Go to Step 1: Información Básica
- [ ] Leave all fields empty
- [ ] Click "Siguiente →"
- [ ] ✅ Should advance WITHOUT error message

### Compare with Disabled Mode
- [ ] Set `VITE_TESTING_MODE=false` in `.env.local`
- [ ] Restart dev server
- [ ] Go to Step 1 again
- [ ] Leave fields empty
- [ ] Click "Siguiente →"
- [ ] ✅ Should show error: "⚠️ Por favor completa los siguientes campos obligatorios: ..."
- [ ] Re-enable `VITE_TESTING_MODE=true` for remaining tests

## 3. Auto-Fill Button

### Button Visibility
- [ ] Navigate to Step 1 (any form step)
- [ ] Look for "🧪 Llenar datos" button between Anterior and Siguiente
- [ ] ✅ Button should be visible and blue
- [ ] Button has hover effect (brighter blue, shadow)
- [ ] Button has click effect (slight press animation)

### Auto-Fill Functionality
- [ ] Click "🧪 Llenar datos" button
- [ ] ⏱️ Wait 1-2 seconds for Firebase save
- [ ] Verify all visible fields are populated:
  - [ ] Nombre Comercial: "TechStart Solutions"
  - [ ] Razón Social: "TechStart Solutions S.A.C."
  - [ ] Sector: "Tecnología"
  - [ ] Email: "contact@techstart.test"
  - [ ] Teléfono: "+51 987 654 321"
  - [ ] Ciudad: "Lima"
  - [ ] País: "Perú"
  - [ ] Descripción: "Empresa especializada en soluciones tecnológicas..."

### Data Persistence
- [ ] Refresh page (F5)
- [ ] Navigate back to Step 1
- [ ] ✅ All data should still be present (loaded from Firebase)

## 4. Step Navigation (Skip Steps)

### Sidebar Clicking
- [ ] Go to Step 1
- [ ] Click on Step 5 (Marca) in sidebar
- [ ] ⏱️ Should jump directly to Step 5 (no error)
- [ ] Should not require completing previous steps
- [ ] Try clicking Steps 7, 9, 11 in any order
- [ ] ✅ Should work for any step

### Step Indicator States
- [ ] Visited steps show number in circle
- [ ] Current step has different styling (active)
- [ ] Future steps are clickable in testing mode
- [ ] Tab index should allow keyboard navigation

## 5. All Modules Auto-Fill

### Test Each Module
- [ ] Step 1: Información Básica - auto-fill works
- [ ] Step 2: Servicio Principal - auto-fill works
- [ ] Step 3: Cliente Ideal - auto-fill works
- [ ] Step 4: Marca - auto-fill works
- [ ] Step 5: Meta Ads - auto-fill works
- [ ] Step 6: Google - auto-fill works
- [ ] Step 7: Slack - auto-fill works
- [ ] Step 8: IA - auto-fill works
- [ ] Step 9: Inspiración - auto-fill works
- [ ] Step 10: Agendamiento - auto-fill works

### Verify Data Consistency
- [ ] All modules have complete test data
- [ ] No empty required fields after auto-fill
- [ ] Data types are correct (emails, dates, numbers, etc.)
- [ ] Special characters are preserved (#, -, +, /, etc.)

## 6. Button States

### Button Disabled During Save
- [ ] Click "🧪 Llenar datos" button
- [ ] Button should become disabled (grayed out) while saving
- [ ] Button text should remain visible
- [ ] Button should re-enable after save completes
- [ ] No double-submit possible

### Next Button States
- [ ] With validation bypass: "Siguiente →" works without data
- [ ] When saving: button shows "Guardando..."
- [ ] Button is disabled while saving
- [ ] On last step: button shows "Completar"

## 7. Error Handling

### Firebase Connection Error
- [ ] Disconnect internet/wifi
- [ ] Click "🧪 Llenar datos"
- [ ] ✅ Should show error: "Error al cargar datos de prueba..."
- [ ] Reconnect internet and try again
- [ ] Should work normally

### Form Validation (With Testing Disabled)
- [ ] Set `VITE_TESTING_MODE=false`
- [ ] Go to Step 1
- [ ] Click "Siguiente →" without filling fields
- [ ] ✅ Should show error message with missing fields list
- [ ] Fill in one field, try again
- [ ] ✅ Error message should update to show remaining required fields

## 8. Responsive Design

### Mobile (375px width)
- [ ] Testing mode badge visible and readable
- [ ] Auto-fill button fits on mobile layout
- [ ] Button text: "🧪 Llenar datos" (no truncation)
- [ ] Navigation buttons stack properly
- [ ] Sidebar still accessible on mobile

### Tablet (768px width)
- [ ] All elements visible without overflow
- [ ] Button spacing is appropriate
- [ ] Testing badge is readable
- [ ] Layout is balanced

### Desktop (1280px+ width)
- [ ] Buttons in row properly aligned
- [ ] Proper spacing between buttons
- [ ] Badge takes full width of form area
- [ ] No layout shifts or jumps

## 9. Keyboard Navigation

### Tab Navigation
- [ ] Tab through buttons in order:
  - [ ] "← Anterior"
  - [ ] "🧪 Llenar datos"
  - [ ] "Siguiente →"
- [ ] Sidebar steps are keyboard accessible
- [ ] Enter/Space can activate buttons

### Accessibility
- [ ] Testing button has proper title attribute
- [ ] Tab order is logical and visible
- [ ] Focus indicator is clear
- [ ] Color contrast is sufficient

## 10. Progress Tracking

### Progress Update After Auto-Fill
- [ ] Before auto-fill: Progress shows 0% (or partial)
- [ ] After auto-fill: Progress updates to ~90% (all modules filled)
- [ ] Progress bar animates smoothly
- [ ] Sidebar footer shows updated percentage

### Complete Onboarding with Testing
- [ ] Use auto-fill on all steps
- [ ] Navigate through all 10 steps
- [ ] Reach final confirmation step
- [ ] Progress should show 100%
- [ ] "Completar" button changes to show final action

## 11. Browser Console Check

### No Errors
- [ ] Open DevTools Console (F12)
- [ ] Filter to "Errors" only
- [ ] ✅ No red error messages
- [ ] Warning about chunk size is OK (performance info only)

### Testing Status Logging
- [ ] Console shows testing mode status message
- [ ] No errors about missing imports
- [ ] Firebase initialization successful
- [ ] No 404s for test data imports

## 12. Production Build Verification

### Build Command
```bash
npm run build
```

### Verify Testing Code Excluded
- [ ] Build completes successfully
- [ ] No warnings about testing mode
- [ ] Bundle size is reasonable (~760KB JavaScript)

### Test Production Build
- [ ] Serve `dist/` folder
- [ ] Navigate to onboarding
- [ ] Testing badge should NOT appear
- [ ] "🧪 Llenar datos" button should NOT exist
- [ ] Validation should work normally
- [ ] Cannot skip steps in sidebar

## 13. Regression Testing

### Existing Features Still Work
- [ ] Form submission works normally
- [ ] Firebase saves data correctly
- [ ] Progress calculation accurate
- [ ] File uploads still functional
- [ ] Previous form data loads correctly
- [ ] Navigation between steps works
- [ ] Error messages display properly
- [ ] Loading states work

### Edge Cases
- [ ] Refresh page during auto-fill
- [ ] Close tab and reopen onboarding
- [ ] Navigate directly to step via URL
- [ ] Multiple windows/tabs open simultaneously
- [ ] Network interruption during save

## 14. Quick End-to-End Test

**Total time: ~1 minute**

1. [ ] Start dev server: `npm run dev`
2. [ ] Go to onboarding page
3. [ ] See testing badge ✓
4. [ ] Click "Comenzar Ahora"
5. [ ] Click "🧪 Llenar datos" - all fields populate ✓
6. [ ] Click sidebar Step 7 (Slack) - jump directly ✓
7. [ ] Click "Siguiente →" through all remaining steps ✓
8. [ ] Reach final step without errors ✓
9. [ ] All progress bar shows ~100% ✓
10. [ ] Done! ✓

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| QA | | | |
| Dev Lead | | | |

## Notes

Use this section to document any issues found:

```
Issue #1: [Description]
Status: [Open/Fixed]
Date Reported: [Date]

Issue #2: [Description]
Status: [Open/Fixed]
Date Reported: [Date]
```

---

**Testing Mode Version**: 1.0.0  
**Last Updated**: May 7, 2026  
**Status**: Ready for QA Testing
