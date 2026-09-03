import {
  Controller, Get, Patch, Delete, Param, UseGuards, Request, ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AlertasService } from './alertas.service';

@Controller(['api/notificaciones', 'notificaciones'])
@UseGuards(JwtAuthGuard)
export class AlertasController {
  constructor(private readonly svc: AlertasService) {}

  @Get()
  getNoLeidas(@Request() req: any) {
    const userId = req.user?.id ?? req.user?.userId;
    return this.svc.getNoLeidas(userId);
  }

  @Patch(':id/leer')
  marcarLeida(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const userId = req.user?.id ?? req.user?.userId;
    return this.svc.marcarLeida(id, userId);
  }

  @Delete('todas')
  marcarTodasLeidas(@Request() req: any) {
    const userId = req.user?.id ?? req.user?.userId;
    return this.svc.marcarTodasLeidas(userId);
  }
}
