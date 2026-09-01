import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Compra }        from './entities/compra.entity';
import { CompraDetalle } from './entities/compra-detalle.entity';
import { Equipo }        from '../equipos/entities/equipo.entity';
import { Modelo }        from '../modelos/entities/modelo.entity';
import { ComprasService }    from './compras.service';
import { ComprasController } from './compras.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Compra, CompraDetalle, Equipo, Modelo])],
  providers: [ComprasService],
  controllers: [ComprasController],
  exports: [ComprasService],
})
export class ComprasModule {}
