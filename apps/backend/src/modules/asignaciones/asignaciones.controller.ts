import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, ParseIntPipe, Request, Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AsignacionesService } from './asignaciones.service';
import { CreateAsignacionDto, DevolucionDto } from './dto/asignacion.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/asignaciones')
@UseGuards(JwtAuthGuard)
export class AsignacionesController {
  constructor(private readonly service: AsignacionesService) {}

  /** GET /api/asignaciones/acta/:colaboradorId */
  @Get('acta/:colaboradorId')
  async actaEntrega(
    @Param('colaboradorId', ParseIntPipe) id: number,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const buffer = await this.service.generarActa(id, req.user);
    const fecha = new Date().toISOString().split('T')[0];
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="acta-entrega-${id}-${fecha}.pdf"`,
    });
    res.end(buffer);
  }

  /** GET /api/asignaciones/acta-individual/:id */
  @Get('acta-individual/:id')
  async actaIndividual(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const buffer = await this.service.generarActaPorAsignacion(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="acta-asignacion-${id}.pdf"`,
    });
    res.end(buffer);
  }

  /** GET /api/asignaciones/por-departamento */
  @Get('por-departamento')
  porDepartamento() {
    return this.service.porDepartamento();
  }

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

  /** GET /api/asignaciones/colaborador/:colaboradorId  (solo activas) */
  @Get('colaborador/:colaboradorId')
  findByColaborador(@Param('colaboradorId', ParseIntPipe) colaboradorId: number) {
    return this.service.findByColaborador(colaboradorId);
  }

  /** GET /api/asignaciones/colaborador/:colaboradorId/historial  (todas) */
  @Get('colaborador/:colaboradorId/historial')
  findHistorialByColaborador(@Param('colaboradorId', ParseIntPipe) colaboradorId: number) {
    return this.service.findHistorialByColaborador(colaboradorId);
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

  /** POST /api/asignaciones/:id/firmar */
  @Post(':id/firmar')
  registrarFirma(
    @Param('id', ParseIntPipe) id: number,
    @Body('firma') firma: string,
  ) {
    return this.service.registrarFirma(id, firma);
  }
}
