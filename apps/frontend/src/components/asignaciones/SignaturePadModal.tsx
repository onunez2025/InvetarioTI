import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Modal, Button, message, Alert } from 'antd';
import {
  ClearOutlined,
  CheckCircleOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { asignacionesService } from '../../services/asignaciones.service';

interface Props {
  open: boolean;
  asignacionId: number | null;
  colaboradorNombre?: string;
  colaboradorDni?: string;
  equipoDescripcion?: string;
  onClose: () => void;
  onSaved: () => void;
}

export const SignaturePadModal: React.FC<Props> = ({
  open,
  asignacionId,
  colaboradorNombre,
  colaboradorDni,
  equipoDescripcion,
  onClose,
  onSaved,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Inicializar canvas limpio al abrir
  const inicializarCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Adaptar a resolución de pantalla (Retina / High DPI)
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 440;
    const height = 180;

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.scale(ratio, ratio);

    // Fondo blanco limpio
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Línea guía tenue de firma
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(30, 140);
    ctx.lineTo(width - 30, 140);
    ctx.stroke();
    ctx.setLineDash([]);

    // Configuración del trazo de firma
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    setHasDrawn(false);
    lastPointRef.current = null;
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(inicializarCanvas, 100);
    }
  }, [open, inicializarCanvas]);

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    setHasDrawn(true);
    const coords = getCanvasCoords(e);
    lastPointRef.current = coords;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentCoords = getCanvasCoords(e);
    const prev = lastPointRef.current;

    if (prev) {
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      // Punto medio para curvas suaves
      const midX = (prev.x + currentCoords.x) / 2;
      const midY = (prev.y + currentCoords.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
      ctx.lineTo(currentCoords.x, currentCoords.y);
      ctx.stroke();
    }

    lastPointRef.current = currentCoords;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(false);
    lastPointRef.current = null;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleGuardar = async () => {
    if (!asignacionId) return;
    if (!hasDrawn) {
      message.warning('Por favor, realiza la firma en el recuadro antes de confirmar.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');

    setGuardando(true);
    try {
      await asignacionesService.registrarFirma(asignacionId, dataUrl);
      message.success('Firma digital registrada y estampada en el Acta de Entrega');
      onSaved();
      onClose();

      // Ofrecer abrir el PDF firmado de inmediato
      Modal.confirm({
        title: '✅ Acta firmada digitalmente',
        content: 'La firma ha sido incrustada en el documento oficial. ¿Deseas abrir el Acta de Entrega con la firma digital ahora?',
        okText: 'Ver Acta Firmada',
        cancelText: 'Cerrar',
        okButtonProps: { style: { background: '#16a34a', borderColor: '#16a34a' } },
        onOk: () => {
          const baseUrl = import.meta.env.VITE_API_URL ?? '';
          window.open(`${baseUrl}/api/asignaciones/acta-individual/${asignacionId}`);
        },
      });
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'Error al guardar la firma digital');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 13,
          }}>
            <EditOutlined />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Firma Digital de Recepción</div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>Acta de Entrega de Equipo TI</div>
          </div>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={500}
      destroyOnClose
      footer={[
        <Button key="limpiar" icon={<ClearOutlined />} onClick={inicializarCanvas} disabled={guardando}>
          Limpiar firma
        </Button>,
        <Button key="cancelar" onClick={onClose} disabled={guardando}>
          Cancelar
        </Button>,
        <Button
          key="guardar"
          type="primary"
          icon={<CheckCircleOutlined />}
          loading={guardando}
          disabled={!hasDrawn}
          onClick={handleGuardar}
          style={{ background: '#2563eb', borderColor: '#2563eb' }}
        >
          Confirmar y Estampar Firma
        </Button>,
      ]}
    >
      <div style={{ marginBottom: 12 }}>
        <div style={{
          background: '#f8fafc',
          borderRadius: 8,
          padding: '10px 12px',
          border: '1px solid #e2e8f0',
          marginBottom: 10,
          fontSize: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ color: '#64748b' }}>Receptor:</span>
            <strong style={{ color: '#0f172a' }}>{colaboradorNombre ?? '—'}</strong>
          </div>
          {colaboradorDni && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ color: '#64748b' }}>DNI / Documento:</span>
              <strong style={{ color: '#0f172a' }}>{colaboradorDni}</strong>
            </div>
          )}
          {equipoDescripcion && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Equipo:</span>
              <span style={{ color: '#2563eb', fontWeight: 600 }}>{equipoDescripcion}</span>
            </div>
          )}
        </div>

        <Alert
          type="info"
          showIcon
          message="El colaborador debe firmar en el recuadro usando el dedo (pantalla táctil), lápiz óptico o mouse."
          style={{ fontSize: 11, padding: '6px 12px', marginBottom: 10 }}
        />

        {/* Lienzo de dibujo interactivo */}
        <div style={{
          position: 'relative',
          borderRadius: 10,
          border: '2px solid #cbd5e1',
          overflow: 'hidden',
          background: '#ffffff',
          boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.05)',
        }}>
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: 180,
              display: 'block',
              cursor: 'crosshair',
              touchAction: 'none',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
          <div style={{
            position: 'absolute',
            bottom: 8,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 11,
            color: '#94a3b8',
            pointerEvents: 'none',
            userSelect: 'none',
          }}>
            Firme sobre la línea punteada
          </div>
        </div>
      </div>
    </Modal>
  );
};
