import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Equipo } from './entities/equipo.entity';
import { EquiposService } from './equipos.service';
import { EquiposController } from './equipos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Equipo])],
  providers: [EquiposService],
  controllers: [EquiposController],
  exports: [EquiposService],
})
export class EquiposModule {}
