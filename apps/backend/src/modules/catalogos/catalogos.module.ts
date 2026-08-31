import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Catalogo } from './entities/catalogo.entity';
import { CatalogosService } from './catalogos.service';
import { CatalogosController } from './catalogos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Catalogo])],
  controllers: [CatalogosController],
  providers: [CatalogosService],
  exports: [CatalogosService],
})
export class CatalogosModule {}
