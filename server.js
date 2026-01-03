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

    // Enviar SMS (en user_request y persistent_mood si está habilitado)
    if ((type === 'user_request' || type === 'persistent_mood') && contacto.notify_sms && contacto.telefono) {
      try {
        // Importar sendSMS dinámicamente
        const { sendSMS } = await import('./sendSMS.js');
        // Pasar el tipo de alerta al SMS
        const smsResult = await sendSMS(contacto, usuario, type);
        results.sms = smsResult;
        
        if (smsResult.success) {
          console.log(`✅ [LOG] SMS enviado a ${contacto.telefono}`);
        } else {
          console.error(`❌ [ERROR] Fallo envío SMS: ${smsResult.error}`);
        }
      } catch (smsError) {
        console.error('❌ Error enviando SMS:', smsError);
        results.sms = { success: false, error: smsError.message };
      }
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
// ENDPOINT: Test
// ═══════════════════════════════════════════════════════

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Backend de Contigo funcionando',
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
