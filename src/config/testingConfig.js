/**
 * Testing Mode Configuration
 * Controls whether testing/admin features are enabled
 * Security: Only enabled via explicit environment variable (VITE_TESTING_MODE=true)
 */

/**
 * Detect if testing mode is enabled
 * Checks:
 * 1. VITE_TESTING_MODE environment variable (primary)
 * 2. URL parameter ?testingMode=true (only if env allows)
 * 3. Admin role in sessionStorage
 */
function detectTestingMode() {
  // Check environment variable (primary control)
  const envTestingMode = import.meta.env.VITE_TESTING_MODE === 'true'

  if (!envTestingMode) {
    return false
  }

  // If env enables testing, also check URL param and admin role
  const urlParams = new URLSearchParams(window.location.search)
  const urlTestingMode = urlParams.get('testingMode') === 'true'

  // Check if user has admin role
  const adminRole = sessionStorage.getItem('adminRole') === 'true'

  return true // If env var is true, testing mode is on
}

/**
 * Check if user can bypass validation
 * Only allowed in testing mode
 */
function canBypassValidation() {
  return detectTestingMode()
}

/**
 * Check if user can use auto-fill feature
 * Only allowed in testing mode
 */
function canAutoFill() {
  return detectTestingMode()
}

/**
 * Check if user can skip steps (jump to any step)
 * Only allowed in testing mode
 */
function canSkipSteps() {
  return detectTestingMode()
}

/**
 * Log testing mode status (useful for debugging)
 */
function logTestingStatus() {
  if (detectTestingMode()) {
    console.log(
      '%c🧪 TESTING MODE ENABLED',
      'background: #ff6b9d; color: white; padding: 8px 12px; border-radius: 4px; font-weight: bold;'
    )
    console.log(
      'Features available:',
      {
        bypassValidation: canBypassValidation(),
        autoFill: canAutoFill(),
        skipSteps: canSkipSteps()
      }
    )
  }
}

export const TESTING_MODE = {
  isEnabled: detectTestingMode,
  canBypassValidation,
  canAutoFill,
  canSkipSteps,
  logStatus: logTestingStatus
}

// Log status on import
if (typeof window !== 'undefined') {
  logTestingStatus()
}

export default TESTING_MODE
