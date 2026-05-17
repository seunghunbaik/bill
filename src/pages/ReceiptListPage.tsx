import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getReceipts, deleteReceipt } from '../utils/storage';
import { formatCurrency, formatDate, toYearMonth, currentYearMonth } from '../utils/helpers';
import { exportMonthlyExcel } from '../utils/excel';
import { Receipt, MONTHLY_LIMIT } from '../types';

const ReceiptListPage: React.FC = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selectedYM, setSelectedYM] = useState(currentYearMonth());

  const load = useCallback(() => {
    setReceipts(getReceipts().sort((a, b) => b.date.localeCompare(a.date)));
  }, []);

  useEffect(() => { load(); }, [load]);

  const months = Array.from(new Set(receipts.map(r => toYearMonth(r.date)))).sort().reverse();
  const filtered = receipts.filter(r => r.date.startsWith(selectedYM));
  const total = filtered.reduce((s, r) => s + r.amount, 0);
  const over = total > MONTHLY_LIMIT;
  const [ym_y, ym_m] = selectedYM.split('-');

  const handleDelete = (r: Receipt) => {
    if (!window.confirm(`"${r.restaurantName || formatDate(r.date)}" 영수증을 삭제할까요?`)) return;
    deleteReceipt(r.id);
    load();
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      alert('내보낼 영수증이 없습니다.');
      return;
    }
    exportMonthlyExcel(filtered, selectedYM);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>영수증 목록</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleExport}
            className="btn btn-ghost"
            style={{ padding: '9px 16px', fontSize: 14 }}
            title="엑셀로 내보내기"
          >
            📊 엑셀 저장
          </button>
          <Link to="/add" className="btn btn-green" style={{ padding: '9px 18px', fontSize: 14 }}>+ 추가</Link>
        </div>
      </div>

      {/* Month filter */}
      {months.length > 0 && (
        <div className="month-bar">
          {months.map(m => (
            <button key={m} className={`month-chip${selectedYM === m ? ' active' : ''}`} onClick={() => setSelectedYM(m)}>
              {m}
            </button>
          ))}
        </div>
      )}

      {/* Summary card */}
      {filtered.length > 0 && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            background: over ? 'var(--red-light)' : 'var(--green-light)',
            border: `1.5px solid ${over ? '#FECACA' : '#A7F3D0'}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, color: over ? 'var(--red)' : 'var(--green-dark)', fontWeight: 600, marginBottom: 2 }}>
                {ym_y}년 {ym_m}월 합계
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: over ? 'var(--red)' : 'var(--green-dark)' }}>
                {formatCurrency(total)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                총 {filtered.length}건
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>
                한도 {formatCurrency(MONTHLY_LIMIT)}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: over ? 'var(--red)' : 'var(--green-dark)' }}>
                {over
                  ? `${formatCurrency(total - MONTHLY_LIMIT)} 초과 ⚠️`
                  : `${formatCurrency(MONTHLY_LIMIT - total)} 남음`}
              </div>
              <button
                onClick={handleExport}
                style={{
                  marginTop: 8, fontSize: 12, padding: '4px 10px',
                  background: 'transparent', border: `1px solid ${over ? 'var(--red)' : 'var(--green-dark)'}`,
                  borderRadius: 6, cursor: 'pointer',
                  color: over ? 'var(--red)' : 'var(--green-dark)', fontWeight: 600,
                }}
              >
                📊 엑셀 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty">
          <span className="empty-icon">🔍</span>
          <p className="empty-text">이 달의 영수증이 없습니다.</p>
        </div>
      ) : (
        <div className="receipt-list">
          {filtered.map(r => (
            <div key={r.id} className="receipt-row">
              <div className="receipt-thumb">
                {r.imageData ? <img src={r.imageData} alt="영수증" /> : '🧾'}
              </div>
              <div className="receipt-info">
                <div className="receipt-name">{r.restaurantName || '(식당명 없음)'}</div>
                <div className="receipt-meta">{formatDate(r.date)}</div>
              </div>
              <div className="receipt-amount">{formatCurrency(r.amount)}</div>
              <div className="receipt-actions">
                <button className="icon-btn" onClick={() => navigate(`/edit/${r.id}`)}>✏️</button>
                <button className="icon-btn del" onClick={() => handleDelete(r)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReceiptListPage;
