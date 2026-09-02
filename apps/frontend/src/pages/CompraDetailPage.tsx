import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Table, Tag, Modal, Select, Input, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { comprasService } from '../services/compras.service';
import type { Compra, CompraDetalle } from '../types/compra.types';

const EMPRESA_OPTIONS = ['MT INDUSTRIAL S.A.C', 'SOLE S.A.C'] as const;

export default function CompraDetailPage() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();

  const [compra, setCompra]     = useState<Compra | null>(null);
  const [cargando, setCargando] = useState(false);

  // Modal "Registrar unidades"
  const [modalSeries, setModalSeries]         = useState(false);
  const [detalleActivo, setDetalleActivo]     = useState<CompraDetalle | null>(null);
  const [empresa, setEmpresa]                 = useState<string>(EMPRESA_OPTIONS[0]);
  const [seriesTexto, setSeriesTexto]         = useState('');
  const [registrando, setRegistrando]         = useState(false);

  const cargar = async () => {
    if (!id) return;
    setCargando(true);
    try {
      const data = await comprasService.obtener(Number(id));
      setCompra(data);
    } catch {
      message.error('Error al cargar la compra');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, [id]);

  const abrirRegistrar = (detalle: CompraDetalle) => {
    setDetalleActivo(detalle);
    setEmpresa(EMPRESA_OPTIONS[0]);
    setSeriesTexto('');
    setModalSeries(true);
  };

  const confirmarRegistro = async () => {
    if (!detalleActivo) return;
    const series = seriesTexto
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (series.length === 0) {
      message.error('Ingrese al menos un número de serie');
      return;
    }
    setRegistrando(true);
    try {
      await comprasService.registrarUnidades(detalleActivo.id, series, empresa);
      message.success(`${series.length} unidades registradas correctamente`);
      setModalSeries(false);
      cargar();
    } catch {
      message.error('Error al registrar unidades');
    } finally {
      setRegistrando(false);
    }
  };

  const columnas: ColumnsType<CompraDetalle> = [
    {
      title: 'Modelo',
      key: 'modelo',
      render: (_: unknown, r: CompraDetalle) =>
        `${r.modelo.codigo} — ${r.modelo.nombre}`,
    },
    {
      title: 'Tipo',
      key: 'tipo',
      render: (_: unknown, r: CompraDetalle) =>
        r.modelo.tipo
          ? <Tag style={{ fontSize: 11 }}>{r.modelo.tipo}</Tag>
          : <span style={{ color: '#94a3b8' }}>—</span>,
    },
    {
      title: 'Tiene serie',
      key: 'tieneSerie',
      render: (_: unknown, r: CompraDetalle) =>
        r.modelo.tieneSerie
          ? <Tag color="blue">Sí</Tag>
          : <Tag color="default">No</Tag>,
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 90,
    },
    {
      title: 'Precio unitario',
      dataIndex: 'precioUnitario',
      key: 'precioUnitario',
      width: 130,
      render: (v?: number) =>
        v != null
          ? <span style={{ fontVariantNumeric: 'tabular-nums' }}>S/ {v.toFixed(2)}</span>
          : <span style={{ color: '#94a3b8' }}>—</span>,
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 160,
      render: (_: unknown, r: CompraDetalle) => {
        if (r.modelo.tieneSerie) {
          return (
            <button
              className="it-btn"
              style={{ padding: '2px 10px', fontSize: 12 }}
              onClick={() => abrirRegistrar(r)}
            >
              Registrar unidades
            </button>
          );
        }
        return <Tag color="green">Stock ingresado ✓</Tag>;
      },
    },
  ];

  return (
    <div className="anim-fadeIn">
      {/* ---- Page header ---- */}
      <div className="page-header">
        <div>
          <div className="page-title">
            {compra
              ? `Compra #${compra.id} — ${compra.numeroDocumento}`
              : 'Detalle de compra'}
          </div>
          {compra && (
            <div className="page-subtitle">
              {compra.proveedor.nombre}
              {' · '}
              <Tag color="blue" style={{ marginInlineStart: 0 }}>{compra.tipoDocumento}</Tag>
              {' · '}
              {dayjs(compra.fechaDocumento).format('DD/MM/YYYY')}
            </div>
          )}
        </div>

        <button className="it-btn" onClick={() => navigate('/compras')}>
          ← Volver
        </button>
      </div>

      {/* ---- Observaciones ---- */}
      {compra?.observaciones && (
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: '10px 16px',
          marginBottom: 16,
          fontSize: 14,
          color: '#475569',
        }}>
          <strong>Observaciones:</strong> {compra.observaciones}
        </div>
      )}

      {/* ---- Tabla de detalles ---- */}
      <Table<CompraDetalle>
        rowKey="id"
        size="small"
        loading={cargando}
        columns={columnas}
        dataSource={compra?.detalles ?? []}
        pagination={false}
      />

      {/* ---- Modal registrar unidades ---- */}
      <Modal
        title="Registrar unidades"
        open={modalSeries}
        onCancel={() => setModalSeries(false)}
        onOk={confirmarRegistro}
        confirmLoading={registrando}
        okText="Confirmar"
        cancelText="Cancelar"
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>
            Empresa
          </label>
          <Select
            style={{ width: '100%' }}
            value={empresa}
            onChange={(v: string) => setEmpresa(v)}
          >
            {EMPRESA_OPTIONS.map((e) => (
              <Select.Option key={e} value={e}>{e}</Select.Option>
            ))}
          </Select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>
            Números de serie (uno por línea)
          </label>
          <Input.TextArea
            rows={6}
            value={seriesTexto}
            onChange={(e) => setSeriesTexto(e.target.value)}
            placeholder={'SN-001\nSN-002\nSN-003'}
          />
        </div>
      </Modal>
    </div>
  );
}
