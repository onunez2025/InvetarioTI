import { useState } from 'react';
import { Form, Input } from 'antd';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

/* ---- Floating bubble config ---- */
const BUBBLES = [
  { size: 90,  left: 6,  delay: 0,   duration: 10 },
  { size: 55,  left: 20, delay: 2.2, duration: 14 },
  { size: 130, left: 35, delay: 1.0, duration: 11 },
  { size: 70,  left: 52, delay: 3.5, duration: 9  },
  { size: 100, left: 68, delay: 0.5, duration: 13 },
  { size: 45,  left: 82, delay: 4.0, duration: 8  },
  { size: 80,  left: 14, delay: 5.5, duration: 12 },
  { size: 60,  left: 90, delay: 2.8, duration: 10 },
];

/* ---- Logo SVG ---- */
function LogoSvg({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" stroke="#fff" strokeWidth="2" />
      <path d="M8 21h8M12 17v4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="10" r="2.5" stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await login(values.email, values.password);
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 900);
    } catch {
      setErrorMsg('Credenciales inválidas. Verifica tu email y contraseña.');
      // Shake the form card
      const el = document.getElementById('login-form-card');
      if (el) {
        el.style.animation = 'none';
        void el.offsetHeight; // reflow
        el.style.animation = 'shake 0.45s ease';
        setTimeout(() => { el.style.animation = ''; }, 500);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* ---- LEFT: Brand panel ---- */}
      <div className="login-brand">
        {/* Floating bubbles */}
        {BUBBLES.map((b, i) => (
          <div
            key={i}
            className="login-bubble"
            style={{
              width:  b.size,
              height: b.size,
              left:   `${b.left}%`,
              bottom: -b.size - 10,
              animationDuration:  `${b.duration}s`,
              animationDelay:     `${b.delay}s`,
            }}
          />
        ))}

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 52 }}>
            <div style={{
              width: 46, height: 46,
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              borderRadius: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(37,99,235,0.4)',
            }}>
              <LogoSvg size={22} />
            </div>
            <div>
              <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 18, lineHeight: 1.2 }}>
                InventarioTI
              </div>
              <div style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>
                Gestión de Activos TI
              </div>
            </div>
          </div>

          {/* Headline */}
          <div style={{ color: '#f1f5f9', fontSize: 30, fontWeight: 800, lineHeight: 1.25, marginBottom: 16, letterSpacing: '-0.5px' }}>
            Control total de tu<br />infraestructura
            <span style={{ color: '#60a5fa' }}> tecnológica</span>
          </div>
          <div style={{ color: '#64748b', fontSize: 14, lineHeight: 1.75, maxWidth: 340 }}>
            Centraliza, audita y gestiona todos los equipos TI de tu organización.
            Historial completo, dashboards en tiempo real y trazabilidad total.
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 32, marginTop: 40 }}>
            {[
              { n: '100%', l: 'Trazabilidad' },
              { n: 'Tiempo real', l: 'Dashboard en vivo' },
              { n: '24/7', l: 'Alta disponibilidad' },
            ].map((s) => (
              <div key={s.l}>
                <div style={{ color: '#3b82f6', fontSize: 16, fontWeight: 700 }}>{s.n}</div>
                <div style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 36 }}>
            {['Inventario ITAM', 'Historial de cambios', 'Importación Excel', 'Control por roles', 'Dashboard ejecutivo'].map((f) => (
              <span key={f} style={{
                padding: '4px 12px',
                borderRadius: 20,
                background: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.2)',
                color: '#60a5fa',
                fontSize: 11,
                fontWeight: 500,
              }}>
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ color: '#334155', fontSize: 11, position: 'relative', zIndex: 1, marginTop: 24 }}>
          © 2026 MT Industrial S.A.C. — Sistema Interno
        </div>
      </div>

      {/* ---- RIGHT: Form panel ---- */}
      <div className="login-form-side">
        <div
          id="login-form-card"
          className="anim-fadeInUp"
          style={{ maxWidth: 380, width: '100%', margin: '0 auto' }}
        >
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 38, height: 38,
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <LogoSvg size={18} />
              </div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>InventarioTI</div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginBottom: 6, letterSpacing: '-0.5px' }}>
              Bienvenido de vuelta
            </div>
            <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
              Ingresa tus credenciales para acceder al sistema de gestión.
            </div>
          </div>

          {/* Form */}
          <Form form={form} name="login" onFinish={onFinish} layout="vertical" requiredMark={false}>
            <Form.Item
              name="email"
              label="Correo electrónico"
              rules={[
                { required: true, message: 'El email es obligatorio' },
                { type: 'email', message: 'Ingresa un email válido' },
              ]}
              style={{ marginBottom: 16 }}
            >
              <Input
                size="large"
                placeholder="usuario@empresa.com.pe"
                autoComplete="email"
                autoFocus
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Contraseña"
              rules={[{ required: true, message: 'La contraseña es obligatoria' }]}
              style={{ marginBottom: 16 }}
            >
              <Input.Password
                size="large"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Form.Item>

            {/* Error message */}
            {errorMsg && (
              <div
                className="anim-fadeIn"
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  padding: '10px 14px',
                  color: '#dc2626',
                  fontSize: 13,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="#dc2626" strokeWidth="2"/>
                  <path d="M12 8v4m0 4h.01" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                {errorMsg}
              </div>
            )}

            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <button
                type="submit"
                disabled={loading || success}
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  background: success
                    ? 'linear-gradient(135deg, #059669, #10b981)'
                    : 'linear-gradient(135deg, #2563eb, #3b82f6)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 9,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: (loading || success) ? 'default' : 'pointer',
                  opacity: loading ? 0.9 : 1,
                  transition: 'all 0.35s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  letterSpacing: '0.2px',
                  boxShadow: success
                    ? '0 4px 16px rgba(16,185,129,0.4)'
                    : '0 4px 16px rgba(37,99,235,0.35)',
                }}
              >
                {success ? (
                  <>
                    {/* Checkmark SVG */}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M20 6L9 17l-5-5"
                        stroke="#fff"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          strokeDasharray: 30,
                          strokeDashoffset: 0,
                          animation: 'successCheck 0.4s ease both',
                        }}
                      />
                    </svg>
                    Acceso concedido
                  </>
                ) : loading ? (
                  <>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        border: '2.5px solid rgba(255,255,255,0.3)',
                        borderTop: '2.5px solid #fff',
                        borderRadius: '50%',
                        animation: 'spin 0.75s linear infinite',
                      }}
                    />
                    Verificando credenciales...
                  </>
                ) : (
                  <>
                    Iniciar sesión
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </>
                )}
              </button>
            </Form.Item>
          </Form>

          {/* Footer brand strip */}
          <div style={{
            marginTop: 36,
            paddingTop: 24,
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 1 }}>Sistema gestionado por</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>MT Industrial S.A.C.</div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 11px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 7,
              fontSize: 11,
              color: '#166534',
              fontWeight: 600,
              flexShrink: 0,
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a' }} />
              Sistema activo
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
