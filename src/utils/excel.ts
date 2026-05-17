import * as XLSX from 'xlsx';
import { Receipt, MONTHLY_LIMIT } from '../types';
import { getWorkingDaysInMonth, getRemainingWorkingDays } from './workdays';

export const exportMonthlyExcel = (receipts: Receipt[], yearMonth: string): void => {
  const [year, month] = yearMonth.split('-').map(Number);
  const wb = XLSX.utils.book_new();

  const sorted = [...receipts].sort((a, b) => a.date.localeCompare(b.date));
  const total = receipts.reduce((s, r) => s + r.amount, 0);
  const workdays = getWorkingDaysInMonth(year, month);
  const remainWorkdays = getRemainingWorkingDays(year, month);
  const dailyBudget = Math.floor(MONTHLY_LIMIT / workdays);
  const remaining = MONTHLY_LIMIT - total;
  const dailyRemaining = remainWorkdays > 0 ? Math.floor(remaining / remainWorkdays) : 0;

  // ── Sheet 1: 영수증 목록 ────────────────────────────
  const listRows: (string | number)[][] = [
    ['날짜', '식당명', '금액 (원)', '메모'],
    ...sorted.map((r, i) => [
      r.date,
      r.restaurantName || '',
      r.amount,
      (r as Receipt & { notes?: string }).notes || '',
    ]),
    [],
    ['합계', `총 ${receipts.length}건`, total, ''],
    ['한도', '', MONTHLY_LIMIT, ''],
    ['잔여', '', remaining, remaining < 0 ? '⚠️ 한도 초과' : ''],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(listRows);
  ws1['!cols'] = [{ wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 30 }];

  // 헤더 행 굵게 (A1:D1)
  const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: 'D1FAE5' } } };
  ['A1', 'B1', 'C1', 'D1'].forEach(cell => {
    if (ws1[cell]) ws1[cell].s = headerStyle;
  });

  // 합계/한도/잔여 행 강조
  const summaryRow = sorted.length + 3; // 헤더1 + 데이터 + 빈줄1 = +3
  [`A${summaryRow}`, `B${summaryRow}`, `C${summaryRow}`].forEach(cell => {
    if (ws1[cell]) ws1[cell].s = { font: { bold: true } };
  });

  XLSX.utils.book_append_sheet(wb, ws1, '영수증 목록');

  // ── Sheet 2: 월별 요약 ───────────────────────────────
  const summaryRows: (string | number)[][] = [
    ['항목', '값', '비고'],
    ['정산 월', `${year}년 ${month}월`, ''],
    ['월 예산 한도', MONTHLY_LIMIT, '원'],
    ['총 사용 금액', total, '원'],
    ['잔여 예산', remaining, remaining < 0 ? '⚠️ 초과' : '원'],
    ['예산 사용률', `${Math.round((total / MONTHLY_LIMIT) * 100)}%`, total > MONTHLY_LIMIT ? '한도 초과' : ''],
    [],
    ['이번 달 평일 수', workdays, '일 (공휴일 제외)'],
    ['하루 기준 예산', dailyBudget, '원 (한도÷평일)'],
    ['남은 평일', remainWorkdays, '일'],
    ['오늘부터 하루 한도', dailyRemaining > 0 ? dailyRemaining : 0, '원'],
    [],
    ['영수증 수', receipts.length, '건'],
    ['평균 지출 (건당)', receipts.length > 0 ? Math.round(total / receipts.length) : 0, '원'],
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(summaryRows);
  ws2['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 18 }];

  ['A1', 'B1', 'C1'].forEach(cell => {
    if (ws2[cell]) ws2[cell].s = headerStyle;
  });

  XLSX.utils.book_append_sheet(wb, ws2, '월별 요약');

  // 파일 다운로드
  XLSX.writeFile(wb, `점심정산_${yearMonth}.xlsx`);
};
