/**
 * LessonFlow Express Server Entry Point
 * 
 * Runs on port 3000.
 * In development, attaches Vite middlewares for seamless React HMR/SSR.
 * In production, serves static assets from dist/.
 * Exposes API routes under /api/* with CORS enabled for future Chrome Extension.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { apiRouter } from './server/routes/api.js';
import { authMiddleware } from './server/middleware/auth.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || 3000);

async function startServer() {
  const app = express();

  // Enable CORS so the future Chrome extension can securely query data
  app.use(
    cors({
      origin: true, // Allow chrome-extension:// origins and web origins
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'x-api-token', 'x-user-id'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    })
  );

  // Parse incoming JSON with generous limit for large imported lesson plans
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Mount API endpoints
  app.use('/api', authMiddleware, apiRouter);

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'LessonFlow API', timestamp: new Date().toISOString() });
  });

  // Client frontend handling (Vite dev middleware vs static build)
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.warn('Production build dist/ folder not found. Please run npm run build.');
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LessonFlow] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[LessonFlow] Failed to start server:', err);
  process.exit(1);
});
