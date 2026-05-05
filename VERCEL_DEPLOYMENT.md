# Despliegue en Vercel - Guía Completa

Esta guía te mostrará cómo desplegar tu aplicación Alphalux Onboarding SAAS en Vercel **completamente gratis**.

---

## 📋 Requisitos

- Cuenta en GitHub (con acceso al repositorio)
- Cuenta en Vercel (se puede crear con GitHub)
- Firebase project con credenciales

---

## 🚀 Pasos para Desplegar

### **Paso 1: Verifica que los archivos de configuración estén en Git**

Asegúrate de que estos archivos estén en tu repositorio:
- `vercel.json` ✅
- `build-env.js` ✅
- `.env.example` ✅
- `.gitignore` (actualizado) ✅

```bash
git status
git add vercel.json build-env.js .env.example .gitignore
git commit -m "Add Vercel configuration with environment variables"
git push origin main
```

### **Paso 2: Ve a Vercel y crea un nuevo proyecto**

1. Abre https://vercel.com
2. Haz clic en **"New Project"**
3. Selecciona **"Import Git Repository"**
4. Busca **`Alphalux-Consulting/Onboarding_SAAS`** y selecciona
5. Haz clic en **"Import"**

### **Paso 3: Configura el Build Settings**

Vercel debería detectar automáticamente:
- **Framework Preset**: `Other` o `Static`
- **Build Command**: `node build-env.js`
- **Output Directory**: `.` (root)

**⚠️ IMPORTANTE:** Asegúrate de que el build command sea `node build-env.js`

### **Paso 4: Añade Variables de Entorno (CRÍTICO)**

Antes de desplegar, debes agregar tus credenciales de Firebase:

1. En la pantalla de Vercel, ve a **"Environment Variables"**
2. Haz clic en **"Add New"** para cada variable:

| Variable | Valor |
|----------|-------|
| `FIREBASE_API_KEY` | `AIzaSyCYGnhJwAPcshOQJfVG1zaDhXY3ndtPdTM` |
| `FIREBASE_AUTH_DOMAIN` | `alphalux-consulting.firebaseapp.com` |
| `FIREBASE_PROJECT_ID` | `alphalux-consulting` |
| `FIREBASE_STORAGE_BUCKET` | `alphalux-consulting.firebasestorage.app` |
| `FIREBASE_MESSAGING_SENDER_ID` | `864478354242` |
| `FIREBASE_APP_ID` | `1:864478354242:web:e1db47e2686c2bdede86db` |

**⚠️ NOTA:** Reemplaza estos valores con los de TU Firebase project si es diferente.

Para obtener tus credenciales:
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Haz clic en ⚙️ (Settings) → Project Settings
4. Ve a la sección "Your apps" → Web app
5. Copia el objeto `firebaseConfig`

### **Paso 5: Despliega**

1. Haz clic en **"Deploy"**
2. Espera a que termine (generalmente 1-3 minutos)
3. ¡Listo! Tu app está en vivo 🎉

Vercel te dará una URL como:
```
https://alphalux-onboarding-saas.vercel.app
```

---

## 🔄 Despliegues Automáticos

Desde ahora, **cada vez que hagas push a GitHub**, Vercel automáticamente:
1. Detecta los cambios
2. Ejecuta el build command
3. Inyecta las variables de entorno
4. Despliega la nueva versión

¡Sin hacer nada manualmente! 🚀

---

## 🛠️ Cómo Funcionan las Variables de Entorno

### Flujo de Despliegue:

1. **Vercel obtiene** tus variables de entorno del dashboard
2. **Ejecuta** `node build-env.js` durante el build
3. **Crea** `public/env-config.js` con las variables inyectadas
4. **Incluye** ese archivo en tu HTML
5. **`firebase-config.js`** lee desde `window.__ENV__`

### Desarrollo Local:

Para probar localmente con variables:

1. Copia `.env.example` a `.env.local`:
```bash
cp .env.example .env.local
```

2. Llena tus credenciales en `.env.local` (NO lo commitees)

3. Ejecuta el build:
```bash
npm run build
node build-env.js
```

4. Levanta el servidor:
```bash
npm run dev
```

---

## ✅ Verificación Post-Despliegue

Después de desplegar, verifica que todo funcione:

1. **Abre tu URL** en el navegador
2. **Abre Developer Tools** (F12)
3. **Ve a Console** y verifica:
   - No hay errores rojos
   - `window.__ENV__` contiene tus variables
   - Firebase se inicializa correctamente

```javascript
// En la consola, deberías ver:
window.__ENV__
// {
//   FIREBASE_API_KEY: "AIzaSy...",
//   FIREBASE_AUTH_DOMAIN: "alphalux-consulting.firebaseapp.com",
//   ...
// }
```

---

## 🐛 Troubleshooting

### **Error: Build failed**

Verifica que:
- [ ] `vercel.json` existe y está correctamente formateado
- [ ] `build-env.js` existe
- [ ] `package.json` existe con Node engine >= 18

### **Variables de entorno no se inyectan**

Verifica que:
- [ ] Las variables están en **Environment Variables** de Vercel (no en `.env`)
- [ ] Los nombres son exactos: `FIREBASE_API_KEY`, etc.
- [ ] Hiciste un nuevo deploy después de añadir variables

### **Firebase no se conecta**

Verifica que:
- [ ] Credenciales son correctas
- [ ] Tu Firebase project está en la región correcta
- [ ] Firestore está habilitado
- [ ] Las security rules permiten lectura/escritura para clientes

### **CORS errors**

Si ves errores de CORS:
1. Ve a Firebase Console
2. Authentication → Settings
3. Añade tu dominio Vercel a **Authorized domains**

---

## 🔒 Seguridad

**IMPORTANTE:**

✅ **HACED:**
- Guarda `.env.local` en `.gitignore`
- Usa environment variables de Vercel para credenciales
- Verifica que `.env` no esté en Git

❌ **NO HAGÁIS:**
- Commitar `.env` con credenciales reales
- Compartir tu `apiKey` por Slack/Email
- Usar credenciales en commits

---

## 📱 Dominio Personalizado (Opcional)

Para usar tu propio dominio:

1. Ve a **Settings** → **Domains**
2. Añade tu dominio
3. Configura los DNS records según Vercel
4. Espera a que se propague (puede tardar 24h)

---

## 💰 Plan Gratis de Vercel

Con el plan **Hobby (Free)** obtienes:

✅ Despliegues ilimitados  
✅ SSL/HTTPS incluido  
✅ CDN global  
✅ Dominio `.vercel.app` gratis  
✅ Hasta 100GB de ancho de banda  
✅ Unlimited builds  

¡Perfecto para desarrollo y testing!

---

## 🚀 Próximos Pasos

Después del despliegue:

1. **Prueba el admin login**
   - URL: `https://tu-dominio.vercel.app/admin-login.html`

2. **Prueba el client login**
   - URL: `https://tu-dominio.vercel.app/client-login.html`

3. **Comparte la URL** con tu equipo

4. **Monitorea** en Vercel Dashboard → Analytics

---

## 📞 Soporte

Si tienes problemas:

1. Verifica los **Build Logs** en Vercel
2. Revisa la **Console** del navegador (F12)
3. Comprueba **Environment Variables** están bien configuradas
4. Revisa **FIREBASE_SETUP.md** para issues de Firebase

---

**¡Tu aplicación Alphalux está lista para el mundo! 🌍**

Última actualización: 2026-04-30
