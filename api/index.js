/**
 * Entrypoint para Vercel
 * 
 * Vercel busca archivos en la carpeta api/ como serverless functions.
 * Este archivo importa y exporta el server Express.
 */

import app from '../server.js';

export default app;

