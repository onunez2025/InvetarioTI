import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';
import LoginPage        from './pages/LoginPage';
import DashboardPage    from './pages/DashboardPage';
import EquiposPage      from './pages/EquiposPage';
import HistorialPage    from './pages/HistorialPage';
import UsuariosPage     from './pages/UsuariosPage';
import ConfiguracionPage from './pages/ConfiguracionPage';
import AsignacionesPage from './pages/AsignacionesPage';
import EquipoDetailPage from './pages/EquipoDetailPage';
import ColaboradorDetailPage from './pages/ColaboradorDetailPage';
import ModelosPage       from './pages/ModelosPage';
import ProveedoresPage   from './pages/ProveedoresPage';
import ComprasPage       from './pages/ComprasPage';
import CompraDetailPage  from './pages/CompraDetailPage';
import InventarioPage    from './pages/InventarioPage';
import MainLayout       from './layouts/MainLayout';
import { useAuthStore } from './store/authStore';

function RutaProtegida({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

/** Rutas que requieren un rol mínimo */
function RutaRol({ children, roles }: { children: React.ReactNode; roles: string[] }) {
  const rol = useAuthStore((s) => s.usuario?.rol);
  if (rol && roles.includes(rol)) return <>{children}</>;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <ConfigProvider
      locale={esES}
      theme={{
        token: {
          colorPrimary: '#2563eb',
          colorLink: '#2563eb',
          colorLinkHover: '#1d4ed8',
          borderRadius: 8,
          colorBgLayout: '#f8fafc',
          colorBgContainer: '#ffffff',
          colorBorder: '#e2e8f0',
          colorBorderSecondary: '#f1f5f9',
          colorTextPlaceholder: '#6b7280',   // placeholder legible (antes era #bfbfbf)
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          fontSize: 14,
        },
        components: {
          Table:  { headerBg: '#f8fafc', headerColor: '#64748b', rowHoverBg: '#f8fafc', borderColor: '#e2e8f0', fontSize: 13 },
          Button: { borderRadius: 8, fontWeight: 500 },
          Input:  { borderRadius: 8 },
          Select: { borderRadius: 8 },
          Card:   { borderRadius: 12 },
          Drawer: { colorBgElevated: '#0f1629' },
          Tabs:   { inkBarColor: '#2563eb', itemActiveColor: '#2563eb', itemSelectedColor: '#2563eb' },
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<RutaProtegida><MainLayout /></RutaProtegida>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/equipos"      element={<EquiposPage />} />
            <Route path="/equipos/:id"  element={<EquipoDetailPage />} />
            <Route path="/colaboradores/:id" element={<ColaboradorDetailPage />} />

            <Route path="/historial" element={
              <RutaRol roles={['ADMIN','GERENTE','TECNICO']}>
                <HistorialPage />
              </RutaRol>
            } />

            <Route path="/asignaciones" element={
              <RutaRol roles={['ADMIN','GERENTE','TECNICO']}>
                <AsignacionesPage />
              </RutaRol>
            } />

            <Route path="/usuarios" element={
              <RutaRol roles={['ADMIN','GERENTE']}>
                <UsuariosPage />
              </RutaRol>
            } />

            <Route path="/config" element={
              <RutaRol roles={['ADMIN']}>
                <ConfiguracionPage />
              </RutaRol>
            } />

            <Route path="/modelos" element={
              <RutaRol roles={['ADMIN','GERENTE','TECNICO','VISUALIZADOR']}>
                <ModelosPage />
              </RutaRol>
            } />

            <Route path="/proveedores" element={
              <RutaRol roles={['ADMIN','TECNICO']}>
                <ProveedoresPage />
              </RutaRol>
            } />

            <Route path="/compras" element={
              <RutaRol roles={['ADMIN','GERENTE','TECNICO','VISUALIZADOR']}>
                <ComprasPage />
              </RutaRol>
            } />

            <Route path="/compras/:id" element={
              <RutaRol roles={['ADMIN','GERENTE','TECNICO','VISUALIZADOR']}>
                <CompraDetailPage />
              </RutaRol>
            } />

            <Route path="/inventario" element={
              <RutaRol roles={['ADMIN','GERENTE','TECNICO','VISUALIZADOR']}>
                <InventarioPage />
              </RutaRol>
            } />
          </Route>

          <Route path="/"  element={<Navigate to="/dashboard" replace />} />
          <Route path="*"  element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}
