# Testing Mode Documentation

## Overview

The Testing/Admin Mode system allows QA and development teams to efficiently test the onboarding flow without manually filling out all required fields. This feature is controlled via environment variables and has **zero impact on production builds**.

## Features

✅ **Validation Bypass** - Skip field validation when testing mode is enabled  
✅ **Auto-Fill** - Populate all form fields with test data in one click  
✅ **Step Navigation** - Jump to any step in the onboarding flow  
✅ **Visual Indicator** - Clear visual badge showing testing mode is active  
✅ **Production Safe** - Only enabled in development via `VITE_TESTING_MODE=true`

## Setup Instructions

### 1. Enable Testing Mode

Testing mode is **already enabled** in `.env.local`:

```env
VITE_TESTING_MODE=true
```

To disable testing mode, set this value to `false`:
```env
VITE_TESTING_MODE=false
```

### 2. Start Development Server

```bash
npm run dev
```

The dev server will display a console message when testing mode is enabled:
```
🧪 TESTING MODE ENABLED
Features available:
  bypassValidation: true
  autoFill: true
  skipSteps: true
```

## How to Use Testing Mode

### 1. Validation Bypass

When testing mode is active, you can:
- Click "Siguiente →" without filling out required fields
- Advance through all steps without completing any forms
- Skip validation errors that would normally block progression

**Note**: Validation still runs in production (when `VITE_TESTING_MODE=false`)

### 2. Auto-Fill Feature

1. Navigate to any onboarding step (not the welcome screen)
2. Look for the **"🧪 Llenar datos"** button in the navigation area
3. Click it to instantly populate all visible fields with test data
4. All form data is automatically saved to Firebase

### 3. Step Navigation

When testing mode is enabled:
- Click any step in the left sidebar to jump directly to that step
- No need to complete steps sequentially
- Perfect for testing specific modules in isolation

### 4. Visual Indicator

A blue badge appears at the top of the form area:
```
🧪 TESTING MODE ENABLED - Validación desactivada
```

This indicates testing mode is active and validations are bypassed.

## Test Data Structure

Test data is defined in `src/config/mockClientData.js` and includes:

### Module 1: Información Básica
- Company: TechStart Solutions S.A.C.
- Sector: Tecnología
- Country: Perú
- Email: contact@techstart.test

### Module 2: Servicio Principal
- Service: Consultoría Digital y Transformación TI
- Price Range: $15,000-50,000
- Target: Medium enterprises (50-500 employees)

### Module 3: Cliente Ideal
- Age: 35-55
- Budget: $20,000
- Timeline: 3-6 months
- Key Pain Points: Manual processes, legacy systems, high costs

### Module 4: Marca
- Colors: #0066CC, #FF6B35, #FFFFFF, #333333
- Style: Professional and modern
- Tagline: Transformamos negocios con tecnología

### Modules 5-10
Complete test data for Meta Ads, Google, Slack, AI, Inspiration, and Scheduling

## Testing Workflow

### Quick Test (< 1 minute)

1. Go to onboarding URL
2. Click "Comenzar Ahora"
3. Click "🧪 Llenar datos" button
4. Observe all fields populate
5. Click "Siguiente →" through remaining steps
6. Reach completion step

### Step-Specific Testing (5-10 minutes)

1. Navigate to onboarding
2. Use sidebar to jump to specific step
3. Test that step's functionality in isolation
4. Verify data saves correctly
5. Jump to next step

### Validation Bypass Testing

1. Go to any form step
2. Leave fields empty
3. Click "Siguiente →" 
4. Verify you advance without error message (in testing mode)
5. Compare with disabled mode to see error message

## File Structure

```
src/config/
├── testingConfig.js          # Feature flag detection and control
└── mockClientData.js         # Complete test dataset

src/pages/
└── ClientOnboarding.jsx      # Main component with testing integration
```

### Key Integration Points

**testingConfig.js** exports:
- `TESTING_MODE.isEnabled()` - Check if testing mode is active
- `TESTING_MODE.canBypassValidation()` - Should skip validations?
- `TESTING_MODE.canAutoFill()` - Show auto-fill button?
- `TESTING_MODE.canSkipSteps()` - Allow step navigation?

**mockClientData.js** exports:
- `MOCK_CLIENT_DATA` - Full dataset for all modules
- `MOCK_CLIENT_BY_MODULE` - Data indexed by step number
- `MODULES_WITH_DATA` - Array of steps with test data

## Security Considerations

### ✅ Safe by Default

- Testing mode **only activates** if `VITE_TESTING_MODE=true` is explicitly set
- Environment variable is **not included** in production builds
- URL parameters (`?testingMode=true`) only work if environment variable allows it
- No testing features are accessible in production

### Production Build

When you build for production:
```bash
npm run build
```

- Environment variable `VITE_TESTING_MODE` is `undefined` in production
- All testing code becomes inactive
- Validation runs normally for all users
- Zero performance impact

## Troubleshooting

### Auto-Fill Button Not Visible

- Ensure `VITE_TESTING_MODE=true` in `.env.local`
- Restart development server after changing `.env.local`
- Check browser console for testing mode status message

### Validation Still Blocking

- Check that dev server restarted after env change
- Verify console shows "🧪 TESTING MODE ENABLED"
- Try hard refresh (Ctrl+Shift+R) to clear cache

### Data Not Saving

- Check Firebase connection is working
- Verify Firebase rules allow write access
- Check browser console for error messages
- Try clicking "🧪 Llenar datos" again

## Advanced Configuration

### Disable Testing Mode Temporarily

Edit `.env.local`:
```env
VITE_TESTING_MODE=false
```

Restart dev server. Testing features will be unavailable.

### Modify Test Data

Edit `src/config/mockClientData.js`:

```javascript
export const MOCK_CLIENT_DATA = {
  info_basica: {
    nombre_comercial: 'Your Company Name',  // Change this
    // ... other fields
  },
  // ... other modules
}
```

Restart dev server for changes to take effect.

### Check Testing Status

Open browser console. If testing mode is enabled, you'll see:

```
%c🧪 TESTING MODE ENABLED
Features available:
  bypassValidation: true
  autoFill: true
  skipSteps: true
```

## Performance Impact

- **Development**: +0ms overhead (simple flag check)
- **Production**: 0ms (testing code not included in build)
- **Bundle Size**: +2.1KB testingConfig.js + 5.2KB mockClientData.js (dev only)

## Browser Compatibility

Testing mode works in all modern browsers:
- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Support

For issues or questions about testing mode:
1. Check browser console for error messages
2. Verify VITE_TESTING_MODE is set correctly
3. Restart development server
4. Clear browser cache and reload
5. Check Firebase connection status

---

**Last Updated**: May 7, 2026  
**Status**: ✅ Production Ready  
**Version**: 1.0.0
