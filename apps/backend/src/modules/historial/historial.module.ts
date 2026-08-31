import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistorialCambio } from '../auditoria/entities/historial-cambio.entity';
import { HistorialService } from './historial.service';
import { HistorialController } from './historial.controller';

@Module({
  imports: [TypeOrmModule.forFeature([HistorialCambio])],
  controllers: [HistorialController],
  providers: [HistorialService],
})
export class HistorialModule {}
