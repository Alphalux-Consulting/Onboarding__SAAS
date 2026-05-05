# Alphalux Onboarding SAAS - React + Vite Edition

A modern, premium client onboarding management platform built with React 18, Vite, and Firebase.

**Version:** 2.0.0 (Complete Redesign)
**Status:** 🚀 Production Ready
**Last Updated:** 2026-05-04

## 🎯 Overview

Alphalux Onboarding SAAS is a comprehensive client management and onboarding platform featuring:

- **Token-based secure client access** - Unique 30-day expiration links
- **12-step interactive onboarding wizard** - 100+ customizable form fields
- **Admin dashboard** - Complete client management and analytics
- **Data export** - CSV and JSON export for reporting and integration
- **Premium dark aesthetic** - Gold (#d4af37), black, and white color scheme
- **Firebase backend** - Real-time database with file storage
- **Responsive design** - Works on desktop, tablet, and mobile

## ✨ Key Features

### Admin Dashboard
- ✅ Client management with status tracking
- ✅ One-click token generation for client invitations
- ✅ Real-time progress tracking and analytics
- ✅ Client detail views with complete data
- ✅ Data export to CSV/JSON for Google Sheets
- ✅ Analytics dashboard with completion stats
- ✅ Edit client information and history tracking

### Client Onboarding
- ✅ 12 comprehensive modules (Welcome → Confirmation)
- ✅ Auto-save functionality
- ✅ Progress tracking (0-100%)
- ✅ File upload for branding materials
- ✅ Support for complex nested data structures
- ✅ Editable submissions (clients can update anytime)
- ✅ Meeting scheduling integration
- ✅ Beautiful step-by-step wizard interface

### Security & Access Control
- ✅ Role-based access (Admin vs Client)
- ✅ Token validation and expiration
- ✅ Secure Firebase authentication
- ✅ Session storage for sensitive data
- ✅ Protected routes with automatic redirects

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm 7+
- Firebase project with authentication enabled
- Modern web browser

### Installation

```bash
# 1. Clone the repository
cd Onboarding_SAAS

# 2. Install dependencies
npm install

# 3. Create environment variables
# Copy .env.example to .env.local and add your Firebase credentials
# or use the existing .env.local with test credentials

# 4. Start development server
npm run dev

# Server runs on http://localhost:5173
# Browser will open automatically
```

### Building for Production

```bash
# Build optimized version
npm run build

# Preview production build locally
npm run preview

# Output: dist/ folder (ready for Vercel deployment)
```

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── LoadingScreen.jsx       # Loading spinner
│   └── ProtectedRoute.jsx       # Route protection wrapper
├── config/             # Configuration
│   ├── firebase.js              # Firebase initialization
│   └── constants.js             # App constants (modules, statuses, etc)
├── pages/              # Page components
│   ├── RoleSelector.jsx         # Initial role selection
│   ├── AdminLogin.jsx           # Admin authentication
│   ├── AdminDashboard.jsx       # Admin management panel
│   ├── ClientOnboarding.jsx     # Main onboarding wizard (1257 lines)
│   └── TokenValidation.jsx      # Token validation & entry point
├── services/           # Business logic
│   ├── adminAuth.js            # Admin authentication service
│   ├── clientData.js           # Client CRUD operations
│   ├── tokenValidator.js       # Token generation & validation
│   └── googleSheetsSync.js     # Data export (CSV/JSON)
├── styles/
│   ├── index.css               # Global styles & theme
│   └── pages.css               # Page-specific styles
├── App.jsx             # Main app with routing
└── main.jsx            # React entry point
```

## 🔐 Authentication Flow

### Admin Access
```
1. Admin Login (/admin-login)
2. Email/password verification via Firebase Auth
3. Role check: "admin" role required in users collection
4. Redirect to /admin dashboard
```

### Client Access
```
1. Token link (/onboarding/[token])
2. Token validation (check existence, expiration, status)
3. Token marked as "used" on first access
4. Redirect to /dashboard with sessionStorage
5. Client can edit data anytime token is valid
```

## 📊 12 Onboarding Modules

1. **Bienvenida** (Welcome) - Introduction and timeframe
2. **Información Básica** - Company name, sector, location, contact
3. **Servicio Principal** - Main service, pricing, differentiators
4. **Cliente Ideal** - Target customer profile, pain points
5. **Marca** - Brand colors, typography, style, file uploads
6. **Entorno Meta** - Facebook Ads account configuration
7. **Entorno Google** - Google Ads and Maps setup
8. **Slack** - Slack workspace and team info
9. **Entorno IA** - AI assistant configuration
10. **Inspiración** - References and inspiration links
11. **Agendamiento** - Meeting scheduling and contact
12. **Confirmación** - Final confirmation checklist

## 🗄️ Firestore Collections

### users/
```
{
  email: string
  role: "admin" | "client"
  createdAt: timestamp
}
```

### clientes/
```
{
  empresa: string
  email: string
  progreso: 0-100
  estado_cliente: "no_iniciado" | "en_proceso" | "completado"
  estado_admin: "pendiente" | "en_revision" | "finalizado"
  [Module fields]: { ...fields }
  createdAt: timestamp
  updatedAt: timestamp
  lastEditedAt: timestamp
}
```

### onboarding_tokens/
```
{
  token: UUID string
  clientEmail: string
  clientCompany: string
  status: "active" | "used" | "expired"
  createdAt: timestamp
  expiresAt: timestamp (30 days)
  usedAt: timestamp (nullable)
  viewCount: number
}
```

## 🎨 Design System

### Colors
- **Primary:** #d4af37 (Gold)
- **Primary Light:** #e5c158 (Light Gold)
- **Background:** #000000 (Pure Black)
- **Background Card:** #1a1a1a (Dark Black)
- **Text Primary:** #f5f5f5 (Off-white)
- **Text Secondary:** #d0d0d0 (Light Gray)
- **Accent:** #0080ff (Electric Blue, secondary)

### Components
- Premium glassmorphism cards with subtle gold accents
- Smooth animations and transitions
- Responsive grid layouts
- Modal dialogs for details and actions
- Progress bars with gradient fills
- Status indicators and badges

## 🔄 Data Export Features

### CSV Export
- Compatible with Excel and Google Sheets
- One row per client with summary columns
- Ideal for spreadsheet analysis
- Download as: `clientes-default-2026-05-04.csv`

### JSON Export
- Complete data structure with all fields
- One file per client or all clients
- Ideal for API integration
- Download as: `clientes-default-2026-05-04.json`

### Manual Google Sheets Import
1. Download CSV from admin panel
2. Open Google Sheets
3. Paste data directly or use "Import" feature
4. Ready for analysis and sharing

## 📱 Responsive Design

- **Desktop** (1024px+): Full layout with sidebar
- **Tablet** (768px-1023px): Responsive grid, stacked tables
- **Mobile** (480px-767px): Full-width, single column
- **Small Mobile** (<480px): Optimized touch targets

## 🔑 Environment Variables

Required for production:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 🚢 Deployment

### Vercel (Recommended)
```bash
# 1. Connect GitHub repository to Vercel
# 2. Add Firebase environment variables in Vercel project settings
# 3. Deploy automatically on push to main
```

### Manual Build
```bash
npm run build
# Upload dist/ folder to your hosting service
```

## 🧪 Testing Checklist

- [ ] Admin login and role verification
- [ ] Client token generation and validation
- [ ] All 12 onboarding modules render correctly
- [ ] Form data persists to Firestore
- [ ] File upload functionality works
- [ ] Progress calculation is accurate
- [ ] Admin can view all clients and status
- [ ] CSV/JSON export generates valid files
- [ ] Client can edit after submission
- [ ] Mobile responsive layout works

## 🐛 Troubleshooting

### "Token expired" error
- Admin needs to generate new token
- Default expiration: 30 days
- Check token status in onboarding_tokens collection

### Firebase connection issues
- Verify environment variables in .env.local
- Check Firebase project settings
- Enable Email/Password authentication in Firebase Console
- Ensure Firestore rules allow read/write for authenticated users

### File upload not working
- Check Firebase Storage bucket exists
- Verify storage rules allow uploads
- Check file size limits (default: 10MB)

## 📚 Documentation

- **Architecture:** See src/ folder structure above
- **Module Details:** Check ClientOnboarding.jsx (lines 250-1257)
- **Services:** Review services/ folder for business logic
- **Styling:** See pages.css for component-specific styles

## 🎓 Development Tips

### Adding New Form Fields
1. Add field to MODULES constants
2. Update Firestore schema
3. Add input in appropriate module component
4. Test form submission and data persistence

### Custom Styling
- Global styles: src/index.css
- Component styles: src/pages/pages.css
- Use CSS variables for consistent theming
- Test responsive breakpoints at 768px and 480px

### Debugging
- Use React DevTools browser extension
- Check Firebase Firestore console for data
- Monitor browser console for errors
- Use sessionStorage.getItem() to check auth state

## 📞 Support

For issues or questions:
1. Check this README for common solutions
2. Review code comments in src/ files
3. Check Firebase documentation
4. Review Vite configuration

## 📄 License

Proprietary software - All rights reserved to Alphalux

---

**Built with:** React 18 | Vite 5 | Firebase 10 | React Router 6
**Hosted on:** Vercel | Cloud hosted on Google Cloud Platform
