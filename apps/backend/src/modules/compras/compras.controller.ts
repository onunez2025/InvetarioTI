import {
  Controller, Get, Post, Patch, Body, Param, ParseIntPipe,
  Query, Request, UseGuards, UseInterceptors, UploadedFile,
  BadRequestException, NotFoundException, Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ComprasService } from './compras.service';
import { CreateCompraDto, CreateCompraDetalleDto } from './dto/create-compra.dto';
import { RegistrarUnidadesDto } from './dto/registrar-unidades.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('api/compras')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComprasController {
  constructor(private readonly svc: ComprasService) {}

  @Get()
  @Roles('ADMIN', 'GERENTE', 'TECNICO', 'VISUALIZADOR')
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.svc.findAll(Number(page ?? 1), Number(limit ?? 20));
  }

  @Get(':id')
  @Roles('ADMIN', 'GERENTE', 'TECNICO', 'VISUALIZADOR')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'TECNICO')
  create(@Body() dto: CreateCompraDto, @Request() req: any) {
    return this.svc.create(dto, req.user.id);
  }

  @Patch(':id/aprobar')
  @Roles('ADMIN', 'TECNICO')
  aprobar(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.svc.aprobar(id, req.user?.id);
  }

  @Patch(':id/recibir')
  @Roles('ADMIN', 'TECNICO')
  recibir(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.svc.recibirCompra(id, req.user?.id);
  }

  @Post(':id/adjunto')
  @Roles('ADMIN', 'TECNICO')
  @UseInterceptors(
    FileInterceptor('file', {
      dest: path.join(os.tmpdir(), 'uploads'),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_, file, cb) => {
        cb(null, ['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype));
      },
    }),
  )
  uploadAdjunto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Archivo requerido (PDF, JPG, PNG)');
    return this.svc.guardarAdjunto(id, file);
  }

  @Get(':id/adjunto')
  @Roles('ADMIN', 'GERENTE', 'TECNICO', 'VISUALIZADOR')
  async getAdjunto(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const compra = await this.svc.findOne(id);
    if (!compra.adjuntoUrl || !fs.existsSync(compra.adjuntoUrl)) {
      throw new NotFoundException('Sin adjunto');
    }
    const ext = path.extname(compra.adjuntoUrl).toLowerCase();
    const contentType =
      ext === '.pdf' ? 'application/pdf' : ext === '.png' ? 'image/png' : 'image/jpeg';
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': 'inline',
    });
    fs.createReadStream(compra.adjuntoUrl).pipe(res);
  }

  @Post(':id/detalle')
  @Roles('ADMIN', 'TECNICO')
  addDetalle(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCompraDetalleDto,
  ) {
    return this.svc.addDetalle(id, dto);
  }

  @Post('detalle/:detalleId/registrar-unidades')
  @Roles('ADMIN', 'TECNICO')
  registrarUnidades(
    @Param('detalleId', ParseIntPipe) id: number,
    @Body() dto: RegistrarUnidadesDto,
  ) {
    return this.svc.registrarUnidades(id, dto);
  }
}
