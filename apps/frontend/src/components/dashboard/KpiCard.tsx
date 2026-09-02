import { Card } from 'antd';
import React from 'react';

interface Props {
  icon: React.ReactNode;
  label: string;
  value: number;
  color?: string;
  alert?: boolean;
  onClick?: () => void;
}

const COLORS: Record<string, string> = {
  blue: '#3b82f6',
  green: '#10b981',
  yellow: '#f59e0b',
  red: '#ef4444',
  gray: '#94a3b8',
};

export const KpiCard: React.FC<Props> = ({
  icon,
  label,
  value,
  color = 'blue',
  alert,
  onClick,
}) => (
  <Card
    onClick={onClick}
    style={{
      cursor: onClick ? 'pointer' : 'default',
      borderLeft: `4px solid ${alert ? '#ef4444' : COLORS[color] ?? COLORS.blue}`,
      borderRadius: 8,
    }}
    styles={{ body: { padding: '16px 20px' } }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 28, color: alert ? '#ef4444' : COLORS[color] ?? COLORS.blue }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>
          {(value ?? 0).toLocaleString()}
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  </Card>
);
