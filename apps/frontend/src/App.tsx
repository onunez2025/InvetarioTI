import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EquiposPage from './pages/EquiposPage';
import MainLayout from './layouts/MainLayout';
import { useAuthStore } from './store/authStore';

function RutaProtegida({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
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
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          fontSize: 14,
        },
        components: {
          Table: {
            headerBg: '#f8fafc',
            headerColor: '#64748b',
            rowHoverBg: '#f8fafc',
            borderColor: '#e2e8f0',
            fontSize: 13,
          },
          Button: {
            borderRadius: 8,
            fontWeight: 500,
          },
          Input: { borderRadius: 8 },
          Select: { borderRadius: 8 },
          Card: { borderRadius: 12 },
          Drawer: { colorBgElevated: '#0f1629' },
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <RutaProtegida>
                <MainLayout />
              </RutaProtegida>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/equipos" element={<EquiposPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}
