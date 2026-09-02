import { Table, Tag, Badge } from 'antd';
import React from 'react';

export interface EosRow {
  modeloId: number;
  codigo: string;
  nombre: string;
  tipo: string;
  marca: string;
  endOfSupport: string;
  diasRestantes: number;
  totalUnidades: number;
}

export const EosTable: React.FC<{ data: EosRow[]; loading: boolean }> = ({ data, loading }) => (
  <Table
    dataSource={data}
    rowKey="modeloId"
    loading={loading}
    size="small"
    pagination={false}
    scroll={{ y: 220 }}
    columns={[
      { title: 'Código', dataIndex: 'codigo', width: 100 },
      { title: 'Nombre', dataIndex: 'nombre', ellipsis: true },
      {
        title: 'Tipo',
        dataIndex: 'tipo',
        width: 100,
        render: (t: string) => <Tag>{t}</Tag>,
      },
      {
        title: 'End of Support',
        dataIndex: 'endOfSupport',
        width: 130,
        render: (v: string, r: EosRow) => {
          const color =
            r.diasRestantes < 0
              ? 'red'
              : r.diasRestantes < 30
                ? 'red'
                : r.diasRestantes < 90
                  ? 'orange'
                  : 'default';
          return (
            <Badge
              status={color === 'red' ? 'error' : color === 'orange' ? 'warning' : 'default'}
              text={v?.split('T')[0]}
            />
          );
        },
      },
      {
        title: 'Días',
        dataIndex: 'diasRestantes',
        width: 70,
        render: (d: number) => (
          <span
            style={{
              color: d < 0 ? '#ef4444' : d < 90 ? '#f59e0b' : '#64748b',
              fontWeight: 600,
            }}
          >
            {d < 0 ? 'VENCIDO' : d}
          </span>
        ),
      },
      { title: 'Unidades', dataIndex: 'totalUnidades', width: 80, align: 'right' },
    ]}
  />
);
