import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { getDatabaseConfig } from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { EquiposModule } from './modules/equipos/equipos.module';
import { IntegracionesModule } from './modules/integraciones/integraciones.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(getDatabaseConfig()),
    // Sirve el frontend React desde la carpeta public/
    // Las rutas /api/** siguen siendo manejadas por NestJS
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      // path-to-regexp v8 requiere wildcards con nombre: {*path}
      exclude: ['/api/{*path}'],
      serveStaticOptions: {
        fallthrough: true,  // SPA: rutas desconocidas → index.html
      },
    }),
    AuthModule,
    EquiposModule,
    IntegracionesModule,
  ],
})
export class AppModule {}
