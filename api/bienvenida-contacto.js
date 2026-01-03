/**
 * VERCEL SERVERLESS FUNCTION: Email de Bienvenida
 * 
 * Endpoint: /api/bienvenida-contacto
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

/**
 * Envía email de bienvenida
 */
async function enviarBienvenidaEmail(contacto, usuario) {
  if (!contacto?.email || !usuario?.nombre) {
    return {
      success: false,
      error: 'Faltan datos obligatorios: email o nombre',
    };
  }

  if (!process.env.SENDGRID_API_KEY) {
    return {
      success: false,
      error: 'SendGrid no configurado. Agrega SENDGRID_API_KEY al archivo .env',
    };
  }

  const fromEmail = process.env.FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || 'no-reply@contigo.app';
  const subject = `${usuario.nombre} te agregó como persona de apoyo en Contigo`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #6B46C1; padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">
                Contigo App
              </h1>
              <p style="margin: 8px 0 0 0; color: white; font-size: 14px; opacity: 0.9;">
                Red de Apoyo
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                Hola${contacto.nombre ? ` <strong>${contacto.nombre}</strong>` : ''},
              </p>
              
              <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                <strong>${usuario.nombre}</strong> te agregó como persona de apoyo en <strong>Contigo</strong>, una app de bienestar emocional.
              </p>
              
              <div style="background-color: #F8F9FA; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #6B46C1;">
                <p style="margin: 0 0 12px 0; color: #333; font-size: 16px; line-height: 1.6; font-weight: 600;">
                  📋 ¿Qué significa esto?
                </p>
                <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.8;">
                  Recibirás avisos cuando <strong>${usuario.nombre}</strong> necesite apoyo emocional. Estos avisos son generales y respetuosos de la privacidad. No incluyen contenido personal ni conversaciones, solo señales de que podría necesitar acompañamiento.
                </p>
              </div>
              
              <div style="background-color: #F8F9FA; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #6B46C1;">
                <p style="margin: 0 0 12px 0; color: #333; font-size: 16px; line-height: 1.6; font-weight: 600;">
                  📬 ¿Cuándo recibirás avisos?
                </p>
                <ul style="margin: 8px 0; padding-left: 20px; color: #666; font-size: 14px; line-height: 1.8;">
                  <li>Cuando <strong>${usuario.nombre}</strong> lo solicite explícitamente</li>
                  <li>Si detectamos un patrón de malestar emocional persistente (con su consentimiento)</li>
                </ul>
              </div>
              
              <div style="background-color: #F0FDF4; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #10B981;">
                <p style="margin: 0 0 12px 0; color: #333; font-size: 16px; line-height: 1.6; font-weight: 600;">
                  💡 ¿Cómo acompañar?
                </p>
                <ul style="margin: 8px 0; padding-left: 20px; color: #666; font-size: 14px; line-height: 1.8;">
                  <li>Escuchar más que hablar</li>
                  <li>Evitar consejos rápidos o "soluciones mágicas"</li>
                  <li>Preguntar "¿cómo puedo acompañarte?" en lugar de "¿qué te pasa?"</li>
                  <li>Respetar su ritmo y espacio</li>
                </ul>
              </div>
              
              <div style="background-color: #FFF9E6; padding: 16px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #F59E0B;">
                <p style="margin: 0 0 8px 0; color: #92400E; font-size: 14px; line-height: 1.6; font-weight: 600;">
                  🔒 Privacidad
                </p>
                <p style="margin: 0; color: #92400E; font-size: 13px; line-height: 1.6;">
                  Contigo nunca comparte textos, conversaciones, audios, detalles personales específicos ni información médica. Solo enviamos señales generales de bienestar, siempre con el consentimiento explícito de <strong>${usuario.nombre}</strong>.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #F8F9FA; padding: 20px 30px; text-align: center; border-top: 1px solid #E9ECEF;">
              <p style="margin: 0 0 8px 0; color: #999; font-size: 13px; font-weight: 600;">
                Contigo App
              </p>
              <p style="margin: 0 0 4px 0; color: #999; font-size: 12px;">
                Tu compañero de bienestar emocional
              </p>
              <p style="margin: 8px 0 0 0; color: #999; font-size: 11px; line-height: 1.6;">
                Este mensaje no reemplaza atención profesional.<br>
                Si necesitás ayuda profesional, no dudes en buscarla.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Hola${contacto.nombre ? ` ${contacto.nombre}` : ''},

${usuario.nombre} te agregó como persona de apoyo en Contigo, una app de bienestar emocional.

📋 ¿Qué significa esto?

Recibirás avisos cuando ${usuario.nombre} necesite apoyo emocional. Estos avisos son:
- Generales y respetuosos de la privacidad
- No incluyen contenido personal ni conversaciones
- Solo señales de que podría necesitar acompañamiento

📬 ¿Cuándo recibirás avisos?

1. Cuando ${usuario.nombre} lo solicite explícitamente
2. Si detectamos un patrón de malestar emocional persistente (con su consentimiento)

💡 ¿Cómo acompañar?

- Escuchar más que hablar
- Evitar consejos rápidos o "soluciones mágicas"
- Preguntar "¿cómo puedo acompañarte?" en lugar de "¿qué te pasa?"
- Respetar su ritmo y espacio

🔒 Privacidad

Contigo nunca comparte:
- Textos o conversaciones
- Audios o grabaciones
- Detalles personales específicos
- Información médica o diagnósticos

Solo enviamos señales generales de bienestar, siempre con el consentimiento explícito de ${usuario.nombre}.

—

Este mensaje no reemplaza atención profesional.
Si ${usuario.nombre} necesita ayuda profesional, te recomendamos buscar apoyo especializado.

— Contigo App
Tu compañero de bienestar emocional`;

  try {
    const message = {
      to: contacto.email,
      from: {
        email: fromEmail,
        name: 'Contigo App',
      },
      replyTo: {
        email: fromEmail,
        name: 'Contigo - Soporte',
      },
      subject,
      text,
      html,
      headers: {
        'X-Entity-Ref-ID': 'contigo-bienvenida',
        'X-Mailer': 'Contigo App - Red de Apoyo',
      },
      categories: ['bienvenida', 'red-de-apoyo'],
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true },
      },
    };

    await sgMail.send(message);
    console.log('✅ Email de bienvenida enviado correctamente a:', contacto.email);
    return { success: true };
  } catch (error) {
    console.error('❌ Error enviando email de bienvenida:', error);
    
    let errorMessage = error.message || error.toString();
    
    if (error.response) {
      const errorBody = error.response.body;
      console.error('📋 Detalles del error de SendGrid:');
      console.error('   Status:', error.response.statusCode);
      console.error('   Body:', JSON.stringify(errorBody, null, 2));
      
      if (errorBody && errorBody.errors && errorBody.errors.length > 0) {
        errorMessage = errorBody.errors[0].message || errorMessage;
      }
      
      if (error.response.statusCode === 401) {
        errorMessage = 'Unauthorized: API Key incorrecta o email remitente no verificado. Verifica tu configuración en SendGrid.';
      } else if (error.response.statusCode === 403) {
        errorMessage = 'Forbidden: La API Key no tiene permisos suficientes. Verifica los permisos en SendGrid.';
      }
    }
    
    return {
      success: false,
      error: errorMessage,
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
    const { contacto, usuario } = req.body;

    // Validación
    if (!usuario?.nombre) {
      console.error('❌ Datos incompletos: falta usuario.nombre');
      return res.status(400).json({
        success: false,
        error: 'Falta usuario.nombre',
      });
    }

    if (!contacto?.email) {
      console.error('❌ Datos incompletos: falta contacto.email');
      return res.status(400).json({
        success: false,
        error: 'Falta contacto.email',
      });
    }

    // Log
    console.log(`📧 Enviando email de bienvenida:`);
    console.log(`   Usuario: ${usuario.nombre}`);
    console.log(`   Contacto: ${contacto.nombre || 'Sin nombre'} (${contacto.email})`);

    const results = { email: null, sms: null };

    // Enviar email de bienvenida
    const emailResult = await enviarBienvenidaEmail(contacto, usuario);
    results.email = emailResult;

    if (emailResult.success) {
      console.log(`✅ Email de bienvenida enviado a ${contacto.email}`);
    } else {
      console.error(`❌ Error enviando email de bienvenida: ${emailResult.error}`);
    }

    // Enviar SMS de bienvenida si hay teléfono
    if (contacto.telefono) {
      try {
        const smsBody = `Hola${contacto.nombre ? ` ${contacto.nombre}` : ''}, ${usuario.nombre} te agregó como persona de apoyo en Contigo. Recibirás avisos cuando necesite acompañamiento. — Contigo App`;
        const smsResult = await sendTwilioSMS({ to: contacto.telefono, body: smsBody });
        results.sms = smsResult;
        
        if (smsResult.success) {
          console.log(`✅ SMS de bienvenida enviado a ${contacto.telefono}`);
        } else {
          console.error(`❌ Error enviando SMS de bienvenida: ${smsResult.error}`);
        }
      } catch (smsError) {
        console.error('❌ Error enviando SMS de bienvenida:', smsError);
        results.sms = { success: false, error: smsError.message };
      }
    } else {
      console.log('ℹ️ No hay teléfono para enviar SMS de bienvenida');
    }

    // Responder con éxito si al menos uno funcionó
    const hasSuccess = results.email?.success || results.sms?.success;
    
    if (hasSuccess) {
      return res.json({
        success: true,
        results,
        timestamp: new Date().toISOString(),
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'No se pudo enviar ninguna notificación',
        results,
      });
    }
  } catch (error) {
    console.error('❌ Error en endpoint de bienvenida:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno',
    });
  }
}

