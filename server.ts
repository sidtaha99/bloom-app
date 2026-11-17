import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApp } from './server/app';
import { config } from './server/config';
import { DatabaseService } from './server/db/database';

async function bootstrap() {
  const db = new DatabaseService({ mongodbUri: config.mongodbUri || undefined });

  if (config.mongodbUri) {
    console.log('[Bloom] Connecting to MongoDB Atlas...');
  } else {
    console.warn(
      '[Bloom] MONGODB_URI is not set. Using persistent local SQLite store at ./data/bloom.sqlite.'
    );
  }

  if (!config.hasExplicitSessionSecret) {
    console.warn(
      '[Bloom] SESSION_SECRET is not set. Using an ephemeral secret for this session. Set SESSION_SECRET in production.'
    );
  }

  if (!config.brevoApiKey || !config.emailFrom) {
    console.warn(
      '[Bloom] BREVO_API_KEY or EMAIL_FROM is not configured. OTP emails will be surfaced in preview mode rather than delivered via Brevo.'
    );
  }

  await db.init(config.mongodbUri || undefined);
  console.log(`[Bloom] Database ready (mode: ${db.getMode()})`);

  const app = createApp(db);

  if (config.isProduction) {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Fallback to index.html for client-side routes in dev if Vite didn't handle
    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) {
        next();
        return;
      }
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        const template = fs.readFileSync(indexPath, 'utf-8');
        const html = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        next(e);
      }
    });
  }

  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`[Bloom] Full-stack server running at http://localhost:${config.port}`);
  });

  const shutdown = async () => {
    console.log('[Bloom] Shutting down gracefully...');
    server.close(async () => {
      await db.close();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error('[Bloom] Failed to start server:', err);
  process.exit(1);
});
