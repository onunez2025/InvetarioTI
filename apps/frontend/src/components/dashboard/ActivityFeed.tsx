import { List, Tag } from 'antd';
import React from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';

dayjs.extend(relativeTime);
dayjs.locale('es');

const ACCION_COLOR: Record<string, string> = {
  CREATE: 'green',
  UPDATE: 'blue',
  DELETE: 'red',
};

export interface FeedItem {
  id: number;
  tabla: string;
  accion: string;
  descripcion: string;
  usuario: string;
  fecha: string;
}

export const ActivityFeed: React.FC<{ data: FeedItem[]; loading: boolean }> = ({
  data,
  loading,
}) => (
  <List
    loading={loading}
    dataSource={data}
    rowKey="id"
    size="small"
    renderItem={(item) => (
      <List.Item style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Tag color={ACCION_COLOR[item.accion] ?? 'default'} style={{ fontSize: 10 }}>
              {item.accion}
            </Tag>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>{dayjs(item.fecha).fromNow()}</span>
          </div>
          <div style={{ fontSize: 12, color: '#334155', marginTop: 2 }}>{item.descripcion}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            por {item.usuario} · {item.tabla}
          </div>
        </div>
      </List.Item>
    )}
  />
);
