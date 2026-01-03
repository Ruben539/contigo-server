/**
 * MÓDULO DE ENVÍO DE SMS
 * Usa Twilio con las credenciales configuradas en .env
 */

import dotenv from 'dotenv';

dotenv.config();

/**
 * Envía SMS a la persona de apoyo
 * @param {Object} contacto - { nombre, telefono }
 * @param {Object} usuario - { nombre }
 * @param {string} tipo - 'bienvenida' | 'persistent_mood' | 'user_request' (opcional, por defecto 'persistent_mood')
 */
export async function sendSMS(contacto, usuario, tipo = 'persistent_mood') {
  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_MESSAGING_SERVICE_SID,
  } = process.env;

  // Validación
  if (!contacto?.telefono || !usuario?.nombre) {
    throw new Error('Faltan datos obligatorios: telefono o nombre');
  }

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_MESSAGING_SERVICE_SID) {
    return {
      success: false,
      error: 'Twilio no configurado (variables de entorno faltantes)',
    };
  }

  /**
   * Formatea el número de teléfono al formato E.164 requerido por Twilio
   * Formato: +[código país][número sin espacios ni guiones]
   * Ejemplos:
   * - 0972495723 (Paraguay) → +595972495723
   * - +5491123456789 (Argentina) → +5491123456789 (ya está bien)
   * - 09123456789 (Paraguay sin +) → +5959123456789
   */
  function formatPhoneNumber(phone) {
    // Remover espacios, guiones y paréntesis
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');
    
    // Si ya tiene +, verificar que esté bien formateado
    if (cleaned.startsWith('+')) {
      // Ya está en formato internacional, solo verificar que tenga al menos 10 dígitos después del +
      if (cleaned.length >= 11) {
        return cleaned;
      }
    }
    
    // Si empieza con 0, probablemente es un número local
    // Paraguay: código de país +595
    if (cleaned.startsWith('0')) {
      // Remover el 0 inicial y agregar código de país de Paraguay
      cleaned = cleaned.substring(1);
      return `+595${cleaned}`;
    }
    
    // Si no tiene + ni 0, asumir que es número local de Paraguay
    if (cleaned.length >= 9 && cleaned.length <= 10) {
      return `+595${cleaned}`;
    }
    
    // Si tiene 9-10 dígitos sin código de país, agregar +595 (Paraguay)
    // Nota: Puedes ajustar esto según tu país
    if (cleaned.length >= 9 && cleaned.length <= 10 && !cleaned.startsWith('+')) {
      return `+595${cleaned}`;
    }
    
    // Si ya tiene código de país pero sin +, agregarlo
    if (cleaned.length > 10 && !cleaned.startsWith('+')) {
      return `+${cleaned}`;
    }
    
    // Retornar tal cual si no se puede formatear
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    // Formatear número de teléfono
    const formattedPhone = formatPhoneNumber(contacto.telefono);
    console.log(`📱 Formateando teléfono: ${contacto.telefono} → ${formattedPhone}`);

    // Mensaje según el tipo
    let body;
    
    if (tipo === 'bienvenida') {
      body = `Hola${contacto.nombre ? ` ${contacto.nombre}` : ''}, ${usuario.nombre} te agregó como persona de apoyo en Contigo, una app de bienestar emocional.

📋 Recibirás avisos cuando ${usuario.nombre} necesite acompañamiento. Estos avisos son generales y respetuosos de la privacidad.

📬 Cuándo recibirás avisos:
- Cuando ${usuario.nombre} lo solicite explícitamente
- Si detectamos un patrón de malestar emocional persistente (con su consentimiento)

💡 Cómo acompañar:
- Escuchar más que hablar
- Evitar consejos rápidos
- Preguntar "¿cómo puedo acompañarte?"

🔒 Privacidad: Contigo nunca comparte textos, audios ni detalles personales. Solo señales generales, siempre con consentimiento.

Este mensaje no reemplaza atención profesional.

— Contigo App`;
    } else {
      // Determinar el tipo de alerta desde el parámetro tipo
      // tipo puede ser: 'persistent_mood' | 'user_request' | 'alerta' (legacy)
      const alertType = tipo === 'user_request' ? 'user_request' : 'persistent_mood';
      
      if (alertType === 'user_request') {
        body = `Hola${contacto.nombre ? ` ${contacto.nombre}` : ''}, ${usuario.nombre} indicó que necesita apoyo emocional en este momento.

Sería bueno que puedas estar disponible.

💡 Cómo acompañar:
- Escuchar más que hablar
- Evitar consejos rápidos
- Preguntar "¿cómo puedo acompañarte?"

🔒 Privacidad: Contigo nunca comparte textos, audios ni detalles personales. Solo señales generales, con consentimiento.

Este mensaje no reemplaza atención profesional.

— Contigo App`;
      } else {
        // persistent_mood
        body = `Hola${contacto.nombre ? ` ${contacto.nombre}` : ''}, Contigo te escribe porque ${usuario.nombre} eligió que seas una persona de apoyo.

En los últimos días ha estado atravesando momentos emocionalmente difíciles. No es una emergencia ni requiere una acción específica.

Tal vez una charla tranquila, a su ritmo, pueda ayudar.

💡 Cómo acompañar:
- Escuchar más que hablar
- Evitar consejos rápidos
- Preguntar "¿cómo puedo acompañarte?"

🔒 Privacidad: Contigo nunca comparte textos, audios ni detalles personales. Solo señales generales, con consentimiento.

Este mensaje no reemplaza atención profesional.

— Contigo App`;
      }
    }

    const response = await fetch(url, {
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

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('❌ Error Twilio:', data);
      return {
        success: false,
        error: data?.message || `Twilio error ${response.status}`,
      };
    }

    console.log(`✅ SMS enviado a ${formattedPhone} (SID: ${data.sid})`);

    return {
      success: true,
      sid: data.sid,
      status: data.status,
    };
  } catch (error) {
    console.error('❌ Error enviando SMS:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido',
    };
  }
}
