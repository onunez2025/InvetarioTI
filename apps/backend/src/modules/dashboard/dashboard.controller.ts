import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@Controller('api/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}

  @Get('resumen')
  resumen() {
    return this.svc.resumen();
  }

  @Get('graficos')
  graficos() {
    return this.svc.graficos();
  }

  @Get('eos-proximos')
  eos() {
    return this.svc.eosProximos();
  }

  @Get('actividad-reciente')
  actividad() {
    return this.svc.actividadReciente();
  }
}
