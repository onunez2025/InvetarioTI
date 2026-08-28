import { useEffect, useState } from 'react';
import { Button, Typography, Space, message, Modal, Upload, Divider } from 'antd';
import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { useEquiposStore } from '../store/equiposStore';
import { useAuthStore } from '../store/authStore';
import { equiposService } from '../services/equipos.service';
import TablaEquipos from '../components/equipos/TablaEquipos';
import FormEquipo from '../components/equipos/FormEquipo';
import type { Equipo } from '../types/equipo.types';

const { Title } = Typography;

export default function EquiposPage() {
  const { equipos, total, cargando, filtros, setFiltros, cargar } = useEquiposStore();
  const token = useAuthStore((s) => s.token);

  // Derivar rol del JWT (payload.rol)
  const rolUsuario = (() => {
    if (!token) return 'VISUALIZADOR';
    try {
      return JSON.parse(atob(token.split('.')[1])).rol as string;
    } catch {
      return 'VISUALIZADOR';
    }
  })();

  const [formAbierto, setFormAbierto] = useState(false);
  const [equipoEditar, setEquipoEditar] = useState<Equipo | null>(null);
  const [importando, setImportando] = useState(false);

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => { setEquipoEditar(null); setFormAbierto(true); };
  const abrirEditar = (equipo: Equipo) => { setEquipoEditar(equipo); setFormAbierto(true); };
  const cerrarForm = () => setFormAbierto(false);

  const darDeBaja = (id: number) => {
    Modal.confirm({
      title: '¿Dar de baja este equipo?',
      content: 'El equipo cambiará a estado BAJA. Esta acción puede revertirse editándolo.',
      okText: 'Confirmar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        await equiposService.eliminar(id);
        message.success('Equipo dado de baja');
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
            <ul style={{ maxHeight: 200, overflow: 'auto' }}>
              {resultado.detalles.map((d, i) => <li key={i}>{d}</li>)}
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
    return false; // evitar upload automático de antd
  };

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Title level={4} style={{ margin: 0 }}>Equipos</Title>
        <Space>
          {['ADMIN'].includes(rolUsuario) && (
            <Upload
              accept=".xlsx,.xls"
              showUploadList={false}
              beforeUpload={importarExcel}
            >
              <Button icon={<UploadOutlined />} loading={importando}>
                Importar Excel
              </Button>
            </Upload>
          )}
          {['ADMIN', 'GERENTE', 'TECNICO'].includes(rolUsuario) && (
            <Button type="primary" icon={<PlusOutlined />} onClick={abrirCrear}>
              Nuevo equipo
            </Button>
          )}
        </Space>
      </Space>

      <Divider style={{ margin: '0 0 16px' }} />

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

      <FormEquipo
        abierto={formAbierto}
        equipo={equipoEditar}
        onCerrar={cerrarForm}
        onGuardado={cargar}
      />
    </div>
  );
}
