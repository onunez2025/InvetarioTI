import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  async send(to: string, subject: string, html: string): Promise<void> {
    if (!process.env.SMTP_USER) {
      this.logger.warn('SMTP_USER no configurado — email omitido');
      return;
    }
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
        to,
        subject,
        html,
      });
      this.logger.log(`Email enviado a ${to}: ${subject}`);
    } catch (err: any) {
      this.logger.error(`Error enviando email a ${to}: ${err?.message}`);
    }
  }
}
