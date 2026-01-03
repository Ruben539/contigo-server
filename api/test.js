/**
 * VERCEL SERVERLESS FUNCTION: Test Endpoint
 * 
 * Endpoint: /api/test
 * 
 * Simple health check to verify the backend is working
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
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  return res.status(200).json({
    success: true,
    message: 'Backend de Contigo funcionando',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
}

