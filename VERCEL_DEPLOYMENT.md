# Deploy a Vercel - Guía Definitiva (Alphalux Onboarding)

> Generado el 2026-05-05. Reemplaza al `VERCEL_DEPLOYMENT.md` del repo (que está obsoleto).

---

## ⚠️ ANTES DE DEPLOYAR — Aplicar estos cambios

### 1. Reemplaza `vercel.json`
Borra el actual y usa el nuevo (`vercel.json` de esta carpeta de fixes). El antiguo iba a romper el build con error "Secret does not exist".

### 2. Borra `netlify.toml`
Tienes credenciales de Firebase comprometidas en ese archivo. Si no usas Netlify:

```bash
git rm netlify.toml
```

Si SÍ lo usas, muévelas a env vars de Netlify y borra los valores del archivo.

### 3. Borra archivos de docs obsoletos
Estos archivos confunden al equipo y mencionan flujos rotos (`build-env.js` que no existe):

```bash
git rm VERCEL_DEPLOYMENT.md          # obsoleto
# Conserva el resto de READMEs
```

### 4. Reemplaza `.gitignore` por el de esta carpeta
El nuevo añade `.env.production`, `.netlify`, `serviceAccountKey.json`, `.claude/settings.local.json`.

### 5. Verifica que `.env.local` NO está commiteado
```bash
git ls-files | findstr ".env"
```
Si aparece `.env.local` o `.env`, sácalo del tracking:
```bash
git rm --cached .env.local
```

---

## 🚀 DEPLOY — Paso a Paso

### Paso 1: Push del código a GitHub

```bash
cd "C:\Users\Yeison Andres\Desktop\Trabajo de EUU\SAAS\Onboarding_SAAS"
git add .
git commit -m "fix: clean vercel.json + remove leaked Netlify config + update gitignore"
git push origin main
```

Si aún no tienes remoto en GitHub, primero crea el repo (`Alphalux-Consulting/Onboarding_SAAS` o el que uses) y conéctalo:

```bash
git remote add origin https://github.com/Alphalux-Consulting/Onboarding_SAAS.git
git branch -M main
git push -u origin main
```

### Paso 2: Importar el proyecto a Vercel

1. Entra a https://vercel.com/new
2. Selecciona el team **alphaluxconsulting's projects** (es el único que tienes)
3. Click en **Import Git Repository**
4. Busca y selecciona tu repo `Onboarding_SAAS`
5. **NO toques** los settings — Vercel detecta Vite automáticamente porque el nuevo `vercel.json` ya lo declara (`"framework": "vite"`)
6. Confirma:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

### Paso 3: Añadir variables de entorno

En la pantalla de Import, expande **Environment Variables** y añade estas 8 (todas con prefijo `VITE_` — esto es crítico para Vite):

| Name | Value |
|---|---|
| `VITE_FIREBASE_API_KEY` | `AIzaSyCYGnhJwAPcshOQJfVG1zaDhXY3ndtPdTM` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `alphalux-consulting.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `alphalux-consulting` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `alphalux-consulting.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `864478354242` |
| `VITE_FIREBASE_APP_ID` | `1:864478354242:web:e1db47e2686c2bdede86db` |
| `VITE_APP_NAME` | `Alphalux Onboarding` |
| `VITE_CEO_VIDEO_URL` | `https://www.youtube.com/embed/15cEtTMmvJk` |

Marca las 3 environments: **Production, Preview, Development** para todas.

> ⚠️ NO añadas `VITE_APP_URL` aún — la sabrás después del primer deploy. Luego la actualizas con la URL real de Vercel.

### Paso 4: Deploy

Click en **Deploy**. Tarda 1–2 min.

### Paso 5: Configuración post-deploy en Firebase

Una vez tengas la URL `https://onboarding-saas-xxx.vercel.app`:

1. **Firebase Console → Authentication → Settings → Authorized domains**
   - Añade: `onboarding-saas-xxx.vercel.app`
   - Y cualquier dominio custom que vayas a usar

2. **Firebase Console → Firestore → Rules** — asegúrate de que están bien (las que tienes en `INICIO_RAPIDO.md` están demasiado permisivas para producción; revisa esto antes de pasar clientes reales)

3. **Vercel → Settings → Environment Variables** — añade ahora `VITE_APP_URL` con la URL real, y haz un redeploy.

### Paso 6: Crear el primer admin

El sistema NO permite registro público de admins (es el comportamiento correcto que implementaste). Para crear el primer admin:

1. **Firebase Console → Authentication → Users → Add user**
   - Email: el tuyo
   - Password: uno seguro
   - Copia el UID generado

2. **Firebase Console → Firestore → Data → users**
   - Crea documento con ID = el UID que copiaste
   - Campos:
     ```
     email: "tu@email.com"        (string)
     role: "admin"                 (string)
     createdAt: <timestamp now>    (timestamp)
     ```

3. Entra a `https://tu-url.vercel.app/admin-login` y haz login.

---

## 🔍 Verificación del Deploy

Una vez deployado, abre DevTools (F12) → Console en la URL de producción:

```javascript
// Debería mostrar tus valores de Firebase (no "undefined")
console.log(import.meta.env.VITE_FIREBASE_PROJECT_ID)
```

Si ves `undefined`, las env vars NO se inyectaron — revisa que tengan prefijo `VITE_` y que estén marcadas en Production.

---

## 🐛 Troubleshooting

**Build falla con "Secret does not exist"**
→ No reemplazaste `vercel.json`. Vuelve al paso "ANTES DE DEPLOYAR".

**App carga pero login no funciona**
→ Falta añadir el dominio Vercel en Firebase Auth → Authorized domains.

**Página en blanco al hacer click en `/admin`**
→ Falta el `rewrite` para SPA routing. El nuevo `vercel.json` ya lo trae.

**`Firebase: Error (auth/unauthorized-domain)`**
→ Mismo que el anterior. Firebase Auth → Settings → Authorized domains.

---

## Próximos pasos recomendados (post-launch)

1. **Reglas de Firestore en producción** — las del `INICIO_RAPIDO.md` permiten lectura por cualquier autenticado, lo cual es demasiado abierto. Hay que restringir por `role` y `clientId`.
2. **Dominio custom** — `onboarding.alphalux.com` o similar (Vercel → Settings → Domains).
3. **Monitorización** — activa Vercel Analytics y considera Sentry para errores en producción.
4. **CI checks** — un `npm run build` en GitHub Actions previo al merge a `main` te evita romper producción.
