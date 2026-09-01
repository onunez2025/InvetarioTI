import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockAsignacion } from './entities/stock-asignacion.entity';
import { StockAsignacionesService }    from './stock-asignaciones.service';
import { StockAsignacionesController } from './stock-asignaciones.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StockAsignacion])],
  providers: [StockAsignacionesService],
  controllers: [StockAsignacionesController],
  exports: [StockAsignacionesService],
})
export class StockAsignacionesModule {}
