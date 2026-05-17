import React from 'react';
import {
  BrowserRouter, Routes, Route, NavLink, Navigate, Outlet, useLocation, useNavigate,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import DashboardPage from './pages/DashboardPage';
import AddReceiptPage from './pages/AddReceiptPage';
import MultiAddPage from './pages/MultiAddPage';
import ReceiptListPage from './pages/ReceiptListPage';
import AuthPage from './pages/AuthPage';

const Nav: React.FC = () => {
  const loc = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isAdd = loc.pathname === '/add' || loc.pathname.startsWith('/edit') || loc.pathname === '/add-multi';

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  return (
    <header className="header">
      <div className="header-inner">
        <span className="header-logo">🧾 점심 정산</span>
        <nav className="header-nav">
          <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>대시보드</NavLink>
          <NavLink to="/list" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>목록</NavLink>
          <NavLink to="/add" className={'nav-link nav-add' + (isAdd ? ' active' : '')}>+ 추가</NavLink>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </span>
          <button
            onClick={handleLogout}
            style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}
          >
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
};

const ProtectedLayout: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--text-muted)' }}>
      로딩 중...
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  return (
    <div className="layout">
      <Nav />
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/add" element={<AddReceiptPage />} />
          <Route path="/add-multi" element={<MultiAddPage />} />
          <Route path="/edit/:id" element={<AddReceiptPage />} />
          <Route path="/list" element={<ReceiptListPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
