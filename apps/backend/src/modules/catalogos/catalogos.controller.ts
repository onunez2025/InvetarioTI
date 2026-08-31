import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { CatalogosService } from './catalogos.service';
import { CreateCatalogoDto, UpdateCatalogoDto } from './dto/catalogo.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('api/catalogos')
@UseGuards(JwtAuthGuard)
export class CatalogosController {
  constructor(private readonly service: CatalogosService) {}

  /** GET /api/catalogos → todos agrupados por tipo */
  @Get()
  findAll() {
    return this.service.findAll();
  }

  /** GET /api/catalogos/tipo/:tipo → activos de un tipo; ?parentId= para filtrar hijos */
  @Get('tipo/:tipo')
  findByTipo(
    @Param('tipo') tipo: string,
    @Query('parentId') parentId?: string,
  ) {
    const pid = parentId ? parseInt(parentId, 10) : undefined;
    return this.service.findByTipo(tipo, isNaN(pid as number) ? undefined : pid);
  }

  /** GET /api/catalogos/admin/:tipo → todos (incluye inactivos) — solo admin */
  @Get('admin/:tipo')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findAllByTipo(@Param('tipo') tipo: string) {
    return this.service.findAllByTipo(tipo);
  }

  /** POST /api/catalogos → crear — solo admin */
  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateCatalogoDto) {
    return this.service.create(dto);
  }

  /** PUT /api/catalogos/:id → actualizar — solo admin */
  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCatalogoDto) {
    return this.service.update(id, dto);
  }

  /** DELETE /api/catalogos/:id → eliminar — solo admin */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
