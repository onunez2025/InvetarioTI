import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule, InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
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
import { ScheduleModule }          from '@nestjs/schedule';
import { AlertasModule }           from './modules/alertas/alertas.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
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
    AlertasModule,
  ],
  controllers: [AppController],
})
export class AppModule implements OnModuleInit {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async onModuleInit() {
    try {
      const pending = await this.dataSource.showMigrations();
      if (pending) {
        console.log('[AppModule] Running pending migrations...');
        await this.dataSource.runMigrations({ transaction: 'each' });
        console.log('[AppModule] Migrations complete.');
      }
    } catch (err: any) {
      console.error('[AppModule] Migration error (app will still start):', err?.message);
    }
  }
}
