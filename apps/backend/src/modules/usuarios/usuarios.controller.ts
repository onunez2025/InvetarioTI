import {
  Controller, Get, Post, Put, Delete, Patch,
  Body, Param, UseGuards, Request, ParseIntPipe,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto, UpdateUsuarioDto, CambiarPasswordDto } from './dto/usuarios.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('api/usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  @Get()
  @Roles('ADMIN', 'GERENTE')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'GERENTE')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateUsuarioDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles('ADMIN')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUsuarioDto) {
    return this.service.update(id, dto);
  }

  /** PATCH /api/usuarios/:id/password — Admin puede cambiar cualquiera; el propio usuario solo la suya */
  @Patch(':id/password')
  @Roles('ADMIN', 'GERENTE', 'TECNICO', 'VISUALIZADOR')
  cambiarPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarPasswordDto,
    @Request() req: any,
  ) {
    return this.service.cambiarPassword(id, dto, req.user.id, req.user.rol);
  }

  @Delete(':id')
  @Roles('ADMIN')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.deactivate(id);
  }
}
