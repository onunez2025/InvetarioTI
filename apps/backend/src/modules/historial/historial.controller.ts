import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { HistorialService } from './historial.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

// ParseOptionalIntPipe no existe en todas las versiones de NestJS, usamos un helper
function toInt(val: string | undefined): number | undefined {
  if (val === undefined || val === '') return undefined;
  const n = parseInt(val, 10);
  return isNaN(n) ? undefined : n;
}

@Controller('api/historial')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'GERENTE', 'TECNICO')
export class HistorialController {
  constructor(private readonly service: HistorialService) {}

  @Get()
  findAll(
    @Query('equipoId') equipoId?: string,
    @Query('usuarioId') usuarioId?: string,
    @Query('campo') campo?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      equipoId: toInt(equipoId),
      usuarioId: toInt(usuarioId),
      campo: campo || undefined,
      fechaDesde: fechaDesde || undefined,
      fechaHasta: fechaHasta || undefined,
      page: toInt(page) ?? 1,
      limit: toInt(limit) ?? 50,
    });
  }
}
