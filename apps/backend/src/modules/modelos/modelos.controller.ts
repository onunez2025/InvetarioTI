import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ModelosService } from './modelos.service';
import { CreateModeloDto, UpdateModeloDto } from './dto/create-modelo.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('api/modelos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ModelosController {
  constructor(private readonly svc: ModelosService) {}

  @Get()
  @Roles('ADMIN', 'GERENTE', 'TECNICO', 'VISUALIZADOR')
  findAll(
    @Query('tipo') tipo?: string,
    @Query('tieneSerie') ts?: string,
    @Query('activo') activo?: string,
  ) {
    return this.svc.findAll({
      tipo,
      tieneSerie: ts !== undefined ? ts === 'true' : undefined,
      activo: activo !== undefined ? activo === 'true' : undefined,
    });
  }

  @Get(':id')
  @Roles('ADMIN', 'GERENTE', 'TECNICO', 'VISUALIZADOR')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'TECNICO')
  create(@Body() dto: CreateModeloDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'TECNICO')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateModeloDto) {
    return this.svc.update(id, dto);
  }
}
