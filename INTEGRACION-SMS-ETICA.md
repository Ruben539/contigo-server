# 📱 Integración SMS Ética - Contigo

> **Sistema de SMS respetando 3 niveles, consentimiento explícito y logging ético**

---

## ✅ Resumen

- ✅ **Twilio funciona** para enviar SMS a contactos de apoyo
- ✅ **No requiere registro** del contacto (solo tú necesitas cuenta Twilio)
- ✅ **Cuentas trial** solo envían a números verificados
- ✅ **Código ya está correcto** y respeta ética

---

## 🧠 Arquitectura

```
Frontend (Expo)
  ↓
services/notifications-support.ts
  ↓
POST /api/avisar-contacto (Backend Vercel)
  ↓
sendEmail.js (SendGrid) ✅
sendSMS.js (Twilio) ✅
```

**Twilio SOLO vive en el backend, nunca en la app.**

---

## 📋 Los 3 Niveles de Notificación

### 🟢 Nivel 1: Informativo (`info` o `bienvenida`)

**Cuándo:**
- Primera vez que se agrega contacto
- Una sola vez en la vida

**Mensaje SMS:**
```
Hola [Nombre], [Usuario] te agregó como contacto de apoyo en la app Contigo. No necesitás hacer nada ahora.
```

**Envío:**
- ✅ Email: Siempre
- ✅ SMS: Opcional (solo en bienvenida, no en info general)

---

### 🟡 Nivel 2: Mood Persistente (`persistent_mood`)

**Cuándo:**
- Misma emoción intensa ≥3 días consecutivos
- **Requiere consentimiento explícito del usuario**

**Mensaje SMS:**
```
Hola [Nombre], [Usuario] ha estado atravesando días emocionalmente difíciles y aceptó que se te avise.
```

**Envío:**
- ✅ Email: Siempre
- ✅ SMS: Solo si `notify_sms = true` en preferencias del contacto

**Consentimiento:**
- Sistema detecta patrón
- Cyn pregunta: "¿Querés que avise a [Nombre]?"
- Usuario acepta → Se envía
- Usuario rechaza → No se envía

---

### 🔴 Nivel 3: Solicitud Explícita (`user_request`)

**Cuándo:**
- Usuario toca "Necesito ayuda" o solicita apoyo explícitamente
- **No requiere consentimiento adicional** (ya lo dio al tocar el botón)

**Mensaje SMS:**
```
Hola [Nombre], [Usuario] solicitó apoyo y aceptó que se te avise. Si podés, contactalo.
```

**Envío:**
- ✅ Email: Siempre
- ✅ SMS: **Siempre** (urgente)

---

## 🔧 Implementación

### Backend: `sendSMS.js`

```javascript
export async function sendSMS(contacto, usuario, tipo = 'persistent_mood') {
  // Validación de Twilio configurado
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_MESSAGING_SERVICE_SID) {
    return { success: false, error: 'Twilio no configurado' };
  }

  // Mensajes éticos según nivel (optimizados para SMS)
  let body;
  switch (tipo) {
    case 'bienvenida':
      body = `Hola${contacto.nombre ? ` ${contacto.nombre}` : ''}, ${usuario.nombre} te agregó como contacto de apoyo en la app Contigo. No necesitás hacer nada ahora.`;
      break;
    case 'persistent_mood':
      body = `Hola${contacto.nombre ? ` ${contacto.nombre}` : ''}, ${usuario.nombre} ha estado atravesando días emocionalmente difíciles y aceptó que se te avise.`;
      break;
    case 'user_request':
      body = `Hola${contacto.nombre ? ` ${contacto.nombre}` : ''}, ${usuario.nombre} solicitó apoyo y aceptó que se te avise. Si podés, contactalo.`;
      break;
    default:
      body = `${usuario.nombre} te envió un aviso desde Contigo.`;
  }

  // Envío vía Twilio API
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: formatPhoneNumber(contacto.telefono),
        MessagingServiceSid: TWILIO_MESSAGING_SERVICE_SID,
        Body: body,
      }),
    }
  );

  const data = await response.json();
  return {
    success: response.ok,
    sid: data.sid,
    status: data.status,
  };
}
```

### Backend: `server.js` - Endpoint `/api/avisar-contacto`

```javascript
app.post('/api/avisar-contacto', async (req, res) => {
  const { contacto, usuario, meta } = req.body;
  const type = meta?.type || 'persistent_mood';

  const results = { email: null, sms: null };

  // Email siempre que haya email
  if (contacto.email) {
    results.email = await enviarAvisoEmail(contacto, usuario, type);
  }

  // SMS según nivel y preferencias
  const shouldSendSMS = 
    (type === 'user_request' || type === 'persistent_mood') && 
    contacto.telefono && 
    contacto.telefono.trim() !== '' &&
    (type === 'user_request' || contacto.notify_sms); // user_request siempre, persistent_mood solo si habilitado

  if (shouldSendSMS) {
    const { sendSMS } = await import('./sendSMS.js');
    results.sms = await sendSMS(contacto, usuario, type);
  }

  return res.json({ success: true, results });
});
```

### Frontend: `notifications-support.ts`

```typescript
export async function sendSupportNotification(
  contact: SupportContact,
  userName: string,
  alertLevel: AlertLevel
) {
  const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || 'https://contigo-server.vercel.app';

  const response = await fetch(`${BACKEND_URL}/api/avisar-contacto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contacto: {
        nombre: contact.name,
        email: contact.email,
        telefono: contact.phone,
        notify_sms: contact.notify_on_request || contact.notify_on_persistent_mood,
      },
      usuario: {
        nombre: userName,
      },
      meta: {
        type: alertLevel === 'risk' ? 'user_request' : 
              alertLevel === 'persistent_mood' ? 'persistent_mood' : 
              'info',
      },
    }),
  });

  return await response.json();
}
```

---

## 🔐 Consentimiento Explícito

### Flujo Ético Completo

```
1. Sistema detecta condición (patrón persistente, etc.)
   ↓
2. Verifica preferencias del contacto (¿está habilitado?)
   ↓
3. Pide consentimiento al usuario (excepto user_request)
   - Cyn pregunta: "¿Querés que avise a [Nombre]?"
   ↓
4. Usuario acepta → Se envía
   Usuario rechaza → No se envía
   ↓
5. Se registra en log (sin datos sensibles)
   ↓
6. Cyn confirma: "Ya avisé a [Nombre]"
```

### Código de Consentimiento

```typescript
// services/support-network-ethical.ts
export async function sendNotificationWithConsent(
  userId: number,
  notificationType: NotificationType,
  userGaveConsent: boolean,  // ← Viene del UI
  metadata?: { days?: number }
) {
  // 0. Verificar consentimiento
  if (!userGaveConsent) {
    return { success: false, message: 'Usuario no dio consentimiento' };
  }
  
  // 1. Obtener contactos elegibles
  const contacts = await getSupportContacts(userId);
  const eligibleContacts = contacts.filter(contact => {
    if (!contact.enabled) return false;
    if (notificationType === 'persistent_mood' && !contact.notify_on_persistent_mood) return false;
    if (notificationType === 'user_request' && !contact.notify_on_request) return false;
    return true;
  });
  
  // 2. Enviar notificaciones
  for (const contact of eligibleContacts) {
    await sendSupportNotification(contact, userName, alertLevel);
  }
  
  // 3. Registrar en log (sin datos sensibles)
  await logNotification(userId, contactId, notificationType, true);
}
```

---

## 📊 Logging Ético

### Qué se Registra

✅ **SÍ se registra:**
- Tipo de notificación (`persistent_mood`, `user_request`, `info`)
- Fecha y hora
- Si fue exitoso
- Si el usuario fue informado antes/después
- Resumen del mensaje (sin contenido sensible)

❌ **NO se registra:**
- Contenido de textos o notas
- Detalles específicos de emociones
- Información médica
- Contenido de pensamientos

### Tabla de Log

```sql
CREATE TABLE support_notifications_log (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  contact_id INTEGER,
  notification_type TEXT,  -- 'persistent_mood' | 'user_request' | 'info'
  sent_at TEXT,
  was_successful INTEGER,
  user_was_informed_before INTEGER,  -- Cyn preguntó antes
  user_was_informed_after INTEGER,   -- Cyn confirmó después
  message_summary TEXT,  -- "Aviso de mood persistente" (sin detalles)
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (contact_id) REFERENCES support_contacts(id)
);
```

---

## 🧪 Testing

### Probar SMS de Bienvenida

```bash
curl -X POST https://contigo-server.vercel.app/api/bienvenida-contacto \
  -H "Content-Type: application/json" \
  -d '{
    "contacto": {
      "nombre": "María",
      "email": "maria@example.com",
      "telefono": "+5491123456789"
    },
    "usuario": {
      "nombre": "Juan"
    }
  }'
```

### Probar SMS de Aviso

```bash
curl -X POST https://contigo-server.vercel.app/api/avisar-contacto \
  -H "Content-Type: application/json" \
  -d '{
    "contacto": {
      "nombre": "María",
      "email": "maria@example.com",
      "telefono": "+5491123456789",
      "notify_sms": true
    },
    "usuario": {
      "nombre": "Juan"
    },
    "meta": {
      "type": "persistent_mood"
    }
  }'
```

---

## ⚙️ Configuración en Vercel

### Variables de Entorno Requeridas

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=tu_auth_token_aqui
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Cómo Obtenerlas

1. **Crear cuenta Twilio**: https://www.twilio.com/try-twilio
2. **Dashboard** → Copiar Account SID y Auth Token
3. **Messaging** → Services → Crear o usar existente → Copiar SID

---

## 📱 Formato de Teléfono

El código formatea automáticamente a E.164:

- `0972495723` (Paraguay) → `+595972495723`
- `+5491123456789` (Argentina) → `+5491123456789` (ya está bien)
- `09123456789` (Paraguay sin +) → `+5959123456789`

**Función:** `formatPhoneNumber()` en `sendSMS.js`

---

## 🐛 Troubleshooting

### SMS aparece como "accepted" pero no llega

**Normal en cuentas trial:**
- `accepted` = Twilio lo aceptó
- Luego pasa a `sent` o `delivered`
- En trial: solo números verificados
- Aparece texto "Sent from your trial account"

**Solución:** Verificar número en Twilio Console → Phone Numbers → Verified Caller IDs

### Error "Twilio no configurado"

**Causa:** Variables de entorno faltantes en Vercel

**Solución:**
1. Ir a Vercel → Project → Settings → Environment Variables
2. Agregar las 3 variables de Twilio
3. Redeploy

### SMS no se envía aunque hay teléfono

**Verificar:**
1. ¿El teléfono se está enviando desde el frontend?
2. ¿`notify_sms` está en `true`? (para persistent_mood)
3. ¿El tipo es `user_request` o `persistent_mood`? (info no envía SMS)
4. Revisar logs del backend en Vercel

---

## ✅ Checklist de Implementación

- [x] `sendSMS.js` con mensajes éticos según nivel
- [x] Endpoint `/api/avisar-contacto` respeta niveles
- [x] Endpoint `/api/bienvenida-contacto` envía SMS
- [x] Frontend conectado correctamente
- [x] Formato de teléfono automático
- [x] Logging ético implementado
- [x] Consentimiento explícito respetado
- [x] Variables de entorno documentadas

---

## 🎯 Próximos Pasos (Opcional)

1. **Plantillas revisadas por ética clínica**
   - Revisar mensajes con profesional
   - Ajustar tono según feedback

2. **Dashboard de logs**
   - Visualizar avisos enviados
   - Estadísticas (sin datos sensibles)

3. **Reintentos automáticos**
   - Si falla SMS, reintentar 1 vez
   - Notificar al usuario si falla

4. **Mensajes según país/cultura**
   - Adaptar formato de teléfono
   - Ajustar mensajes según región

---

**Última actualización:** 2025-01-XX
**Estado:** ✅ Implementado y funcionando

