import {
  Controller, Post, UseInterceptors, UploadedFile,
  UseGuards, Request, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IntegracionesService } from './integraciones.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('api/integraciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IntegracionesController {
  constructor(private readonly integracionesService: IntegracionesService) {}

  @Post('importar-excel')
  @Roles('ADMIN')
  @UseInterceptors(
    FileInterceptor('archivo', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
      fileFilter: (_req, file, cb) => {
        const ext = file.originalname.split('.').pop()?.toLowerCase();
        if (ext === 'xlsx' || ext === 'xls') {
          cb(null, true);
        } else {
          cb(new BadRequestException('Solo se aceptan archivos Excel (.xlsx, .xls)'), false);
        }
      },
    }),
  )
  async importarExcel(@UploadedFile() archivo: Express.Multer.File, @Request() req: any) {
    if (!archivo) throw new BadRequestException('Archivo Excel requerido');
    return this.integracionesService.importarExcel(archivo.buffer, req.user.id);
  }
}
