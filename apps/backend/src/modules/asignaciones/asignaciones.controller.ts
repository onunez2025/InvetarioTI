import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, ParseIntPipe, Request,
} from '@nestjs/common';
import { AsignacionesService } from './asignaciones.service';
import { CreateAsignacionDto, DevolucionDto } from './dto/asignacion.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/asignaciones')
@UseGuards(JwtAuthGuard)
export class AsignacionesController {
  constructor(private readonly service: AsignacionesService) {}

  /** GET /api/asignaciones/activas */
  @Get('activas')
  findActivas() {
    return this.service.findActivas();
  }

  /** GET /api/asignaciones/historial?page=1&limit=50 */
  @Get('historial')
  findHistorial(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findHistorial(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  /** GET /api/asignaciones/equipo/:equipoId */
  @Get('equipo/:equipoId')
  findByEquipo(@Param('equipoId', ParseIntPipe) equipoId: number) {
    return this.service.findByEquipo(equipoId);
  }

  /** GET /api/asignaciones/equipo/:equipoId/activa */
  @Get('equipo/:equipoId/activa')
  findActivaByEquipo(@Param('equipoId', ParseIntPipe) equipoId: number) {
    return this.service.findActivaByEquipo(equipoId);
  }

  /** GET /api/asignaciones/colaborador/:colaboradorId */
  @Get('colaborador/:colaboradorId')
  findByColaborador(@Param('colaboradorId', ParseIntPipe) colaboradorId: number) {
    return this.service.findByColaborador(colaboradorId);
  }

  /** POST /api/asignaciones */
  @Post()
  create(@Body() dto: CreateAsignacionDto, @Request() req: any) {
    return this.service.create(dto, req.user.id);
  }

  /** PATCH /api/asignaciones/:id/devolver */
  @Patch(':id/devolver')
  devolver(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DevolucionDto,
  ) {
    return this.service.devolver(id, dto);
  }

  /** DELETE /api/asignaciones/:id */
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
