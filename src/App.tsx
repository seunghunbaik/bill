import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import AddReceiptPage from './pages/AddReceiptPage';
import ReceiptListPage from './pages/ReceiptListPage';

const Nav: React.FC = () => {
  const loc = useLocation();
  const isAdd = loc.pathname === '/add' || loc.pathname.startsWith('/edit');
  return (
    <header className="header">
      <div className="header-inner">
        <span className="header-logo">🧾 점심 정산</span>
        <nav className="header-nav">
          <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>대시보드</NavLink>
          <NavLink to="/list" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>목록</NavLink>
          <NavLink to="/add" className={'nav-link nav-add' + (isAdd ? ' active' : '')}>+ 영수증 추가</NavLink>
        </nav>
      </div>
    </header>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <div className="layout">
      <Nav />
      <main className="main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/add" element={<AddReceiptPage />} />
          <Route path="/edit/:id" element={<AddReceiptPage />} />
          <Route path="/list" element={<ReceiptListPage />} />
        </Routes>
      </main>
    </div>
  </BrowserRouter>
);

export default App;
