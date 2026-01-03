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
  console.log(`📱 sendSMS - Validando datos:`, {
    tieneTelefono: !!contacto?.telefono,
    telefono: contacto?.telefono || 'NO PROPORCIONADO',
    tieneNombre: !!usuario?.nombre,
    nombre: usuario?.nombre || 'NO PROPORCIONADO',
    tipo: tipo,
  });

  if (!contacto?.telefono || !usuario?.nombre) {
    const errorMsg = `Faltan datos obligatorios: telefono=${!!contacto?.telefono}, nombre=${!!usuario?.nombre}`;
    console.error(`❌ ${errorMsg}`);
    throw new Error(errorMsg);
  }

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_MESSAGING_SERVICE_SID) {
    console.error(`❌ Twilio no configurado:`, {
      tieneAccountSid: !!TWILIO_ACCOUNT_SID,
      tieneAuthToken: !!TWILIO_AUTH_TOKEN,
      tieneMessagingServiceSid: !!TWILIO_MESSAGING_SERVICE_SID,
    });
    return {
      success: false,
      error: 'Twilio no configurado (variables de entorno faltantes). Verifica TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_MESSAGING_SERVICE_SID en Vercel.',
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

    // Mensajes éticos según nivel (optimizados para SMS - máximo 160 caracteres recomendado)
    // Respetando los 3 niveles: 'bienvenida' | 'persistent_mood' | 'user_request'
    let body;
    
    switch (tipo) {
      case 'bienvenida':
        // Nivel 1: Informativo (bienvenida)
        body = `Hola${contacto.nombre ? ` ${contacto.nombre}` : ''}, ${usuario.nombre} te agregó como contacto de apoyo en la app Contigo. No necesitás hacer nada ahora.`;
        break;

      case 'persistent_mood':
        // Nivel 2: Mood persistente (con consentimiento explícito)
        body = `Hola${contacto.nombre ? ` ${contacto.nombre}` : ''}, ${usuario.nombre} ha estado atravesando días emocionalmente difíciles y aceptó que se te avise.`;
        break;

      case 'user_request':
        // Nivel 3: Solicitud explícita (urgente)
        body = `Hola${contacto.nombre ? ` ${contacto.nombre}` : ''}, ${usuario.nombre} solicitó apoyo y aceptó que se te avise. Si podés, contactalo.`;
        break;

      case 'info':
        // Nivel 1: Informativo (una sola vez)
        body = `Hola${contacto.nombre ? ` ${contacto.nombre}` : ''}, ${usuario.nombre} está usando Contigo y eligió que seas contacto de apoyo. No requiere acción.`;
        break;

      default:
        // Fallback
        body = `${usuario.nombre} te envió un aviso desde Contigo.`;
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
