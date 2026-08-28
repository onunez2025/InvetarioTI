import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, UseGuards, Request,
  ParseIntPipe,
} from '@nestjs/common';
import { EquiposService } from './equipos.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateEquipoDto } from './dto/create-equipo.dto';
import { UpdateEquipoDto } from './dto/update-equipo.dto';
import { FiltroEquiposDto } from './dto/filtro-equipos.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('api/equipos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EquiposController {
  constructor(
    private readonly equiposService: EquiposService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  @Get()
  findAll(@Query() filtros: FiltroEquiposDto) {
    const { page, limit, ...resto } = filtros;
    return this.equiposService.findAll(resto, page ?? 1, limit ?? 50);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.equiposService.findOne(id);
  }

  @Get(':id/historial')
  @Roles('ADMIN', 'GERENTE', 'TECNICO')
  historial(@Param('id', ParseIntPipe) id: number) {
    return this.auditoriaService.findByEquipo(id);
  }

  @Post()
  @Roles('ADMIN', 'GERENTE', 'TECNICO')
  create(@Body() dto: CreateEquipoDto, @Request() req: any) {
    return this.equiposService.create(dto, req.user.id);
  }

  @Put(':id')
  @Roles('ADMIN', 'GERENTE', 'TECNICO')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEquipoDto, @Request() req: any) {
    return this.equiposService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @Roles('ADMIN', 'GERENTE')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.equiposService.remove(id);
  }
}
