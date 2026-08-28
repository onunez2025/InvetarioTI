import { useState } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Typography, theme } from 'antd';
import {
  DashboardOutlined,
  LaptopOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/equipos', icon: <LaptopOutlined />, label: 'Equipos' },
];

export default function MainLayout() {
  const [colapsado, setColapsado] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const { token } = theme.useToken();

  const menuUsuario = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Cerrar sesión',
        danger: true,
        onClick: () => { logout(); navigate('/login'); },
      },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={colapsado}
        onCollapse={setColapsado}
        trigger={null}
        style={{ background: token.colorBgContainer, borderRight: `1px solid ${token.colorBorderSecondary}` }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: colapsado ? 'center' : 'flex-start',
          padding: colapsado ? 0 : '0 16px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}>
          <LaptopOutlined style={{ fontSize: 20, color: token.colorPrimary }} />
          {!colapsado && (
            <Text strong style={{ marginLeft: 10, fontSize: 14 }}>InventarioTI</Text>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, marginTop: 8 }}
        />
      </Sider>

      <Layout>
        <Header style={{
          padding: '0 24px',
          background: token.colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}>
          <Button
            type="text"
            icon={colapsado ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setColapsado(!colapsado)}
          />
          <Dropdown menu={menuUsuario} placement="bottomRight">
            <Avatar
              icon={<UserOutlined />}
              style={{ cursor: 'pointer', background: token.colorPrimary }}
            />
          </Dropdown>
        </Header>

        <Content style={{ margin: 24, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
