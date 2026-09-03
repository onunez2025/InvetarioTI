import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Notificacion } from './entities/notificacion.entity';
import { EmailService } from './email.service';

@Injectable()
export class AlertasService {
  private readonly logger = new Logger(AlertasService.name);

  constructor(
    @InjectDataSource() private ds: DataSource,
    @InjectRepository(Notificacion) private notiRepo: Repository<Notificacion>,
    private emailService: EmailService,
  ) {}

  // Lunes 8:00 AM — EOS próximos 90 días
  @Cron('0 8 * * 1')
  async alertaEosProximos() {
    this.logger.log('[CRON] Verificando modelos EOS próximos...');
    const modelos = await this.ds.query(`
      SELECT TOP 10 m.nombre, m.tipo, m.marca,
             DATEDIFF(DAY, GETUTCDATE(), m.end_of_support) AS dias
      FROM inventario_ti.modelos m
      WHERE m.end_of_support IS NOT NULL
        AND m.end_of_support <= DATEADD(DAY, 90, GETUTCDATE())
        AND m.activo = 1
      ORDER BY m.end_of_support ASC
    `);
    if (modelos.length === 0) return;

    const admins = await this.getAdmins();
    const html = `
      <h2>⚠️ ${modelos.length} modelos próximos a fin de soporte (90 días)</h2>
      <table border="1" cellpadding="6" style="border-collapse:collapse">
        <tr style="background:#1e293b;color:white"><th>Modelo</th><th>Tipo</th><th>Días restantes</th></tr>
        ${modelos.map((m: any) => `<tr><td>${m.nombre}</td><td>${m.tipo}</td><td style="color:${m.dias < 30 ? 'red' : 'orange'}">${m.dias}</td></tr>`).join('')}
      </table>
      <p>Accede al <a href="${process.env.APP_URL ?? 'https://gac-sole-inventario-ti.jppsfv.easypanel.host'}/dashboard">Dashboard</a> para ver el detalle completo.</p>
    `;

    for (const admin of admins) {
      await this.emailService.send(admin.email, `[InventarioTI] ${modelos.length} modelos con EOS próximo`, html);
      await this.notiRepo.save({
        usuarioId: admin.id,
        tipo: 'EOS_PROXIMO',
        titulo: `${modelos.length} modelos con EOS próximo`,
        mensaje: modelos.slice(0, 3).map((m: any) => m.nombre).join(', ') + (modelos.length > 3 ? '...' : ''),
      });
    }
  }

  // Diario 9:00 AM — Stock bajo
  @Cron('0 9 * * *')
  async alertaStockBajo() {
    const items = await this.ds.query(`
      SELECT m.nombre AS modeloNombre, m.tipo,
             ISNULL(SUM(cd.cantidad), 0) -
             ISNULL((SELECT SUM(sa.cantidad) FROM inventario_ti.stock_asignaciones sa
                     WHERE sa.modelo_id = m.id AND sa.fecha_fin IS NULL), 0) AS disponible
      FROM inventario_ti.modelos m
      LEFT JOIN inventario_ti.compras_detalle cd ON cd.modelo_id = m.id
      WHERE m.tiene_serie = 0 AND m.activo = 1
      GROUP BY m.id, m.nombre, m.tipo
      HAVING ISNULL(SUM(cd.cantidad), 0) -
             ISNULL((SELECT SUM(sa.cantidad) FROM inventario_ti.stock_asignaciones sa
                     WHERE sa.modelo_id = m.id AND sa.fecha_fin IS NULL), 0) <= 3
    `);
    if (items.length === 0) return;

    const admins = await this.getAdmins();
    const html = `
      <h2>📦 Stock bajo en ${items.length} modelo(s)</h2>
      <table border="1" cellpadding="6" style="border-collapse:collapse">
        <tr style="background:#1e293b;color:white"><th>Modelo</th><th>Tipo</th><th>Disponible</th></tr>
        ${items.map((i: any) => `<tr><td>${i.modeloNombre}</td><td>${i.tipo}</td><td style="color:${i.disponible <= 0 ? 'red' : 'orange'};font-weight:bold">${i.disponible}</td></tr>`).join('')}
      </table>
    `;

    for (const admin of admins) {
      await this.emailService.send(admin.email, `[InventarioTI] Stock bajo: ${items[0].modeloNombre}${items.length > 1 ? ` y ${items.length - 1} más` : ''}`, html);
      await this.notiRepo.save({
        usuarioId: admin.id,
        tipo: 'STOCK_BAJO',
        titulo: `Stock bajo: ${items.slice(0, 2).map((i: any) => i.modeloNombre).join(', ')}`,
        mensaje: `${items.length} modelo(s) con disponible ≤ 3 unidades`,
      });
    }
  }

  private async getAdmins() {
    return this.ds.query(`
      SELECT id, nombre, email FROM inventario_ti.usuarios
      WHERE rol IN ('ADMIN', 'TI_ADMIN') AND activo = 1 AND email IS NOT NULL
    `);
  }

  // Métodos para notificaciones in-app
  async getNoLeidas(usuarioId: number) {
    return this.notiRepo.find({
      where: { usuarioId, leida: false },
      order: { creadoEn: 'DESC' },
      take: 30,
    });
  }

  async marcarLeida(id: number, usuarioId: number) {
    await this.notiRepo.update({ id, usuarioId }, { leida: true });
    return { ok: true };
  }

  async marcarTodasLeidas(usuarioId: number) {
    await this.notiRepo.update({ usuarioId, leida: false }, { leida: true });
    return { ok: true };
  }
}
