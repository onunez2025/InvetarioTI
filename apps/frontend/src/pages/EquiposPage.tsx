import { useEffect, useState } from 'react';
import { Upload, Modal, message } from 'antd';
import {
  PlusOutlined,
  UploadOutlined,
  DownloadOutlined,
  LaptopOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import { useEquiposStore } from '../store/equiposStore';
import { useAuthStore } from '../store/authStore';
import { equiposService } from '../services/equipos.service';
import { reportesService } from '../services/reportes.service';
import TablaEquipos from '../components/equipos/TablaEquipos';
import FormEquipo from '../components/equipos/FormEquipo';
import type { Equipo } from '../types/equipo.types';

export default function EquiposPage() {
  const { equipos, total, cargando, filtros, setFiltros, cargar } = useEquiposStore();
  const token = useAuthStore((s) => s.token);

  /* Derive role from JWT */
  const rolUsuario = (() => {
    if (!token) return 'VISUALIZADOR';
    try {
      return JSON.parse(atob(token.split('.')[1])).rol as string;
    } catch {
      return 'VISUALIZADOR';
    }
  })();

  const [formAbierto, setFormAbierto]   = useState(false);
  const [equipoEditar, setEquipoEditar] = useState<Equipo | null>(null);
  const [importando, setImportando]     = useState(false);

  useEffect(() => { cargar(); }, []);

  const abrirCrear  = () => { setEquipoEditar(null); setFormAbierto(true); };
  const abrirEditar = (equipo: Equipo) => { setEquipoEditar(equipo); setFormAbierto(true); };
  const cerrarForm  = () => setFormAbierto(false);

  const darDeBaja = (id: number) => {
    Modal.confirm({
      title: '¿Dar de baja este equipo?',
      content: 'El equipo cambiará a estado BAJA. Esta acción puede revertirse editándolo.',
      okText: 'Confirmar baja',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        await equiposService.eliminar(id);
        message.success('Equipo dado de baja correctamente');
        cargar();
      },
    });
  };

  const importarExcel = async (archivo: File) => {
    setImportando(true);
    try {
      const resultado = await equiposService.importarExcel(archivo);
      message.success(`Importados: ${resultado.importados} — Errores: ${resultado.errores}`);
      if (resultado.errores > 0) {
        Modal.warning({
          title: 'Algunas filas no se importaron',
          content: (
            <ul style={{ maxHeight: 200, overflowY: 'auto', paddingLeft: 18 }}>
              {resultado.detalles.map((d: string, i: number) => (
                <li key={i} style={{ marginBottom: 4, fontSize: 13 }}>{d}</li>
              ))}
            </ul>
          ),
        });
      }
      cargar();
    } catch {
      message.error('Error al importar el archivo Excel');
    } finally {
      setImportando(false);
    }
    return false; // prevent antd auto-upload
  };

  const puedeImportar = ['ADMIN'].includes(rolUsuario);

  const descargarPlantilla = async () => {
    try {
      const resp = await api.get('/api/integraciones/plantilla', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Plantilla_Inventario_Equipos.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error('No se pudo descargar la plantilla');
    }
  };
  const puedeCrear    = ['ADMIN', 'GERENTE', 'TECNICO'].includes(rolUsuario);

  return (
    <div className="anim-fadeIn">
      {/* ---- Page header ---- */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
            <div style={{
              width: 36, height: 36,
              background: '#dbeafe',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#1d4ed8',
              fontSize: 18,
            }}>
              <LaptopOutlined aria-hidden="true" />
            </div>
            <div>
              <div className="page-title">Equipos</div>
              <div className="page-subtitle">
                {cargando ? 'Cargando...' : `${total.toLocaleString('es-PE')} equipo${total !== 1 ? 's' : ''} registrado${total !== 1 ? 's' : ''}`}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {puedeImportar && (
            <>
              <button className="it-btn" onClick={descargarPlantilla} title="Descargar plantilla Excel para importar equipos">
                <DownloadOutlined aria-hidden="true" />
                Plantilla
              </button>
              <Upload
                accept=".xlsx,.xls"
                showUploadList={false}
                beforeUpload={importarExcel}
              >
                <button
                  className="it-btn"
                  disabled={importando}
                  style={{ cursor: importando ? 'not-allowed' : 'pointer', opacity: importando ? 0.7 : 1 }}
                >
                  {importando ? (
                    <div style={{
                      width: 14, height: 14,
                      border: '2px solid #e2e8f0',
                      borderTop: '2px solid #64748b',
                      borderRadius: '50%',
                      animation: 'spin 0.75s linear infinite',
                    }} />
                  ) : (
                    <UploadOutlined aria-hidden="true" />
                  )}
                  {importando ? 'Importando...' : 'Importar Excel'}
                </button>
              </Upload>
            </>
          )}

          <button
            className="it-btn"
            onClick={() =>
              reportesService.equipos({
                ...(filtros.estado && { estado: filtros.estado }),
                ...(filtros.gerencia && { gerencia: filtros.gerencia }),
                ...(filtros.modeloId && { modeloId: String(filtros.modeloId) }),
              })
            }
            title="Exportar listado a Excel"
          >
            <DownloadOutlined aria-hidden="true" />
            Exportar
          </button>

          {puedeCrear && (
            <button className="it-btn it-btn-primary" onClick={abrirCrear}>
              <PlusOutlined aria-hidden="true" />
              Nuevo equipo
            </button>
          )}
        </div>
      </div>

      {/* ---- Table ---- */}
      <TablaEquipos
        equipos={equipos}
        total={total}
        cargando={cargando}
        filtros={filtros}
        rolUsuario={rolUsuario}
        onFiltrar={setFiltros}
        onEditar={abrirEditar}
        onEliminar={darDeBaja}
        onRecargar={cargar}
      />

      {/* ---- Form modal ---- */}
      <FormEquipo
        abierto={formAbierto}
        equipo={equipoEditar}
        onCerrar={cerrarForm}
        onGuardado={cargar}
      />
    </div>
  );
}
