import { useEffect, useState, useRef } from 'react';
import { Alert } from 'antd';
import {
  LaptopOutlined,
  CheckCircleOutlined,
  ToolOutlined,
  WarningOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { equiposService } from '../services/equipos.service';
import { useAuthStore } from '../store/authStore';
import type { Equipo } from '../types/equipo.types';

/* ---- Helpers ---- */

function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return { text: 'Buenos días',    emoji: '☀️' };
  if (h >= 12 && h < 19) return { text: 'Buenas tardes',  emoji: '🌤️' };
  return                         { text: 'Buenas noches',  emoji: '🌙' };
}

function agrupar<T>(arr: T[], clave: keyof T): { name: string; value: number }[] {
  const mapa: Record<string, number> = {};
  for (const item of arr) {
    const k = String(item[clave] ?? 'Sin dato');
    mapa[k] = (mapa[k] ?? 0) + 1;
  }
  return Object.entries(mapa)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/* ---- Count-up hook ---- */
function useCountUp(target: number, duration = 1100): number {
  const [count, setCount]   = useState(0);
  const frameRef            = useRef<number>(0);
  const targetRef           = useRef(target);
  targetRef.current         = target;

  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased    = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(targetRef.current * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return count;
}

/* ---- KPI Card ---- */
interface KpiProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  accentColor: string;
  iconBg: string;
  iconColor: string;
  trendText: string;
  trendColor: string;
  delay?: number;
}

function KpiCard({ label, value, icon, accentColor, iconBg, iconColor, trendText, trendColor, delay = 0 }: KpiProps) {
  const displayValue = useCountUp(value);
  return (
    <div
      className="kpi-card anim-fadeInUp"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="kpi-accent-bar" style={{ background: accentColor }} />
      <div className="kpi-icon" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
      <div className="kpi-value">{displayValue.toLocaleString('es-PE')}</div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-trend" style={{ color: trendColor }}>
        <RiseOutlined aria-hidden="true" />
        {trendText}
      </div>
    </div>
  );
}

/* ---- Chart colors ---- */
const ESTADO_COLORS: Record<string, string> = {
  ACTIVO:        '#10b981',
  BAJA:          '#ef4444',
  MANTENIMIENTO: '#f59e0b',
};

const TIPO_COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6',
  '#a78bfa', '#c084fc', '#e879f9', '#f472b6',
];

/* ---- Custom Tooltip for charts ---- */
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff',
      border: '1.5px solid #e2e8f0',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 13,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    }}>
      {label && <div style={{ color: '#0f172a', fontWeight: 600, marginBottom: 4 }}>{label}</div>}
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color ?? '#64748b', fontWeight: 500 }}>
          {p.name ?? p.dataKey}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

/* ---- Loading skeleton ---- */
function SkeletonCard() {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: 20,
      border: '1.5px solid #e2e8f0',
      overflow: 'hidden',
    }}>
      {[40, 60, 30].map((w, i) => (
        <div
          key={i}
          style={{
            height: i === 0 ? 40 : i === 1 ? 28 : 14,
            width: `${w}%`,
            background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
            backgroundSize: '400px 100%',
            borderRadius: 6,
            marginBottom: 10,
            animation: 'shimmerBg 1.4s linear infinite',
          }}
        />
      ))}
    </div>
  );
}

/* ============================================================
   DASHBOARD PAGE
   ============================================================ */
export default function DashboardPage() {
  const [equipos,  setEquipos]  = useState<Equipo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const usuario = useAuthStore((s) => s.usuario);
  const { text: greeting, emoji } = getGreeting();

  useEffect(() => {
    equiposService
      .listar({ limit: 1000 })
      .then(({ data }) => setEquipos(data))
      .catch(() => setError('No se pudieron cargar los datos del dashboard.'))
      .finally(() => setCargando(false));
  }, []);

  /* ---- Computed stats ---- */
  const total       = equipos.length;
  const activos     = equipos.filter((e) => e.estado === 'ACTIVO').length;
  const mantenimto  = equipos.filter((e) => e.estado === 'MANTENIMIENTO').length;
  const bajas       = equipos.filter((e) => e.estado === 'BAJA').length;

  const hoy = new Date();
  const proximosFin = equipos.filter((e) => {
    if (!e.modelo?.endOfSupport) return false;
    const diff = (new Date(e.modelo.endOfSupport).getTime() - hoy.getTime()) / 86400000;
    return diff >= 0 && diff <= 180;
  }).length;

  const porEstado = agrupar(equipos, 'estado');
  const porTipo   = (() => {
    const mapa: Record<string, number> = {};
    for (const e of equipos) {
      const k = e.modelo?.tipo ?? 'Sin dato';
      mapa[k] = (mapa[k] ?? 0) + 1;
    }
    return Object.entries(mapa).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 7);
  })();

  /* ---- Render ---- */
  return (
    <div>
      {/* ---- Greeting banner ---- */}
      <div className="greeting-banner">
        <div className="greeting-bg-circles" aria-hidden="true" />
        <div style={{
          width: 48, height: 48,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26,
          flexShrink: 0,
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          {emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
          <div style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>
            {greeting},{' '}
            <span style={{ color: '#60a5fa' }}>
              {usuario?.nombre?.split(' ')[0] ?? 'Usuario'}
            </span>
          </div>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>
            {cargando
              ? 'Cargando datos del inventario...'
              : `${total.toLocaleString('es-PE')} equipo${total !== 1 ? 's' : ''} registrado${total !== 1 ? 's' : ''} · ${new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}`
            }
          </div>
        </div>
        <div
          className="hide-mobile"
          style={{
            padding: '6px 14px',
            background: 'rgba(59,130,246,0.15)',
            border: '1px solid rgba(59,130,246,0.25)',
            borderRadius: 20,
            color: '#60a5fa',
            fontSize: 12,
            fontWeight: 600,
            flexShrink: 0,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {usuario?.rol ?? 'USUARIO'}
        </div>
      </div>

      {/* ---- Error ---- */}
      {error && (
        <Alert
          type="error"
          message={error}
          style={{ marginBottom: 16, borderRadius: 10 }}
          showIcon
        />
      )}

      {/* ---- KPI Grid ---- */}
      {cargando ? (
        <div className="kpi-grid" style={{ marginBottom: 20 }}>
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="kpi-grid">
          <KpiCard
            label="Total equipos"
            value={total}
            icon={<LaptopOutlined aria-hidden="true" />}
            accentColor="#3b82f6"
            iconBg="#dbeafe"
            iconColor="#1d4ed8"
            trendText="inventario completo"
            trendColor="#3b82f6"
            delay={0.05}
          />
          <KpiCard
            label="Activos"
            value={activos}
            icon={<CheckCircleOutlined aria-hidden="true" />}
            accentColor="#10b981"
            iconBg="#dcfce7"
            iconColor="#065f46"
            trendText={total > 0 ? `${Math.round((activos / total) * 100)}% del parque` : '—'}
            trendColor="#10b981"
            delay={0.10}
          />
          <KpiCard
            label="En mantenimiento"
            value={mantenimto}
            icon={<ToolOutlined aria-hidden="true" />}
            accentColor="#f59e0b"
            iconBg="#fef3c7"
            iconColor="#92400e"
            trendText={total > 0 ? `${Math.round((mantenimto / total) * 100)}% del parque` : '—'}
            trendColor="#f59e0b"
            delay={0.15}
          />
          <KpiCard
            label="Fin de soporte ≤ 6 meses"
            value={proximosFin}
            icon={<WarningOutlined aria-hidden="true" />}
            accentColor={proximosFin > 0 ? '#ef4444' : '#10b981'}
            iconBg={proximosFin > 0 ? '#fee2e2' : '#dcfce7'}
            iconColor={proximosFin > 0 ? '#991b1b' : '#065f46'}
            trendText={proximosFin > 0 ? 'requieren atención' : 'sin alertas'}
            trendColor={proximosFin > 0 ? '#ef4444' : '#10b981'}
            delay={0.20}
          />
        </div>
      )}

      {/* ---- Charts ---- */}
      {!cargando && equipos.length > 0 && (
        <div className="charts-grid">
          {/* Donut: estado */}
          <div className="chart-card anim-fadeInUp" style={{ animationDelay: '0.25s' }}>
            <div className="chart-title">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 3a9 9 0 019 9" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              Estado del parque
              <span className="chart-title-sub">{total} equipos</span>
            </div>

            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={porEstado}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={88}
                  paddingAngle={2}
                  strokeWidth={2}
                  stroke="#f8fafc"
                >
                  {porEstado.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={ESTADO_COLORS[entry.name] ?? '#94a3b8'}
                    />
                  ))}
                  {/* Center label via custom label */}
                </Pie>
                <ReTooltip content={<ChartTooltip />} />
                <Legend
                  formatter={(value) => (
                    <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Custom summary below */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              {porEstado.map((e) => (
                <div
                  key={e.name}
                  style={{
                    flex: 1,
                    minWidth: 70,
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700, color: ESTADO_COLORS[e.name] ?? '#64748b' }}>
                    {e.value}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, fontWeight: 500 }}>
                    {e.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bar: tipos */}
          <div className="chart-card anim-fadeInUp" style={{ animationDelay: '0.30s' }}>
            <div className="chart-title">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 20V8l5-5 5 5 5-5v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Equipos por tipo
              <span className="chart-title-sub">top {porTipo.length}</span>
            </div>

            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={porTipo}
                margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
                barSize={28}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <ReTooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: 'rgba(59,130,246,0.06)', radius: 4 }}
                />
                <Bar
                  dataKey="value"
                  name="Equipos"
                  radius={[6, 6, 0, 0]}
                  label={{ position: 'top', fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                >
                  {porTipo.map((_, i) => (
                    <Cell key={i} fill={TIPO_COLORS[i % TIPO_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ---- Empty state ---- */}
      {!cargando && !error && equipos.length === 0 && (
        <div
          className="anim-fadeIn"
          style={{
            background: '#fff',
            borderRadius: 14,
            border: '1.5px solid #e2e8f0',
            padding: '56px 32px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 52, marginBottom: 16 }}>🗄️</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
            Sin equipos registrados
          </div>
          <div style={{ fontSize: 13, color: '#64748b', maxWidth: 320, margin: '0 auto' }}>
            Importa equipos desde Excel o crea el primero manualmente desde la sección Equipos.
          </div>
        </div>
      )}

      {/* ---- Quick stats footer ---- */}
      {!cargando && equipos.length > 0 && (
        <div
          className="anim-fadeInUp"
          style={{
            background: '#fff',
            borderRadius: 12,
            border: '1.5px solid #e2e8f0',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            flexWrap: 'wrap',
            marginTop: 14,
          }}
        >
          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>RESUMEN</span>
          {[
            { label: 'Total', value: total, color: '#3b82f6' },
            { label: 'Activos', value: activos, color: '#10b981' },
            { label: 'Mantenimiento', value: mantenimto, color: '#f59e0b' },
            { label: 'Dados de baja', value: bajas, color: '#ef4444' },
            { label: 'Por vencer ≤180d', value: proximosFin, color: proximosFin > 0 ? '#ef4444' : '#10b981' },
          ].map((s) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#64748b' }}>
                {s.label}: <strong style={{ color: s.color }}>{s.value}</strong>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
