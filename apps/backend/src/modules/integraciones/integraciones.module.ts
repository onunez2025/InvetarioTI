import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegracionesService } from './integraciones.service';
import { IntegracionesController } from './integraciones.controller';
import { EquiposModule } from '../equipos/equipos.module';
import { Modelo } from '../modelos/entities/modelo.entity';

@Module({
  imports: [EquiposModule, TypeOrmModule.forFeature([Modelo])],
  providers: [IntegracionesService],
  controllers: [IntegracionesController],
})
export class IntegracionesModule {}
