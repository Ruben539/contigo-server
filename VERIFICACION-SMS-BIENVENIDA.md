# ✅ Verificación: SMS al Registrar Persona de Apoyo

## 📋 Flujo Completo

### 1. **Frontend (React Native)**

**Archivo:** `services/support-network-ethical.ts`
- ✅ Llama a `sendWelcomeEmail()` cuando se guarda un contacto
- ✅ Pasa el objeto `contact` que incluye `phone`

**Archivo:** `services/notifications-support.ts`
- ✅ Función `sendWelcomeEmail()` prepara los datos
- ✅ Envía `contacto.telefono` al backend (línea 473)
- ✅ Hace POST a `/api/bienvenida-contacto`

```typescript
const contactoData = {
  nombre: contact.name,
  email: contact.email,
  telefono: contact.phone || '', // ✅ Se envía el teléfono
};
```

### 2. **Backend (Vercel/Express)**

**Archivo:** `contigo-server/server.js` (líneas 180-279)
- ✅ Recibe `contacto.telefono` en el body
- ✅ Valida que haya email (línea 193)
- ✅ **ENVÍA SMS si hay teléfono** (líneas 232-254)

```javascript
// Enviar SMS de bienvenida si hay teléfono
if (contacto.telefono && contacto.telefono.trim() !== '') {
  try {
    console.log(`📱 Intentando enviar SMS de bienvenida a: ${contacto.telefono}`);
    const { sendSMS } = await import('./sendSMS.js');
    const smsResult = await sendSMS(contacto, usuario, 'bienvenida');
    results.sms = smsResult;
    // ...
  }
}
```

**Archivo:** `contigo-server/api/bienvenida-contacto.js` (líneas 376-394)
- ✅ También tiene lógica para enviar SMS
- ✅ Verifica `contacto.telefono` antes de enviar

### 3. **Módulo SMS**

**Archivo:** `contigo-server/sendSMS.js`
- ✅ Función `sendSMS()` acepta tipo 'bienvenida'
- ✅ Formatea el número de teléfono (E.164)
- ✅ Envía SMS vía Twilio
- ✅ Tiene mensaje específico para bienvenida (líneas 109-127)

---

## ✅ Estado: **PREPARADO Y FUNCIONAL**

### **El código SÍ está preparado para enviar SMS:**

1. ✅ Frontend envía el teléfono al backend
2. ✅ Backend recibe y valida el teléfono
3. ✅ Backend llama a `sendSMS()` con tipo 'bienvenida'
4. ✅ `sendSMS.js` tiene mensaje específico para bienvenida
5. ✅ Se envía SMS vía Twilio si hay teléfono

---

## 🔍 Verificaciones Necesarias

### **1. Variables de Entorno en Vercel**

Asegúrate de tener configuradas:
```
TWILIO_ACCOUNT_SID=ACxxxxx...
TWILIO_AUTH_TOKEN=xxxxx...
TWILIO_MESSAGING_SERVICE_SID=MGxxxxx...
```

### **2. El teléfono se está enviando desde el frontend**

Verifica en los logs del backend:
```
📧 Enviando email de bienvenida:
   Teléfono: [debería mostrar el número]
```

Si muestra "NO PROPORCIONADO", el problema está en el frontend.

### **3. El teléfono tiene formato correcto**

El código formatea automáticamente:
- `0972495723` → `+595972495723` (Paraguay)
- `+5491123456789` → `+5491123456789` (ya está bien)

---

## 🐛 Posibles Problemas

### **Problema 1: Teléfono no se envía desde frontend**

**Síntoma:** Backend recibe `telefono: ''` o `undefined`

**Solución:** Verificar que `contact.phone` tenga valor en `support-network-ethical.ts`

### **Problema 2: Twilio no configurado**

**Síntoma:** Error "Twilio no configurado (variables de entorno faltantes)"

**Solución:** Agregar variables de entorno en Vercel

### **Problema 3: Formato de teléfono incorrecto**

**Síntoma:** Error de Twilio sobre formato de número

**Solución:** El código ya formatea automáticamente, pero verificar que el número original sea válido

---

## 📝 Logs a Revisar

### **En el Backend (Vercel logs):**

```
📧 Enviando email de bienvenida:
   Usuario: [nombre]
   Contacto: [nombre] ([email])
   Teléfono: [número o NO PROPORCIONADO]  ← IMPORTANTE
```

Si muestra "NO PROPORCIONADO", el teléfono no está llegando.

### **Si el teléfono llega:**

```
📱 Intentando enviar SMS de bienvenida a: [número]
📱 Formateando teléfono: [original] → [formateado]
✅ SMS enviado a [número] (SID: [sid])
```

---

## ✅ Conclusión

**El código ESTÁ preparado para enviar SMS al registrar persona de apoyo.**

Si no se está enviando, verificar:
1. ✅ Variables de entorno de Twilio en Vercel
2. ✅ Que el teléfono se esté enviando desde el frontend
3. ✅ Logs del backend para ver qué está pasando

---

**Última verificación:** 2025-01-XX

