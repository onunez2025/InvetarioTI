import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockAsignacion } from './entities/stock-asignacion.entity';
import { Modelo } from '../modelos/entities/modelo.entity';
import { StockAsignacionesService }    from './stock-asignaciones.service';
import { StockAsignacionesController } from './stock-asignaciones.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StockAsignacion, Modelo])],
  providers: [StockAsignacionesService],
  controllers: [StockAsignacionesController],
  exports: [StockAsignacionesService],
})
export class StockAsignacionesModule {}
