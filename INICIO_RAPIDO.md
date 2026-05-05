# 🚀 Guía de Inicio Rápido

**5 pasos para poner en marcha tu SaaS de Onboarding**

---

## 1️⃣ Setup Firebase (15 minutos)

### A. Crear Proyecto
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea proyecto: `alphalux-onboarding`
3. Espera a que se cree (2-3 min)

### B. Habilitar Servicios
1. **Authentication**: Email/Password ✅
2. **Firestore**: Crear base de datos ✅
3. **Cloud Storage**: Habilitar almacenamiento ✅

### C. Obtener Credenciales
1. Ve a Settings (⚙️) → Proyecto Settings
2. Copia tu `firebaseConfig`
3. Pega en `js/firebase-config.js` (reemplaza el existente)

---

## 2️⃣ Configurar Reglas (5 minutos)

### Firestore Rules
```javascript
// Copia-pega en Firestore → Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /clientes/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    match /clientes/{document=**} {
      allow read: if request.auth != null;
    }
  }
}
```

### Cloud Storage Rules
```javascript
// Copia-pega en Storage → Rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /materiales/{userId}/{allPaths=**} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

---

## 3️⃣ Crear Colecciones (3 minutos)

En Firestore, crea dos colecciones vacías:
1. `clientes` (documento de prueba: deja vacío)
2. `users` (documento de prueba: deja vacío)

---

## 4️⃣ Crear Usuario Admin (5 minutos)

### En Firebase Auth
1. Crea usuario: `admin@alphalux.com` / `Admin123456`
2. Copia el UID

### En Firestore
1. Crea documento en `users` con ID = UID anterior
2. Datos:
   ```
   email: admin@alphalux.com
   role: admin
   createdAt: (fecha actual)
   ```

---

## 5️⃣ Ejecutar Localmente (2 minutos)

### Opción A: Python
```bash
cd /ruta/al/proyecto
python -m http.server 8000
```

### Opción B: Node.js
```bash
cd /ruta/al/proyecto
npx http-server
```

### Opción C: VS Code Live Server
- Instala extensión "Live Server"
- Click derecho en index.html → "Open with Live Server"

---

## ✅ Probar

### Como Cliente
1. Abre http://localhost:8000
2. Registra: `cliente@test.com` / `Test123456`
3. Deberías ver tu dashboard

### Como Admin
1. Abre http://localhost:8000/admin.html
2. Inicia sesión: `admin@alphalux.com` / `Admin123456`
3. Deberías ver tu cliente en la tabla

---

## 🎯 Checklist Rápido

- [ ] Proyecto Firebase creado
- [ ] Auth habilitado
- [ ] Firestore creado
- [ ] Cloud Storage habilitado
- [ ] firebase-config.js actualizado
- [ ] Reglas de seguridad publicadas
- [ ] Colecciones creadas (`clientes`, `users`)
- [ ] Admin creado
- [ ] Servidor local ejecutándose
- [ ] Login funciona
- [ ] Dashboard visible
- [ ] Admin panel accesible

---

## 🆘 Problemas Comunes

### Error: "PERMISSION_DENIED"
**Solución**: Verifica que las reglas de Firestore estén publicadas

### No aparecen datos en tabla Admin
**Solución**: Asegúrate de tener un documento en `clientes`

### Firebase config dice "undefined"
**Solución**: Verifica que copiaste la config correctamente en `js/firebase-config.js`

### Los archivos no se cargan
**Solución**: Verifica que Cloud Storage esté habilitado y configurado

---

## 📖 Documentación Completa

- **README.md**: Guía completa
- **FIREBASE_SETUP.md**: Setup detallado paso a paso
- **DATOS_EJEMPLO.md**: Datos para testing
- **RESUMEN_PROYECTO.md**: Visión general del proyecto

---

## 🚀 Siguiente Paso

Una vez todo funcione:

### Opción 1: Deploy en Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase deploy
```

### Opción 2: Seguir desarrollando localmente
Añade las mejoras de la Fase 2:
- Notificaciones por email
- Recordatorios automáticos
- Análisis de datos

---

## 💡 Consejos

1. **Prueba todo localmente primero**
2. **No expongas firebase-config.js en producción** (es público)
3. **Las reglas de seguridad son críticas** - revísalas regularmente
4. **Haz copias de seguridad** de Firestore
5. **Monitorea el uso** - Firebase tiene cuotas gratuitas

---

## 🎉 ¡Listo!

Tu SaaS de Onboarding está en el aire. 

**Ahora es momento de:**
- Personalizar los textos
- Añadir tu logo
- Invitar clientes reales
- Recopilar feedback
- Iterar y mejorar

---

**¿Preguntas?** Lee la documentación completa en README.md o FIREBASE_SETUP.md

¡Bienvenido a la era de los onboardings profesionales! 🚀
