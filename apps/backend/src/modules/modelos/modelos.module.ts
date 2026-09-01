import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Modelo } from './entities/modelo.entity';
import { ModelosService } from './modelos.service';
import { ModelosController } from './modelos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Modelo])],
  providers: [ModelosService],
  controllers: [ModelosController],
  exports: [ModelosService],
})
export class ModelosModule {}
