import { Controller, Get, UseGuards } from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('api/inventario')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventarioController {
  constructor(private readonly svc: InventarioService) {}

  @Get('stock')
  @Roles('ADMIN', 'GERENTE', 'TECNICO', 'VISUALIZADOR')
  stock() {
    return this.svc.stockResumen();
  }

  @Get('equipos-por-modelo')
  @Roles('ADMIN', 'GERENTE', 'TECNICO', 'VISUALIZADOR')
  equiposPorModelo() {
    return this.svc.resumenPorModelo();
  }
}
