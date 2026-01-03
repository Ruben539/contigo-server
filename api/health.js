/**
 * VERCEL SERVERLESS FUNCTION: Health Check
 * 
 * Endpoint: /api/health
 * 
 * Simple health check endpoint for monitoring
 */

export default async function handler(req, res) {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ status: 'error', error: 'Method not allowed' });
  }

  // Check if required environment variables are set
  const checks = {
    sendgrid: !!process.env.SENDGRID_API_KEY,
    fromEmail: !!(process.env.FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL),
    twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
  };

  const allHealthy = checks.sendgrid && checks.fromEmail;

  return res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  });
}

