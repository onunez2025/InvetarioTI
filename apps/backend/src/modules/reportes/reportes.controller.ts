import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { ReportesService } from './reportes.service';

function sendExcel(res: Response, buffer: Buffer, name: string) {
  const fecha = new Date().toISOString().split('T')[0];
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${name}-${fecha}.xlsx"`,
  });
  res.end(buffer);
}

@Controller('api/reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TI_ADMIN', 'GERENTE')
export class ReportesController {
  constructor(private readonly svc: ReportesService) {}

  @Get('equipos')
  async equipos(@Query() q: any, @Res() res: Response) {
    sendExcel(res, await this.svc.equipos(q), 'equipos');
  }

  @Get('eos')
  async eos(@Res() res: Response) {
    sendExcel(res, await this.svc.eos(), 'eos');
  }

  @Get('por-gerencia')
  async porGerencia(@Res() res: Response) {
    sendExcel(res, await this.svc.porGerencia(), 'por-gerencia');
  }

  @Get('asignaciones-activas')
  async asignaciones(@Res() res: Response) {
    sendExcel(res, await this.svc.asignacionesActivas(), 'asignaciones-activas');
  }
}
