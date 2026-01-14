# 🚀 Deploy Rápido - 3 Opciones

## ⚡ Opción 1: GitHub + Vercel (MÁS FÁCIL - 5 minutos)

### 1. Sube a GitHub

```bash
# En la terminal, dentro de /Users/matiasquezada/Desktop/hola

# Inicializar git (si no lo has hecho)
git init

# Agregar todos los archivos
git add .

# Commit
git commit -m "Deploy ERP Multi-usuario"

# Crear repo en GitHub:
# 1. Ve a https://github.com/new
# 2. Nombre: erp-contabilidad
# 3. Private o Public (tu elección)
# 4. NO inicializar con README
# 5. Crear

# Conectar y subir (reemplaza TU_USERNAME)
git remote add origin https://github.com/TU_USERNAME/erp-contabilidad.git
git branch -M main
git push -u origin main
```

### 2. Deploy en Vercel

1. **Abre**: https://vercel.com
2. **Login** con GitHub
3. Click **"Add New Project"**
4. **Import** tu repo `erp-contabilidad`
5. Vercel detectará automáticamente:
   - Framework: Vite ✅
   - Build: npm run build ✅
   - Output: dist ✅
6. **IMPORTANTE: Agregar Environment Variables**:
   - Click "Environment Variables"
   - Agregar:
     ```
     VITE_SUPABASE_URL = (tu URL de Supabase)
     VITE_SUPABASE_ANON_KEY = (tu anon key de Supabase)
     ```
7. Click **"Deploy"**

⏱️ **Espera 2-3 minutos**

✅ **Tu app estará en**: `https://erp-contabilidad-xxx.vercel.app`

---

## 🔧 Opción 2: Vercel CLI (Rápido)

```bash
# 1. Instalar Vercel CLI globalmente
npm install -g vercel

# 2. Login
vercel login
# Se abre navegador para autenticar

# 3. Deploy
cd /Users/matiasquezada/Desktop/hola
vercel

# 4. Responder prompts:
# Set up and deploy? Y
# Which scope? (tu cuenta)
# Link to existing? N
# Project name? erp-contabilidad
# Directory? ./
# Override settings? N

# 5. Agregar env vars
vercel env add VITE_SUPABASE_URL production
# Pegar tu URL

vercel env add VITE_SUPABASE_ANON_KEY production
# Pegar tu key

# 6. Deploy a producción
vercel --prod
```

✅ **URL en consola**: `https://erp-contabilidad.vercel.app`

---

## 📦 Opción 3: Drag & Drop (Sin GitHub)

1. **Build local**:
   ```bash
   npm run build
   ```

2. **Ir a**: https://vercel.com/new
3. **Drag & drop** la carpeta `dist/`
4. **Configurar**:
   - Project name: erp-contabilidad
   - Agregar environment variables (Settings después de deploy)
5. **Deploy**

⚠️ **Desventaja**: Sin auto-deploy, debes subir manualmente cada vez

---

## ✅ Verificación Post-Deploy

1. **Abrir tu URL** Vercel
2. **Verificar**:
   - ✅ Login carga
   - ✅ Supabase conecta (no error "Missing env variables")
   - ✅ Puedes crear cuenta
   - ✅ Todas las rutas funcionan

3. **Si ves errores**:
   - F12 → Console (ver errores)
   - Vercel Dashboard → Logs
   - Supabase Dashboard → Logs

---

## 🌐 Dominio Personalizado (Opcional)

En Vercel Dashboard:
1. Settings → Domains
2. Add: `tuempresa.cl`
3. Configurar DNS según instrucciones
4. ✅ Listo en 5-60 min

---

## 🔄 Actualizar App Deployed

### Con GitHub:
```bash
git add .
git commit -m "Update features"
git push
```
→ Auto-deploy en Vercel ✅

### Con CLI:
```bash
vercel --prod
```

---

## 💡 Recomendación

**Usa Opción 1 (GitHub + Vercel)**:
- ✅ Auto-deploy en cada push
- ✅ Preview deploys para PRs
- ✅ Rollback fácil
- ✅ Historial de deploys

---

## Estado Actual de Tu Proyecto

✅ **Build exitoso**: `dist/` listo para deploy  
✅ **Tamaño**: ~2MB gzipped  
✅ **Configuración**: `vercel.json` configurado  
✅ **Environment**: `.env.example` template listo  

**Solo falta**:
1. Subir a GitHub (o usar CLI)
2. Deploy en Vercel
3. Agregar env vars
4. ✅ ¡Listo!

**¿Cuál opción prefieres? Te guío paso a paso.**
