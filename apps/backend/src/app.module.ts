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
import { ColaboradoresModule } from './modules/colaboradores/colaboradores.module';
import { AsignacionesModule } from './modules/asignaciones/asignaciones.module';
import { ModelosModule }          from './modules/modelos/modelos.module';
import { ProveedoresModule }       from './modules/proveedores/proveedores.module';
import { ComprasModule }           from './modules/compras/compras.module';
import { StockAsignacionesModule } from './modules/stock-asignaciones/stock-asignaciones.module';
import { InventarioModule }        from './modules/inventario/inventario.module';
import { DashboardModule }         from './modules/dashboard/dashboard.module';
import { ReportesModule }          from './modules/reportes/reportes.module';

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
    ColaboradoresModule,
    AsignacionesModule,
    ModelosModule,
    ProveedoresModule,
    ComprasModule,
    StockAsignacionesModule,
    InventarioModule,
    DashboardModule,
    ReportesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
