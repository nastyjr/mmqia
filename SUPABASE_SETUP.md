# 🎯 Pasos para Activar Multi-Usuario con Supabase

Sigue estos pasos para migrar de localStorage a Supabase y habilitar multi-usuario:

---

## 📝 Paso 1: Crear Proyecto Supabase (5 minutos)

1. **Ir a**: [https://supabase.com](https://supabase.com)
2. **Sign up / Login** con GitHub o Email
3. Click en **"New Project"**
4. Completar:
   - **Organization**: Crear nueva (tu nombre/empresa)
   - **Name**: `ContabilidadPro` (o el nombre que quieras)
   - **Database Password**: Generar password segura (guárdala!) 🔑
   - **Region**: `South America (São Paulo)` (más cercano a Chile)
   - **Pricing Plan**: **Free** (suficiente para empezar)
5. Click **"Create new project"**
6. ⏱️ Esperar ~2 minutos mientras se crea

---

## 🗄️ Paso 2: Ejecutar Schema SQL (2 minutos)

1. En tu proyecto Supabase, ir a:
   - **Dashboard** → **SQL Editor** (ícono de base de datos en sidebar)
2. Click en **"New Query"**
3. Abrir el archivo: `supabase/schema.sql` de tu proyecto
4. **Copiar TODO el contenido**
5. Pegarlo en el SQL Editor de Supabase
6. Click **"RUN"** (botón verde abajo a la derecha)
7. ✅ Deberías ver: `Success. No rows returned`

**Verifica**: 
- Ve a **Table Editor** → deberías ver 12 tablas creadas:
  - `companies`
  - `company_users`
  - `chart_of_accounts`
  - `journal_entries`
  - `journal_entry_lines`
  - `invoices`
  - `products`
  - `storage_locations`
  - `product_stocks`
  - `purchase_orders`
  - `fixed_assets`
  - `folio_counters`

---

## 🔐 Paso 3: Configurar Autenticación (1 minuto)

1. En Supabase Dashboard, ir a:
   - **Authentication** → **Providers** (sidebar izquierdo)
2. Asegurar que **Email** esté **ENABLED** ✅
3. (Opcional) Configurar email templates en **Email Templates**
   - Puedes personalizar los emails de bienvenida, reset password, etc.

---

## 🔑 Paso 4: Copiar Credenciales (1 minuto)

1. En Supabase Dashboard, ir a:
   - **Settings** (ícono de engranaje) → **API**
2. Copiar:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## 💻 Paso 5: Crear archivo .env (1 minuto)

1. En la raíz de tu proyecto, **copiar** `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```

2. **Editar** `.env` y pegar tus credenciales:
   ```env
   VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Guardar** el archivo

---

## 🚀 Paso 6: Reiniciar Servidor (30 segundos)

1. **Detener** el servidor de desarrollo (Ctrl+C)
2. **Reiniciar**:
   ```bash
   npm run dev
   ```

3. El sistema ahora debería detectar Supabase ✅

---

## ✅ Paso 7: Verificar Funcionamiento (2 minutos)

1. **Abrir** la aplicación en el navegador
2. Deberías ver la **pantalla de Login** 🔐
3. Click en **"¿No tienes cuenta? Regístrate"**
4. Completar:
   - **Nombre de la Empresa**: Tu Empresa SPA
   - **RUT de la Empresa**: 76.123.456-7
   - **Email**: tu@email.com
   - **Contraseña**: (mínimo 6 caracteres)
5. Click **"Crear Cuenta"**
6. Verás un mensaje: "✅ Cuenta creada! Por favor verifica tu email"
7. **Revisar tu email** (puede estar en spam)
8. Click en el link de verificación
9. **Volver a la app** e **iniciar sesión**

---

## 🎉 ¡Listo! Modo Multi-Usuario Activado

Ahora tu sistema:
- ✅ Usa base de datos PostgreSQL en la nube
- ✅ Soporta múltiples usuarios simultáneos
- ✅ Cada empresa tiene sus datos aislados (RLS)
- ✅ Autenticación segura con JWT
- ✅ Backup automático en Supabase
- ✅ Real-time sync (próximamente)

---

## 👥 Para Agregar Más Usuarios

### Admin puede invitar usuarios:

1. En Supabase Dashboard → **Authentication** → **Users**
2. Click **"Invite user"**
3. Ingresar email del nuevo usuario
4. Usuario recibirá email de invitación
5. Después, como Admin, debes ejecutar SQL para asignar rol:

```sql
INSERT INTO company_users (user_id, company_id, role)
VALUES (
  'user-uuid-aqui',  -- UUID del nuevo usuario (ver en Authentication > Users)
  'company-uuid-aqui',  -- UUID de tu empresa (ver en Table Editor > companies)
  'accountant'  -- o 'viewer' según rol
);
```

---

## 🔄 Migrar Datos Existentes (Opcional)

Si tienes datos en localStorage que quieres migrar a Supabase:

1. **Exportar** datos actuales:
   - Abrir DevTools (F12)
   - Console:
     ```javascript
     const data = {
       products: JSON.parse(localStorage.getItem('inventory_products') || '[]'),
       invoices: JSON.parse(localStorage.getItem('invoicing_db') || '[]'),
       journal: JSON.parse(localStorage.getItem('accounting_journal') || '[]')
     };
     console.log(JSON.stringify(data, null, 2));
     ```
   - Copiar el JSON

2. **Contacta conmigo** con ese JSON y te ayudo a importarlo a Supabase

---

## ⚠️ Troubleshooting

**Error: "Missing Supabase environment variables"**
- Verifica que `.env` existe en la raíz del proyecto
- Verifica que las variables empiezan con `VITE_`
- Reinicia el servidor (`npm run dev`)

**No veo la pantalla de login**
- Verifica que `.env` esté correctamente configurado
- Revisa la consola del navegador (F12) para errores

**"User already registered"**
- El email ya está en uso
- Usa otro email o resetea la password

**Emails no llegan**
- Revisa spam
- En Supabase: Settings → Auth → SMTP (puedes configurar tu propio servidor SMTP)

---

## 📊 Monitoreo

**Ver usuarios registrados**:
- Supabase Dashboard → Authentication → Users

**Ver datos**:
- Supabase Dashboard → Table Editor → seleccionar tabla

**Ver queries**:
- Supabase Dashboard → Database → Query Performance

---

## 💰 Límites del Plan Free

- ✅ 500 MB base de datos
- ✅ 1 GB bandwidth/mes
- ✅ 50 MB storage
- ✅ Autenticación ilimitada
- ✅ Real-time 2 conexiones simultáneas

**¿Cuándo upgradar a Pro ($25/mes)?**
- >500 MB de datos
- >2 usuarios simultáneos en tiempo real
- >1 GB de tráfico mensual
- Necesitas backups automáticos (punto-en-el-tiempo)

---

## 🆘 Soporte

Si tienes problemas:
1. Revisa logs en Supabase: Dashboard → Logs
2. Revisa consola del navegador (F12)
3. Pregúntame directamente

**¡Éxito con tu migración! 🚀**
