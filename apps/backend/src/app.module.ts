import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { getDatabaseConfig } from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { EquiposModule } from './modules/equipos/equipos.module';
import { IntegracionesModule } from './modules/integraciones/integraciones.module';
import { CatalogosModule } from './modules/catalogos/catalogos.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { HistorialModule } from './modules/historial/historial.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(getDatabaseConfig()),
    AuthModule,
    EquiposModule,
    IntegracionesModule,
    CatalogosModule,
    UsuariosModule,
    HistorialModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
