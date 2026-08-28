import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Equipo } from './entities/equipo.entity';
import { EquiposService } from './equipos.service';
import { EquiposController } from './equipos.controller';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [TypeOrmModule.forFeature([Equipo]), AuditoriaModule],
  providers: [EquiposService],
  controllers: [EquiposController],
  exports: [EquiposService],
})
export class EquiposModule {}
