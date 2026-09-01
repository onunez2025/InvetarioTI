import { useState, useEffect, useCallback } from 'react';
import { Drawer, Tooltip } from 'antd';
import {
  DashboardOutlined,
  LaptopOutlined,
  HistoryOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  SearchOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useEquiposStore } from '../store/equiposStore';

/* ---- Types ---- */
interface NavItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  badge?: number | null;
  section: 'principal' | 'sistema';
  roles?: string[];   // si está definido, solo esos roles pueden ver el ítem
}

/* ---- Navigation config ---- */
const navItems: NavItem[] = [
  { key: '/dashboard',    icon: <DashboardOutlined />, label: 'Dashboard',     section: 'principal' },
  { key: '/equipos',      icon: <LaptopOutlined />,    label: 'Equipos',       section: 'principal' },
  { key: '/asignaciones', icon: <SwapOutlined />,      label: 'Asignaciones',  section: 'principal', roles: ['ADMIN','GERENTE','TECNICO'] },
  { key: '/historial',    icon: <HistoryOutlined />,   label: 'Historial',     section: 'principal', roles: ['ADMIN','GERENTE','TECNICO'] },
  { key: '/usuarios',     icon: <TeamOutlined />,      label: 'Usuarios',      section: 'sistema',   roles: ['ADMIN','GERENTE'] },
  { key: '/config',       icon: <SettingOutlined />,   label: 'Configuración', section: 'sistema',   roles: ['ADMIN'] },
];

/* ---- Logo SVG ---- */
function LogoIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" stroke="#fff" strokeWidth="2" />
      <path d="M8 21h8M12 17v4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="10" r="2" stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}

/* ---- Sidebar content (shared between fixed sidebar + Drawer) ---- */
function SidebarContent({
  collapsed,
  onNavigate,
  onLogout,
  equiposTotal,
}: {
  collapsed: boolean;
  onNavigate: (key: string) => void;
  onLogout: () => void;
  equiposTotal: number;
}) {
  const location = useLocation();
  const usuario  = useAuthStore((s) => s.usuario);

  const initials = usuario?.nombre
    ? usuario.nombre.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : (usuario?.email?.[0] ?? 'U').toUpperCase();

  const itemsWithBadge = navItems.map((item) => ({
    ...item,
    badge: item.key === '/equipos' && equiposTotal > 0 ? equiposTotal : null,
  }));

  // Filtrar por rol
  const visibles = itemsWithBadge.filter(item =>
    !item.roles || (usuario?.rol && item.roles.includes(usuario.rol)),
  );

  const principalItems = visibles.filter((i) => i.section === 'principal');
  const sistemaItems   = visibles.filter((i) => i.section === 'sistema');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div className="it-sidebar-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <div style={{
            width: 34, height: 34,
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(37,99,235,0.4)',
          }}>
            <LogoIcon size={16} />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                InventarioTI
              </div>
              <div style={{ color: '#475569', fontSize: 10, marginTop: 1, whiteSpace: 'nowrap' }}>
                Gestión de Activos
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: '12px 10px', overflowY: 'auto', overflowX: 'hidden' }}>
        {/* Principal section */}
        {!collapsed && <div className="it-sidebar-section-label">Principal</div>}
        {principalItems.map((item) => {
          const isActive = location.pathname === item.key ||
            (item.key !== '/dashboard' && location.pathname.startsWith(item.key));
          return (
            <Tooltip key={item.key} title={collapsed ? item.label : ''} placement="right">
              <div
                className={`sb-item${isActive ? ' active' : ''}`}
                onClick={() => onNavigate(item.key)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onNavigate(item.key)}
                aria-label={item.label}
              >
                <span className="sb-icon">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && item.badge != null && (
                  <span className="sb-badge">{item.badge > 999 ? '999+' : item.badge}</span>
                )}
              </div>
            </Tooltip>
          );
        })}

        {/* Sistema section */}
        {sistemaItems.length > 0 && (
          <>
            {!collapsed && (
              <div className="it-sidebar-section-label" style={{ marginTop: 18 }}>Sistema</div>
            )}
            {collapsed && <div style={{ height: 12 }} />}
            {sistemaItems.map((item) => {
              const isActive = location.pathname === item.key;
              return (
                <Tooltip key={item.key} title={collapsed ? item.label : ''} placement="right">
                  <div
                    className={`sb-item${isActive ? ' active' : ''}`}
                    onClick={() => onNavigate(item.key)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && onNavigate(item.key)}
                    aria-label={item.label}
                  >
                    <span className="sb-icon">{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                  </div>
                </Tooltip>
              );
            })}
          </>
        )}
      </div>

      {/* User section */}
      <div className="sb-user-section">
        <div className="sb-avatar" aria-hidden="true">{initials}</div>
        {!collapsed && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                color: '#f1f5f9', fontSize: 12, fontWeight: 600,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {usuario?.nombre ?? 'Usuario'}
              </div>
              <div style={{ color: '#475569', fontSize: 10, marginTop: 1 }}>
                {usuario?.rol ?? '—'}
              </div>
            </div>
            <Tooltip title="Cerrar sesión" placement="right">
              <div
                onClick={onLogout}
                role="button" tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onLogout()}
                aria-label="Cerrar sesión"
                style={{ color: '#475569', fontSize: 15, cursor: 'pointer', padding: 4, borderRadius: 6, transition: 'color 0.2s', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.color = '#ef4444'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.color = '#475569'; }}
              >
                <LogoutOutlined />
              </div>
            </Tooltip>
          </>
        )}
        {collapsed && (
          <Tooltip title="Cerrar sesión" placement="right">
            <div
              onClick={onLogout}
              role="button" tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onLogout()}
              aria-label="Cerrar sesión"
              style={{ color: '#475569', fontSize: 14, cursor: 'pointer', padding: 4, borderRadius: 6 }}
            >
              <LogoutOutlined />
            </div>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

/* ---- Logout Overlay ---- */
function LogoutOverlay({ nombre }: { nombre: string }) {
  return (
    <div className="logout-overlay" role="status" aria-live="polite">
      <div className="logout-icon-wrap">
        <div className="logout-pulse" />
        <div style={{ fontSize: 34 }}>👋</div>
      </div>
      <div style={{ color: '#f1f5f9', fontSize: 24, fontWeight: 700, marginTop: 24, animation: 'fadeInDown 0.5s ease 0.3s both' }}>
        ¡Hasta pronto, {nombre.split(' ')[0]}!
      </div>
      <div style={{ color: '#475569', fontSize: 14, marginTop: 8, animation: 'fadeInDown 0.5s ease 0.5s both' }}>
        Cerrando sesión de forma segura...
      </div>
      <div style={{ marginTop: 28, display: 'flex', gap: 6, animation: 'fadeInDown 0.5s ease 0.7s both' }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%', background: '#3b82f6',
            animation: `pulse 1.2s ease ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

/* ---- Page title map ---- */
const PAGE_TITLES: Record<string, string> = {
  '/dashboard':    'Dashboard',
  '/equipos':      'Equipos',
  '/asignaciones': 'Asignaciones',
  '/historial':    'Historial de cambios',
  '/usuarios':     'Usuarios',
  '/config':       'Configuración',
};

/* ============================================================
   MAIN LAYOUT
   ============================================================ */
export default function MainLayout() {
  const [collapsed, setCollapsed]   = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [isMobile, setIsMobile]     = useState(window.innerWidth < 768);
  const navigate  = useNavigate();
  const location  = useLocation();
  const logout    = useAuthStore((s) => s.logout);
  const usuario   = useAuthStore((s) => s.usuario);
  const total     = useEquiposStore((s) => s.total);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const handleLogout = useCallback(() => {
    setShowLogout(true);
    if (drawerOpen) setDrawerOpen(false);
    setTimeout(() => { logout(); navigate('/login'); }, 2000);
  }, [logout, navigate, drawerOpen]);

  const handleNavigate = useCallback((key: string) => {
    navigate(key);
    if (drawerOpen) setDrawerOpen(false);
  }, [navigate, drawerOpen]);

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'InventarioTI';

  return (
    <>
      {showLogout && <LogoutOverlay nombre={usuario?.nombre ?? 'Usuario'} />}

      <div className="app-shell">
        {/* Desktop sidebar */}
        {!isMobile && (
          <div className={`it-sidebar${collapsed ? ' collapsed' : ''}`}>
            <SidebarContent collapsed={collapsed} onNavigate={handleNavigate} onLogout={handleLogout} equiposTotal={total} />
          </div>
        )}

        {/* Mobile Drawer */}
        <Drawer
          className="it-drawer"
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #2563eb, #3b82f6)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LogoIcon size={14} />
              </div>
              <span style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 700 }}>InventarioTI</span>
            </div>
          }
          placement="left"
          onClose={() => setDrawerOpen(false)}
          open={drawerOpen}
          width={240}
          styles={{
            body:   { padding: 0, background: '#0f1629' },
            header: { background: '#0f1629', borderBottom: '1px solid rgba(255,255,255,0.06)' },
          }}
        >
          <SidebarContent collapsed={false} onNavigate={handleNavigate} onLogout={handleLogout} equiposTotal={total} />
        </Drawer>

        {/* Main area */}
        <div className="app-main">
          <header className="it-header">
            {isMobile ? (
              <button className="it-hamburger" onClick={() => setDrawerOpen(true)} aria-label="Abrir menú">
                <MenuUnfoldOutlined />
              </button>
            ) : (
              <Tooltip title={collapsed ? 'Expandir menú' : 'Colapsar menú'} placement="right">
                <button className="it-hamburger hide-mobile" style={{ display: 'flex' }}
                  onClick={() => setCollapsed(!collapsed)}
                  aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}>
                  {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                </button>
              </Tooltip>
            )}

            <span className="it-header-title hide-mobile">{pageTitle}</span>
            <div style={{ flex: 1 }} />

            <div className="it-search" role="search">
              <SearchOutlined style={{ color: '#94a3b8', fontSize: 14 }} aria-hidden="true" />
              <input placeholder="Buscar equipo, serie, código..." aria-label="Buscar" />
            </div>

            <Tooltip title="Notificaciones">
              <div className="it-icon-btn" role="button" tabIndex={0} aria-label="Notificaciones">
                <BellOutlined />
              </div>
            </Tooltip>

            <Tooltip title={`${usuario?.nombre ?? 'Usuario'} · ${usuario?.rol ?? ''} — Cerrar sesión`}>
              <div
                onClick={handleLogout}
                role="button" tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleLogout()}
                aria-label="Cerrar sesión"
                style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#bfdbfe',
                  cursor: 'pointer', flexShrink: 0, letterSpacing: '0.5px',
                  transition: 'box-shadow 0.2s', userSelect: 'none',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 3px rgba(59,130,246,0.25)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
              >
                {(usuario?.nombre ?? 'U').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
            </Tooltip>
          </header>

          <main className="app-content">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}
