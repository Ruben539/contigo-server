/**
 * VERCEL SERVERLESS FUNCTION: Avisar Contacto
 * 
 * Endpoint: /api/avisar-contacto
 * 
 * Variables de entorno requeridas en Vercel:
 * - SENDGRID_API_KEY
 * - SENDGRID_FROM_EMAIL (o FROM_EMAIL)
 * - TWILIO_ACCOUNT_SID (opcional, para SMS)
 * - TWILIO_AUTH_TOKEN (opcional)
 * - TWILIO_MESSAGING_SERVICE_SID (opcional)
 */

import sgMail from '@sendgrid/mail';

// Configurar SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Formatea el número de teléfono al formato E.164 requerido por Twilio
 */
function formatPhoneNumber(phone) {
  if (!phone) return null;
  
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  if (cleaned.startsWith('+')) {
    if (cleaned.length >= 11) {
      return cleaned;
    }
  }
  
  // Si empieza con 0, probablemente es un número local (Paraguay)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
    return `+595${cleaned}`;
  }
  
  // Si no tiene + ni 0, asumir que es número local de Paraguay
  if (cleaned.length >= 9 && cleaned.length <= 10) {
    return `+595${cleaned}`;
  }
  
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

/**
 * Envía SMS vía Twilio
 */
async function sendTwilioSMS({ to, body }) {
  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_MESSAGING_SERVICE_SID,
  } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_MESSAGING_SERVICE_SID) {
    return {
      success: false,
      error: 'Twilio no configurado (variables de entorno faltantes)',
    };
  }

  try {
    const formattedPhone = formatPhoneNumber(to);
    console.log(`📱 Formateando teléfono: ${to} → ${formattedPhone}`);

    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: formattedPhone,
        MessagingServiceSid: TWILIO_MESSAGING_SERVICE_SID,
        Body: body,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('❌ Error Twilio:', data);
      return {
        success: false,
        error: data?.message || `Twilio error ${res.status}`,
      };
    }

    console.log(`✅ SMS enviado a ${formattedPhone} (SID: ${data.sid})`);
    return { success: true, sid: data.sid, status: data.status };
  } catch (error) {
    console.error('❌ Error enviando SMS:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido',
    };
  }
}

export default async function handler(req, res) {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { contacto, usuario, meta } = req.body || {};
    const type = meta?.type || 'persistent_mood'; // 'persistent_mood' | 'user_request'
    const score = meta?.score ?? null;

    if (!usuario?.nombre) {
      return res.status(400).json({ success: false, error: 'Falta usuario.nombre' });
    }

    if (!contacto?.email && !contacto?.telefono) {
      return res.status(400).json({ success: false, error: 'Falta contacto.email o contacto.telefono' });
    }

    // ===== Email (siempre que haya email) =====
    let emailResult = null;
    if (contacto.email) {
      const apiKey = process.env.SENDGRID_API_KEY;
      const fromEmail = process.env.FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL;
      
      if (!apiKey || !fromEmail) {
        return res.status(500).json({ success: false, error: 'SendGrid no configurado (env)' });
      }

      sgMail.setApiKey(apiKey);

      const subject =
        type === 'user_request'
          ? `${usuario.nombre} podría necesitar apoyo hoy`
          : `Aviso de bienestar de ${usuario.nombre}`;

      const text =
        type === 'user_request'
          ? `Hola${contacto.nombre ? ` ${contacto.nombre}` : ''},

${usuario.nombre} indicó que necesita apoyo emocional en este momento.
Sería bueno que puedas estar disponible.

— Contigo · Asistente de bienestar`
          : `Hola${contacto.nombre ? ` ${contacto.nombre}` : ''},

Contigo te escribe porque ${usuario.nombre} eligió que seas una persona de apoyo.

En los últimos días ha estado atravesando momentos emocionalmente difíciles.
No es una emergencia ni requiere una acción específica.

Tal vez una charla tranquila, a su ritmo, pueda ayudar.

💡 Cómo acompañar:
- Escuchar más que hablar
- Evitar consejos rápidos
- Preguntar "¿cómo puedo acompañarte?"

Privacidad: Contigo nunca comparte textos, audios ni detalles personales. Solo señales generales, con consentimiento.

— Contigo
Asistente de bienestar

Este mensaje no reemplaza atención profesional.
${usuario.nombre} configuró esta notificación voluntariamente.`;

      await sgMail.send({ 
        to: contacto.email, 
        from: {
          email: fromEmail,
          name: 'Contigo App',
        },
        subject, 
        text 
      });
      emailResult = { success: true };
    }

    // ===== SMS (solo en user_request y si está habilitado) =====
    let smsResult = null;

    const allowSMS = contacto?.notify_sms === true;
    const shouldSendSMS = type === 'user_request' && allowSMS && !!contacto?.telefono;

    if (shouldSendSMS) {
      const body = `Hola${contacto.nombre ? ` ${contacto.nombre}` : ''}, ${usuario.nombre} indicó que necesita apoyo emocional en este momento. Sería bueno que puedas estar disponible. — Contigo`;
      const r = await sendTwilioSMS({ to: contacto.telefono, body });
      smsResult = { success: true, ...r };
    }

    // ===== Logging mínimo (sin contenido sensible) =====
    console.log('[SUPPORT_NOTIFY]', {
      type,
      score,
      hasEmail: !!contacto?.email,
      hasPhone: !!contacto?.telefono,
      emailSent: !!emailResult,
      smsSent: !!smsResult,
      at: new Date().toISOString(),
    });

    const ok = !!emailResult || !!smsResult;

    return res.status(ok ? 200 : 502).json({
      success: ok,
      results: { email: emailResult, sms: smsResult },
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[ERROR]', e);
    return res.status(500).json({ success: false, error: e?.message || 'Error interno' });
  }
}

