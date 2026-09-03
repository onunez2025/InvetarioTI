import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertasService } from './alertas.service';
import { AlertasController } from './alertas.controller';
import { EmailService } from './email.service';
import { Notificacion } from './entities/notificacion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notificacion])],
  providers: [AlertasService, EmailService],
  controllers: [AlertasController],
  exports: [AlertasService, EmailService],
})
export class AlertasModule {}
