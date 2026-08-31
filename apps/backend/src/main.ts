import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join, existsSync } from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' });

  // Servir el frontend React compilado desde /public
  // Usamos Express directamente para evitar path-to-regexp v8 compat issues
  const publicPath = join(__dirname, '..', 'public');
  if (existsSync(publicPath)) {
    // Archivos estáticos (JS, CSS, imágenes, etc.)
    app.useStaticAssets(publicPath);

    // SPA fallback: cualquier ruta que no sea /api → index.html
    // path-to-regexp v8 requiere wildcard con nombre: /{*path}
    const httpAdapter = app.getHttpAdapter();
    const expressInstance = httpAdapter.getInstance();
    expressInstance.get('/{*path}', (req: any, res: any, next: any) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(publicPath, 'index.html'));
    });
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Inventario TI corriendo en http://localhost:${port}`);
}
bootstrap();
