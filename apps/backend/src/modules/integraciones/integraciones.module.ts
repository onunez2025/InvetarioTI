import { Module } from '@nestjs/common';
import { IntegracionesService } from './integraciones.service';
import { IntegracionesController } from './integraciones.controller';
import { EquiposModule } from '../equipos/equipos.module';

@Module({
  imports: [EquiposModule],
  providers: [IntegracionesService],
  controllers: [IntegracionesController],
})
export class IntegracionesModule {}
