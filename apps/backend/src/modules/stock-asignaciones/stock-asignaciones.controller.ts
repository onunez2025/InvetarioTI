import {
  Controller, Get, Post, Patch, Body, Param,
  ParseIntPipe, Query, Request, UseGuards,
} from '@nestjs/common';
import { StockAsignacionesService } from './stock-asignaciones.service';
import { CreateStockAsignacionDto } from './dto/create-stock-asignacion.dto';
import { DevolverStockAsignacionDto } from './dto/devolver-stock-asignacion.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('api/stock-asignaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockAsignacionesController {
  constructor(private readonly svc: StockAsignacionesService) {}

  @Get('activas-agrupadas')
  @Roles('ADMIN', 'GERENTE', 'TECNICO', 'VISUALIZADOR')
  getActivasAgrupadas() {
    return this.svc.getActivasAgrupadas();
  }

  @Get('colaborador/:id')
  @Roles('ADMIN', 'GERENTE', 'TECNICO', 'VISUALIZADOR')
  byColaborador(
    @Param('id', ParseIntPipe) id: number,
    @Query('activas') activas?: string,
  ) {
    return this.svc.findByColaborador(id, activas === 'true');
  }

  @Post()
  @Roles('ADMIN', 'TECNICO')
  create(@Body() dto: CreateStockAsignacionDto, @Request() req: any) {
    return this.svc.create(dto, req.user.id);
  }

  @Post('bulk')
  @Roles('ADMIN', 'TECNICO')
  createBulk(@Body() dto: any, @Request() req: any) {
    return this.svc.createBulk(dto, req.user?.id);
  }

  @Patch(':id/devolver')
  @Roles('ADMIN', 'TECNICO')
  devolver(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DevolverStockAsignacionDto,
  ) {
    return this.svc.devolver(id, dto.fechaFin);
  }
}
