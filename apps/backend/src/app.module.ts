import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { getDatabaseConfig } from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { EquiposModule } from './modules/equipos/equipos.module';
import { IntegracionesModule } from './modules/integraciones/integraciones.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(getDatabaseConfig()),
    // El frontend se sirve desde main.ts con useStaticAssets + catch-all SPA
    AuthModule,
    EquiposModule,
    IntegracionesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
