import { Table, Tag, Button, Space, Input, Select, Tooltip, Typography } from 'antd';
import {
  EditOutlined, StopOutlined, SearchOutlined, ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Equipo, FiltrosEquipos } from '../../types/equipo.types';

const { Text } = Typography;

const COLORES_ESTADO: Record<string, string> = {
  ACTIVO: 'success',
  BAJA: 'error',
  MANTENIMIENTO: 'warning',
};

const TIPOS = ['SWITCH', 'SERVIDOR', 'PC', 'LAPTOP', 'ROUTER', 'ACCESS POINT',
  'FIREWALL', 'UPS', 'IMPRESORA', 'OTRO'];

interface Props {
  equipos: Equipo[];
  total: number;
  cargando: boolean;
  filtros: FiltrosEquipos;
  rolUsuario: string;
  onFiltrar: (f: Partial<FiltrosEquipos>) => void;
  onEditar: (equipo: Equipo) => void;
  onEliminar: (id: number) => void;
  onRecargar: () => void;
}

export default function TablaEquipos({
  equipos, total, cargando, filtros, rolUsuario,
  onFiltrar, onEditar, onEliminar, onRecargar,
}: Props) {
  const puedeEditar = ['ADMIN', 'GERENTE', 'TECNICO'].includes(rolUsuario);
  const puedeEliminar = ['ADMIN', 'GERENTE'].includes(rolUsuario);

  const columnas: ColumnsType<Equipo> = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      ellipsis: true,
      width: 200,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    { title: 'Tipo', dataIndex: 'tipo', key: 'tipo', width: 120 },
    { title: 'Marca', dataIndex: 'marca', key: 'marca', width: 110 },
    { title: 'Modelo', dataIndex: 'modelo', key: 'modelo', ellipsis: true, width: 160 },
    { title: 'Departamento', dataIndex: 'departamento', key: 'departamento', width: 140 },
    { title: 'Ubicación', dataIndex: 'ubicacion', key: 'ubicacion', ellipsis: true, width: 140 },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 120,
      render: (v: string) => <Tag color={COLORES_ESTADO[v]}>{v}</Tag>,
    },
    {
      title: 'Fin soporte',
      dataIndex: 'endOfSupport',
      key: 'endOfSupport',
      width: 120,
      render: (fecha: string) => {
        if (!fecha) return <Text type="secondary">—</Text>;
        const d = new Date(fecha);
        const dias = Math.ceil((d.getTime() - Date.now()) / 86400000);
        const color: 'danger' | 'warning' | undefined =
          dias < 0 ? 'danger' : dias < 180 ? 'warning' : undefined;
        return <Text type={color}>{d.toLocaleDateString('es-PE')}</Text>;
      },
    },
    {
      title: 'Acciones',
      key: 'acciones',
      fixed: 'right',
      width: 90,
      render: (_: unknown, record: Equipo) => (
        <Space>
          {puedeEditar && (
            <Tooltip title="Editar">
              <Button
                type="text" size="small"
                icon={<EditOutlined />}
                onClick={() => onEditar(record)}
              />
            </Tooltip>
          )}
          {puedeEliminar && record.estado !== 'BAJA' && (
            <Tooltip title="Dar de baja">
              <Button
                type="text" size="small" danger
                icon={<StopOutlined />}
                onClick={() => onEliminar(record.id)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Barra de filtros */}
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Buscar nombre..."
          prefix={<SearchOutlined />}
          allowClear
          style={{ width: 220 }}
          defaultValue={filtros.busqueda}
          onSearch={(v) => onFiltrar({ busqueda: v || undefined, page: 1 })}
        />
        <Select
          placeholder="Tipo"
          allowClear
          style={{ width: 160 }}
          value={filtros.tipo}
          onChange={(v) => onFiltrar({ tipo: v, page: 1 })}
          options={TIPOS.map((t) => ({ value: t, label: t }))}
        />
        <Select
          placeholder="Estado"
          allowClear
          style={{ width: 160 }}
          value={filtros.estado}
          onChange={(v) => onFiltrar({ estado: v, page: 1 })}
          options={['ACTIVO', 'BAJA', 'MANTENIMIENTO'].map((e) => ({ value: e, label: e }))}
        />
        <Tooltip title="Recargar">
          <Button icon={<ReloadOutlined />} onClick={onRecargar} />
        </Tooltip>
      </Space>

      <Table<Equipo>
        columns={columnas}
        dataSource={equipos}
        rowKey="id"
        loading={cargando}
        scroll={{ x: 1200 }}
        size="small"
        pagination={{
          current: filtros.page ?? 1,
          pageSize: filtros.limit ?? 50,
          total,
          showTotal: (t) => `${t} equipos`,
          showSizeChanger: true,
          pageSizeOptions: ['25', '50', '100'],
          onChange: (page, limit) => onFiltrar({ page, limit }),
        }}
      />
    </div>
  );
}
