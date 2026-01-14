# 🚀 Deploy a Producción en Vercel

## 🎯 Opción 1: Deploy desde GitHub (Recomendado)

### Paso 1: Subir a GitHub (si no lo has hecho)

```bash
# Inicializar git
git init

# Agregar archivos
git add .

# Commit inicial
git commit -m "Initial commit - ERP Multi-usuario"

# Crear repositorio en GitHub
# Ve a github.com → New Repository → "erp-contabilidad"

# Conectar y subir
git remote add origin https://github.com/TU_USERNAME/erp-contabilidad.git
git branch -M main
git push -u origin main
```

### Paso 2: Deploy en Vercel

1. **Ir a**: [vercel.com](https://vercel.com)
2. **Sign Up / Login** con GitHub
3. Click **"Add New Project"**
4. **Importar** tu repositorio GitHub `erp-contabilidad`
5. **Configure Project**:
   - Framework Preset: **Vite** (detectado automático)
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. **Environment Variables** - Agregar:
   ```
   VITE_SUPABASE_URL = https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJhbGciOi...
   ```
7. Click **"Deploy"**

⏱️ **Tiempo**: 2-3 minutos

✅ **Resultado**: Tu app estará en `https://erp-contabilidad.vercel.app`

---

## ⚡ Opción 2: Deploy Manual (Rápido)

Si no quieres usar GitHub:

```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel

# 4. Seguir prompts:
# - Set up and deploy? → Yes
# - Which scope? → Tu cuenta
# - Link to existing project? → No
# - Project name? → erp-contabilidad
# - Directory? → ./
# - Want to override settings? → No

# 5. Agregar variables de entorno
vercel env add VITE_SUPABASE_URL
# Pegar: https://xxxxx.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY
# Pegar: eyJhbGciOi...

# 6. Re-deploy con env vars
vercel --prod
```

---

## 🔄 Auto-Deploy desde GitHub

Una vez conectado GitHub → Vercel:

- Cada `git push` a `main` → Deploy automático
- Pull Requests → Preview deployment
- Rollback con 1 click

---

## 🌐 Dominio Personalizado (Opcional)

### En Vercel Dashboard:

1. **Settings** → **Domains**
2. **Add Domain**: `tuempresa.cl`
3. Seguir instrucciones DNS:
   - Agregar CNAME: `www` → `cname.vercel-dns.com`
   - O A record para root domain
4. Esperar propagación DNS (5-60 min)

✅ Tu app estará en: `https://tuempresa.cl`

---

## 📊 Monitoreo Post-Deploy

**Dashboard Vercel**:
- Analytics (tráfico, performance)
- Logs (errores en tiempo real)
- Deployments (historial, rollback)

**Supabase Dashboard**:
- Database (ver queries)
- Authentication (usuarios activos)
- API (usage stats)

---

## 🛠️ Build Local para Test

Antes de deployar, prueba el build localmente:

```bash
# Build
npm run build

# Preview
npm run preview

# Abrir: http://localhost:4173
```

Verifica:
- ✅ Login funciona
- ✅ Supabase conecta
- ✅ Todas las rutas funcionan
- ✅ No hay errores en consola

---

## 🔐 Seguridad en Producción

### Variables de Entorno:

**EN VERCEL** (nunca en código):
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### Supabase RLS:

- ✅ Ya configurado en schema.sql
- Usuarios solo ven datos de su empresa
- Políticas de Row Level Security activas

### HTTPS:

- ✅ Vercel provee SSL automático
- Todos los requests son HTTPS

---

## 🚨 Troubleshooting

**Error: "Failed to load module"**
- Verifica que `package.json` tenga todas las deps
- Run `npm install` antes de commit

**Error: "Environment variables not found"**
- Verifica en Vercel: Settings → Environment Variables
- Las variables deben empezar con `VITE_`
- Re-deploy después de agregar variables

**404 en rutas**
- `vercel.json` debe tener rewrites configurado (ya incluido)

**Supabase no conecta**
- Verifica que la URL/Key sean correctas
- Revisa Supabase Dashboard → Settings → API

---

## 📱 Progressive Web App (PWA) - Opcional

Para que funcione offline:

```bash
npm install -D vite-plugin-pwa
```

Luego configurar en `vite.config.ts` (te ayudo si quieres)

---

## 💰 Costos

**Vercel Free Tier**:
- ✅ Bandwidth ilimitado para hobby
- ✅ 100 GB-hours/mes
- ✅ HTTPS gratis
- ✅ Auto-scaling
- ⚠️ 1 commercial project limit

**Vercel Pro** ($20/mes):
- Proyectos comerciales ilimitados
- Más analytics
- Soporte prioritario

**Supabase Free**:
- 500 MB DB
- 1 GB bandwidth
- Ver detalles en SUPABASE_SETUP.md

---

## 🎉 ¡Listo!

Tu ERP multi-usuario estará disponible 24/7 en:
- `https://tu-app.vercel.app`
- O tu dominio personalizado

Con:
- ✅ Auto-deploy en cada push
- ✅ SSL/HTTPS automático
- ✅ CDN global (ultra rápido)
- ✅ 99.99% uptime
- ✅ Backups automáticos en Supabase

**¿Necesitas ayuda con el deploy? ¡Avísame!** 🚀
