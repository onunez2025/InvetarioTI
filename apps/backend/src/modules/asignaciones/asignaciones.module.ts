import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asignacion } from './entities/asignacion.entity';
import { AsignacionesService } from './asignaciones.service';
import { AsignacionesController } from './asignaciones.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Asignacion])],
  controllers: [AsignacionesController],
  providers: [AsignacionesService],
  exports: [AsignacionesService],
})
export class AsignacionesModule {}
