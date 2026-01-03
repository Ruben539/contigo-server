/**
 * MÓDULO DE ENVÍO DE EMAILS
 * Usa SendGrid con la API Key configurada en .env
 */

import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

// Configurar SendGrid con la API Key del .env (si existe)
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('⚠️ SENDGRID_API_KEY no está configurada. Los emails no se enviarán.');
}

/**
 * Envía aviso por email a la persona de apoyo
 * @param {Object} contacto - { nombre, email }
 * @param {Object} usuario - { nombre }
 * @param {string} type - 'persistent_mood' | 'user_request' | 'info'
 */
export async function enviarAvisoEmail(contacto, usuario, type = 'persistent_mood') {
  // Validación básica
  if (!contacto?.email || !usuario?.nombre) {
    throw new Error('Faltan datos obligatorios: email o nombre');
  }
  
  // Verificar que SendGrid esté configurado
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('⚠️ SendGrid no está configurado. Email no se enviará.');
    return { 
      success: false, 
      error: 'SendGrid no está configurado. Agrega SENDGRID_API_KEY al archivo .env' 
    };
  }

  // Construir mensaje según tipo
  const isUserRequest = type === 'user_request';
  
  const subject = isUserRequest
    ? `${usuario.nombre} podría necesitar apoyo hoy`
    : `Información de bienestar de ${usuario.nombre}`;
  
  const text = isUserRequest
    ? `Hola${contacto.nombre ? ` ${contacto.nombre}` : ''},

${usuario.nombre} indicó que necesita apoyo emocional en este momento.
Sería bueno que puedas estar disponible.

💡 Cómo acompañar:
- Escuchar más que hablar
- Evitar consejos rápidos
- Preguntar "¿cómo puedo acompañarte?"

Privacidad: Contigo nunca comparte textos, audios ni detalles personales. Solo señales generales, con consentimiento.

— Contigo
Asistente de bienestar

Este mensaje no reemplaza atención profesional.
${usuario.nombre} configuró esta notificación voluntariamente.`
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

  // Construir mensaje con textos definitivos
  const fromEmail = process.env.FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || 'no-reply@contigo.app';
  const replyTo = process.env.REPLY_TO_EMAIL || fromEmail;
  
  const message = {
    to: contacto.email,
    from: {
      email: fromEmail,
      name: 'Contigo App', // Nombre profesional y consistente
    },
    replyTo: {
      email: replyTo,
      name: 'Contigo - Soporte',
    },
    subject,
    text,

    // HTML profesional (adaptado según tipo)
    html: isUserRequest
      ? `
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
            <td style="background-color: #DC2626; padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">
                Contigo
              </h1>
              <p style="margin: 8px 0 0 0; color: white; font-size: 14px; opacity: 0.9;">
                Solicitud de apoyo
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
                <strong>${usuario.nombre}</strong> indicó que necesita apoyo emocional en este momento.
              </p>
              
              <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                Sería bueno que puedas estar disponible.
              </p>
              
              <div style="background-color: #F8F9FA; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #DC2626;">
                <p style="margin: 0 0 8px 0; color: #666; font-size: 14px; line-height: 1.6; font-weight: 600;">
                  💡 Cómo acompañar:
                </p>
                <ul style="margin: 8px 0; padding-left: 20px; color: #666; font-size: 14px; line-height: 1.8;">
                  <li>Escuchar más que hablar</li>
                  <li>Evitar consejos rápidos</li>
                  <li>Preguntar "¿cómo puedo acompañarte?"</li>
                </ul>
              </div>
              
              <div style="background-color: #FFF9E6; padding: 16px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #F59E0B;">
                <p style="margin: 0; color: #92400E; font-size: 13px; line-height: 1.6;">
                  <strong>Privacidad:</strong> Contigo nunca comparte textos, audios ni detalles personales. Solo señales generales, con consentimiento.
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
              <p style="margin: 8px 0 0 0; color: #999; font-size: 12px;">
                ${usuario.nombre} configuró esta notificación voluntariamente
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim()
      : `
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
                Contigo
              </h1>
              <p style="margin: 8px 0 0 0; color: white; font-size: 14px; opacity: 0.9;">
                Asistente de bienestar
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
                Contigo te escribe porque <strong>${usuario.nombre}</strong> eligió que seas una persona de apoyo.
              </p>
              
              <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                En los últimos días ha estado atravesando momentos emocionalmente difíciles.<br>
                <strong>No es una emergencia ni requiere una acción específica.</strong>
              </p>
              
              <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                Tal vez una charla tranquila, a su ritmo, pueda ayudar.
              </p>
              
              <div style="background-color: #F8F9FA; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #6B46C1;">
                <p style="margin: 0 0 8px 0; color: #666; font-size: 14px; line-height: 1.6; font-weight: 600;">
                  💡 Cómo acompañar:
                </p>
                <ul style="margin: 8px 0; padding-left: 20px; color: #666; font-size: 14px; line-height: 1.8;">
                  <li>Escuchar más que hablar</li>
                  <li>Evitar consejos rápidos</li>
                  <li>Preguntar "¿cómo puedo acompañarte?"</li>
                </ul>
              </div>
              
              <div style="background-color: #FFF9E6; padding: 16px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #F59E0B;">
                <p style="margin: 0; color: #92400E; font-size: 13px; line-height: 1.6;">
                  <strong>Privacidad:</strong> Contigo nunca comparte textos, audios ni detalles personales. Solo señales generales, con consentimiento.
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
              <p style="margin: 8px 0 0 0; color: #999; font-size: 12px;">
                ${usuario.nombre} configuró esta notificación voluntariamente
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim()
  };
  
  // Agregar headers y categorías para mejorar deliverabilidad
  message.headers = {
    'X-Entity-Ref-ID': 'contigo-notificacion',
  };
  message.categories = ['notificacion', 'red-de-apoyo'];

  try {
    await sgMail.send(message);
    console.log('✅ Email enviado correctamente a:', contacto.email);
    return { success: true };
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    
    // Información detallada del error para debugging
    if (error.response) {
      console.error('Detalles del error de SendGrid:', error.response.body);
    }
    
    return { 
      success: false, 
      error: error.message || error.toString() 
    };
  }
}

/**
 * Envía email de bienvenida cuando se agrega una persona de apoyo
 * @param {Object} contacto - { nombre, email }
 * @param {Object} usuario - { nombre }
 */
export async function enviarBienvenidaEmail(contacto, usuario) {
  if (!contacto?.email || !usuario?.nombre) {
    throw new Error('Faltan datos obligatorios: email o nombre');
  }
  
  // Verificar que SendGrid esté configurado
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('⚠️ SendGrid no está configurado. Email de bienvenida no se enviará.');
    return { 
      success: false, 
      error: 'SendGrid no está configurado. Agrega SENDGRID_API_KEY al archivo .env' 
    };
  }

  const subject = `${usuario.nombre} te agregó como persona de apoyo en Contigo`;
  
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

— Contigo
Asistente de bienestar`;

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
                Contigo
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

  const fromEmail = process.env.FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || 'no-reply@contigo.app';
  const replyTo = process.env.REPLY_TO_EMAIL || fromEmail;
  
  const message = {
    to: contacto.email,
    from: {
      email: fromEmail,
      name: 'Contigo App', // Nombre profesional y consistente
    },
    replyTo: {
      email: replyTo,
      name: 'Contigo - Soporte',
    },
    subject,
    text,
    html,
    // Headers adicionales para mejorar deliverabilidad
    headers: {
      'X-Entity-Ref-ID': 'contigo-bienvenida',
      'X-Mailer': 'Contigo App - Red de Apoyo',
      'List-Unsubscribe': '<mailto:unsubscribe@contigo.app>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
    // Categorías para tracking en SendGrid
    categories: ['bienvenida', 'red-de-apoyo'],
    // Configuración de tracking (opcional, pero ayuda con reputación)
    trackingSettings: {
      clickTracking: {
        enable: true,
      },
      openTracking: {
        enable: true,
      },
    },
  };

  try {
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
      
      // Extraer mensaje más específico del error
      if (errorBody && errorBody.errors && errorBody.errors.length > 0) {
        errorMessage = errorBody.errors[0].message || errorMessage;
      }
      
      // Mensajes específicos según el código de error
      if (error.response.statusCode === 401) {
        errorMessage = 'Unauthorized: API Key incorrecta o email remitente no verificado. Verifica tu configuración en SendGrid.';
      } else if (error.response.statusCode === 403) {
        errorMessage = 'Forbidden: La API Key no tiene permisos suficientes. Verifica los permisos en SendGrid.';
      }
    }
    
    return { 
      success: false, 
      error: errorMessage
    };
  }
}

