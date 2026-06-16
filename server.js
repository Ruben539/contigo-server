/**
 * BACKEND PARA CONTIGO - Envío de notificaciones
 * 
 * Usa SendGrid para enviar emails a la Red de Apoyo
 * 
 * INSTALACIÓN:
 * npm install
 * 
 * CONFIGURACIÓN:
 * 1. Crear archivo .env con SENDGRID_API_KEY y FROM_EMAIL
 * 2. Ejecutar: npm start
 */

import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { enviarAvisoEmail, enviarBienvenidaEmail } from './sendEmail.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Permitir requests desde React Native
app.use(express.json());

// ═══════════════════════════════════════════════════════
// ENDPOINT: Enviar aviso a persona de apoyo
// ═══════════════════════════════════════════════════════

app.post('/api/avisar-contacto', async (req, res) => {
  try {
    const { contacto, usuario, meta } = req.body;
    const type = meta?.type || 'persistent_mood'; // 'persistent_mood' | 'user_request' | 'info'

    // Validación
    if (!usuario?.nombre) {
      console.error('❌ Datos incompletos: falta usuario.nombre');
      return res.status(400).json({
        success: false,
        error: 'Falta usuario.nombre',
      });
    }

    if (!contacto?.email && !contacto?.telefono) {
      console.error('❌ Datos incompletos: falta contacto.email o contacto.telefono');
      return res.status(400).json({
        success: false,
        error: 'Falta contacto.email o contacto.telefono',
      });
    }

    // Log
    console.log(`📨 Solicitud de envío:`);
    console.log(`   Usuario: ${usuario.nombre}`);
    console.log(`   Tipo: ${type}`);
    console.log(`   Email: ${contacto.email || 'N/A'}`);
    console.log(`   Teléfono: ${contacto.telefono || 'N/A'}`);
    console.log(`   SMS habilitado: ${contacto.notify_sms || false}`);

    const results = { email: null, sms: null };

    // Enviar email (siempre que haya email)
    if (contacto.email) {
      const emailResult = await enviarAvisoEmail(contacto, usuario, type);
      results.email = emailResult;
      
      if (emailResult.success) {
        console.log(`✅ [LOG] Email enviado a ${contacto.email}`);
      } else {
        console.error(`❌ [ERROR] Fallo envío email: ${emailResult.error}`);
      }
    }

    // Enviar SMS según nivel de notificación
    // Reglas éticas:
    // - Nivel 1 (info): NO SMS (solo email)
    // - Nivel 2 (persistent_mood): SMS si está habilitado Y hay teléfono
    // - Nivel 3 (user_request): SMS siempre (urgente)
    const shouldSendSMS = 
      (type === 'user_request' || type === 'persistent_mood') && 
      contacto.telefono && 
      contacto.telefono.trim() !== '' &&
      (type === 'user_request' || contacto.notify_sms); // En user_request siempre, en persistent_mood solo si está habilitado
    
    if (shouldSendSMS) {
      try {
        console.log(`📱 Enviando SMS (tipo: ${type}) a ${contacto.telefono}...`);
        // Importar sendSMS dinámicamente
        const { sendSMS } = await import('./sendSMS.js');
        // Pasar el tipo de alerta al SMS
        const smsResult = await sendSMS(contacto, usuario, type);
        results.sms = smsResult;
        
        if (smsResult.success) {
          console.log(`✅ [LOG] SMS enviado a ${contacto.telefono} (SID: ${smsResult.sid || 'N/A'})`);
        } else {
          console.error(`❌ [ERROR] Fallo envío SMS: ${smsResult.error}`);
        }
      } catch (smsError) {
        console.error('❌ Error enviando SMS:', smsError);
        results.sms = { success: false, error: smsError.message || 'Error desconocido' };
      }
    } else {
      console.log(`ℹ️ No se envía SMS: tipo=${type}, tieneTelefono=${!!contacto.telefono}, notify_sms=${contacto.notify_sms}`);
    }

    // Responder
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
    console.error('❌ Error en endpoint:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno',
    });
  }
});

// ═══════════════════════════════════════════════════════
// ENDPOINT ALTERNATIVO (sin /api/ prefijo, igual que el ejemplo)
// ═══════════════════════════════════════════════════════

app.post('/avisar-contacto', async (req, res) => {
  try {
    const { contacto, usuario } = req.body;

    if (!contacto?.email || !usuario?.nombre) {
      return res.status(400).json({ 
        success: false, 
        error: 'Faltan datos obligatorios' 
      });
    }

    const resultado = await enviarAvisoEmail(contacto, usuario);

    if (resultado.success) {
      console.log(`[LOG] Aviso enviado a ${contacto.email} para usuario ${usuario.nombre}`);
      return res.json({ success: true });
    } else {
      return res.status(500).json({ 
        success: false, 
        error: resultado.error 
      });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ═══════════════════════════════════════════════════════
// ENDPOINTS: Test y raíz
// ═══════════════════════════════════════════════════════

app.get('/', (req, res) => {
  res.json({
    success: true,
    name: 'Contigo Backend',
    version: '1.0.0',
    endpoints: [
      'POST /api/avisar-contacto',
      'POST /api/bienvenida-contacto',
      'POST /api/enviar-informe-tutor',
      'GET  /api/test',
      'GET  /health',
    ],
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Backend de Contigo funcionando',
    sendgrid: !!process.env.SENDGRID_API_KEY,
    twilio: !!process.env.TWILIO_ACCOUNT_SID,
    timestamp: new Date().toISOString(),
  });
});

// ═══════════════════════════════════════════════════════
// ENDPOINT: Health check
// ═══════════════════════════════════════════════════════

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ═══════════════════════════════════════════════════════
// ENDPOINT: Email de bienvenida cuando se agrega contacto
// ═══════════════════════════════════════════════════════

app.post('/api/bienvenida-contacto', async (req, res) => {
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
    console.log(`   Teléfono: ${contacto.telefono || 'NO PROPORCIONADO'}`);
    console.log(`   Datos completos del contacto:`, JSON.stringify(contacto, null, 2));

    const results = { email: null, sms: null };

    // Enviar email de bienvenida
    const emailResult = await enviarBienvenidaEmail(contacto, usuario);
    results.email = emailResult;

    if (emailResult.success) {
      console.log(`✅ Email de bienvenida enviado a ${contacto.email}`);
    } else {
      console.error(`❌ Error enviando email de bienvenida: ${emailResult.error}`);
      console.error(`   Detalles completos:`, emailResult);
      
      // Si el error contiene "Unauthorized", dar más información
      if (emailResult.error && emailResult.error.includes('Unauthorized')) {
        console.error('');
        console.error('⚠️  PROBLEMA DE AUTENTICACIÓN CON SENDGRID:');
        console.error('   1. Verifica que SENDGRID_API_KEY en .env sea correcta');
        console.error('   2. Verifica que el email remitente esté verificado en SendGrid');
        console.error('   3. Ve a SendGrid → Settings → Sender Authentication');
        console.error('');
      }
    }

    // Enviar SMS de bienvenida si hay teléfono
    // Para la bienvenida, enviamos SMS siempre que haya teléfono (es un mensaje único)
    if (contacto.telefono && contacto.telefono.trim() !== '') {
      try {
        console.log(`📱 Intentando enviar SMS de bienvenida a: ${contacto.telefono}`);
        const { sendSMS } = await import('./sendSMS.js');
        const smsResult = await sendSMS(contacto, usuario, 'bienvenida');
        results.sms = smsResult;
        
        if (smsResult.success) {
          console.log(`✅ SMS de bienvenida enviado exitosamente a ${contacto.telefono}`);
        } else {
          console.error(`❌ Error enviando SMS de bienvenida: ${smsResult.error}`);
          console.error(`   Detalles completos:`, smsResult);
        }
      } catch (smsError) {
        console.error('❌ Error enviando SMS de bienvenida:', smsError);
        console.error('   Stack trace:', smsError.stack);
        results.sms = { success: false, error: smsError.message || 'Error desconocido' };
      }
    } else {
      console.log(`ℹ️ No se envía SMS de bienvenida: teléfono=${contacto.telefono || 'undefined'}`);
      console.log(`   Verifica que el teléfono se esté enviando desde el frontend`);
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
});

// ═══════════════════════════════════════════════════════
// ENDPOINT: Enviar informe PDF al tutor
// ═══════════════════════════════════════════════════════

app.post('/api/enviar-informe-tutor', async (req, res) => {
  try {
    const { contacto, usuario, pdf_base64 } = req.body;

    if (!usuario?.nombre) {
      return res.status(400).json({ success: false, error: 'Falta usuario.nombre' });
    }
    if (!contacto?.email) {
      return res.status(400).json({ success: false, error: 'Falta contacto.email' });
    }
    if (!pdf_base64) {
      return res.status(400).json({ success: false, error: 'Falta pdf_base64' });
    }

    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL;

    if (!apiKey || !fromEmail) {
      return res.status(500).json({ success: false, error: 'SendGrid no configurado (env)' });
    }

    const sgMail = (await import('@sendgrid/mail')).default;
    sgMail.setApiKey(apiKey);

    await sgMail.send({
      to: contacto.email,
      from: { email: fromEmail, name: 'Contigo App' },
      subject: `Informe de seguimiento de ${usuario.nombre}`,
      text: `Hola${contacto.nombre ? ` ${contacto.nombre}` : ''},\n\nAdjunto encontrás el informe de seguimiento de bienestar de ${usuario.nombre}, generado desde la app Contigo.\n\n— Contigo · Asistente de bienestar`,
      attachments: [
        {
          content: pdf_base64,
          filename: `informe-${usuario.nombre.replace(/\s+/g, '-')}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment',
        },
      ],
    });

    console.log(`[LOG] Informe PDF enviado a ${contacto.email} para usuario ${usuario.nombre}`);

    return res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('❌ Error enviando informe tutor:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error interno' });
  }
});

// ═══════════════════════════════════════════════════════
// INICIAR SERVIDOR (solo en desarrollo local)
// ═══════════════════════════════════════════════════════

// En Vercel, no ejecutamos app.listen(), solo exportamos la app
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('🚀 Servidor Contigo corriendo');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`📧 SendGrid: ${process.env.SENDGRID_API_KEY ? '✅ Configurado' : '❌ NO configurado'}`);
    console.log(`📨 Email remitente: ${process.env.FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || 'no-reply@contigo.app'}`);
    console.log('');
    console.log('📋 Endpoints disponibles:');
    console.log('   POST /api/avisar-contacto');
    console.log('   POST /api/bienvenida-contacto');
    console.log('   POST /api/enviar-informe-tutor');
    console.log('   POST /avisar-contacto');
    console.log('   GET  /api/test');
    console.log('   GET  /health');
    console.log('');
    if (!process.env.SENDGRID_API_KEY) {
      console.log('⚠️  ADVERTENCIA: SendGrid no está configurado');
      console.log('   Los emails no se enviarán hasta que agregues SENDGRID_API_KEY al .env');
      console.log('');
    }
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
  });
}

// Exportar para Vercel (serverless function)
// Vercel necesita que exportemos el handler como función
export default (req, res) => {
  return app(req, res);
};
