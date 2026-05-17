import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getReceipts } from '../utils/storage';
import {
  getWorkingDaysInMonth,
  getElapsedWorkingDays,
  getRemainingWorkingDays,
} from '../utils/workdays';
import { formatCurrency, formatDate, currentYearMonth } from '../utils/helpers';
import { Receipt, MONTHLY_LIMIT } from '../types';

const HOLIDAYS_SET = new Set([
  '2025-01-01','2025-01-28','2025-01-29','2025-01-30',
  '2025-03-01','2025-05-05','2025-05-06','2025-06-06',
  '2025-08-15','2025-10-03','2025-10-06','2025-10-07',
  '2025-10-08','2025-10-09','2025-12-25',
  '2026-01-01','2026-02-16','2026-02-17','2026-02-18',
  '2026-03-01','2026-05-05','2026-06-06',
  '2026-08-17','2026-09-24','2026-09-25','2026-09-26',
  '2026-10-09','2026-12-25',
]);

const DashboardPage: React.FC = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);

  useEffect(() => { setReceipts(getReceipts()); }, []);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = now.getDate();
  const ym = currentYearMonth();

  const monthReceipts = receipts
    .filter(r => r.date.startsWith(ym))
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalSpent = monthReceipts.reduce((s, r) => s + r.amount, 0);
  const remaining = MONTHLY_LIMIT - totalSpent;
  const usageRate = Math.min(totalSpent / MONTHLY_LIMIT, 1);

  const totalWorkdays = getWorkingDaysInMonth(year, month);
  const elapsedWorkdays = getElapsedWorkingDays(year, month);
  const remainingWorkdays = getRemainingWorkingDays(year, month);

  const dailyBudget = Math.floor(MONTHLY_LIMIT / totalWorkdays);
  const expectedByNow = dailyBudget * elapsedWorkdays;
  const dailyRemaining = remainingWorkdays > 0 ? Math.floor(remaining / remainingWorkdays) : 0;
  const isOnTrack = totalSpent <= expectedByNow;

  const statusClass =
    totalSpent > MONTHLY_LIMIT ? 'status-danger'
    : usageRate > 0.85 ? 'status-warn'
    : 'status-ok';
  const statusLabel =
    totalSpent > MONTHLY_LIMIT ? '예산 초과'
    : usageRate > 0.85 ? '주의'
    : '정상';

  // Calendar dots
  const daysInMonth = new Date(year, month, 0).getDate();
  const dots = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const dow = new Date(year, month - 1, d).getDay();
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isOff = dow === 0 || dow === 6;
    const isHol = HOLIDAYS_SET.has(iso);
    return { d, isOff, isHol, isToday: d === today };
  });

  const recent = monthReceipts.slice(0, 5);

  return (
    <div>
      {/* Hero Budget Card */}
      <div className={`budget-hero ${statusClass}`}>
        <div className="hero-top">
          <span className="hero-month">{year}년 {month}월 점심 예산</span>
          <span className="hero-status-badge">{statusLabel}</span>
        </div>
        <div className="hero-amount">{formatCurrency(totalSpent)}</div>
        <div className="hero-sub">
          한도 {formatCurrency(MONTHLY_LIMIT)} 중 {Math.round(usageRate * 100)}% 사용
          {remaining >= 0 ? ` · 잔여 ${formatCurrency(remaining)}` : ` · ${formatCurrency(-remaining)} 초과`}
        </div>
        <div className="budget-bar-track">
          <div className="budget-bar-fill" style={{ width: `${usageRate * 100}%` }} />
        </div>
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-stat-label">총 평일 수</div>
            <div className="hero-stat-value">{totalWorkdays}일</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-label">지난 평일</div>
            <div className="hero-stat-value">{elapsedWorkdays}일</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-label">남은 평일</div>
            <div className="hero-stat-value">{remainingWorkdays}일</div>
          </div>
        </div>
      </div>

      {/* Daily Budget Cards */}
      <div className="daily-grid">
        <div className="daily-card highlight">
          <div className="daily-card-label">하루 기준 예산</div>
          <div className="daily-card-value">{formatCurrency(dailyBudget)}</div>
          <div className="daily-card-sub">
            {formatCurrency(MONTHLY_LIMIT)} ÷ {totalWorkdays}일
          </div>
        </div>
        <div className={`daily-card ${dailyRemaining < 0 ? 'danger' : dailyRemaining < dailyBudget * 0.8 ? 'warn' : 'highlight'}`}>
          <div className="daily-card-label">오늘부터 하루 한도</div>
          <div className="daily-card-value">
            {remainingWorkdays > 0 ? formatCurrency(Math.max(0, dailyRemaining)) : '–'}
          </div>
          <div className="daily-card-sub">
            {remaining >= 0
              ? `잔여 ${formatCurrency(remaining)} ÷ ${remainingWorkdays}일`
              : `${formatCurrency(-remaining)} 초과`}
          </div>
        </div>
        <div className={`daily-card ${isOnTrack ? '' : 'warn'}`}>
          <div className="daily-card-label">오늘까지 예상 누적</div>
          <div className="daily-card-value">{formatCurrency(expectedByNow)}</div>
          <div className="daily-card-sub">
            {dailyBudget.toLocaleString()}원 × {elapsedWorkdays}일
          </div>
        </div>
        <div className={`daily-card ${isOnTrack ? 'highlight' : 'warn'}`}>
          <div className="daily-card-label">예상 대비</div>
          <div className="daily-card-value">
            {isOnTrack
              ? `${formatCurrency(expectedByNow - totalSpent)} 여유`
              : `${formatCurrency(totalSpent - expectedByNow)} 초과`}
          </div>
          <div className="daily-card-sub">{isOnTrack ? '페이스 유지 중 ✓' : '지출 속도 주의 ⚠️'}</div>
        </div>
      </div>

      {/* Working Day Calendar */}
      <div className="workday-bar section">
        <div className="workday-bar-label">
          <span>{month}월 근무일 현황</span>
          <span>
            <span style={{ color: 'var(--green)', fontWeight: 700 }}>■</span> 평일&nbsp;
            <span style={{ color: 'var(--text-muted)' }}>■</span> 주말&nbsp;
            <span style={{ color: 'var(--red)' }}>■</span> 공휴일
          </span>
        </div>
        <div className="workday-dots">
          {dots.map(({ d, isOff, isHol, isToday }) => {
            let cls = 'day-dot ';
            if (isHol) cls += 'holiday';
            else if (isOff) cls += 'off';
            else if (isToday) cls += 'work-today';
            else if (d < today) cls += 'work-past';
            else cls += 'work-future';
            return <div key={d} className={cls}>{d}</div>;
          })}
        </div>
      </div>

      {/* Recent Receipts */}
      <div className="section">
        <div className="section-header">
          <span className="section-title">최근 영수증</span>
          <Link to="/list" className="view-all">전체 보기 →</Link>
        </div>
        {recent.length === 0 ? (
          <div className="empty">
            <span className="empty-icon">🧾</span>
            <p className="empty-text">이번 달 등록된 영수증이 없습니다.<br />영수증 이미지를 올려 자동으로 인식해보세요!</p>
          </div>
        ) : (
          <div className="receipt-list">
            {recent.map(r => (
              <Link to={`/edit/${r.id}`} key={r.id} className="receipt-row" style={{ textDecoration: 'none' }}>
                <div className="receipt-thumb">
                  {r.imageData
                    ? <img src={r.imageData} alt="영수증" />
                    : '🧾'}
                </div>
                <div className="receipt-info">
                  <div className="receipt-name">{r.restaurantName || '(식당명 없음)'}</div>
                  <div className="receipt-meta">{formatDate(r.date)}</div>
                </div>
                <div className="receipt-amount">{formatCurrency(r.amount)}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Link to="/add" className="btn btn-green btn-full">+ 영수증 추가하기</Link>
    </div>
  );
};

export default DashboardPage;
