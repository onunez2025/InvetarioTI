import {
  Controller, Get, Post, Body, Param, ParseIntPipe,
  Query, Request, UseGuards,
} from '@nestjs/common';
import { ComprasService } from './compras.service';
import { CreateCompraDto, CreateCompraDetalleDto } from './dto/create-compra.dto';
import { RegistrarUnidadesDto } from './dto/registrar-unidades.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('api/compras')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComprasController {
  constructor(private readonly svc: ComprasService) {}

  @Get()
  @Roles('ADMIN', 'GERENTE', 'TECNICO', 'VISUALIZADOR')
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.svc.findAll(Number(page ?? 1), Number(limit ?? 20));
  }

  @Get(':id')
  @Roles('ADMIN', 'GERENTE', 'TECNICO', 'VISUALIZADOR')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'TECNICO')
  create(@Body() dto: CreateCompraDto, @Request() req: any) {
    return this.svc.create(dto, req.user.id);
  }

  @Post(':id/detalle')
  @Roles('ADMIN', 'TECNICO')
  addDetalle(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCompraDetalleDto,
  ) {
    return this.svc.addDetalle(id, dto);
  }

  @Post('detalle/:detalleId/registrar-unidades')
  @Roles('ADMIN', 'TECNICO')
  registrarUnidades(
    @Param('detalleId', ParseIntPipe) id: number,
    @Body() dto: RegistrarUnidadesDto,
  ) {
    return this.svc.registrarUnidades(id, dto);
  }
}
