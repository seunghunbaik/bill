import ExcelJS from 'exceljs';
import { Receipt, MONTHLY_LIMIT } from '../types';

const IMG_W = 270;       // 표시 너비 고정 (px) — 모든 이미지 동일 너비로 일정한 간격
const MAX_H = 400;       // 표시 높이 상한 (px)
const IMGS_PER_ROW = 2;
const PX_PER_PT = 4 / 3;
// ExcelJS row.height 단위 보정: Excel 표시 pt = ExcelJS 값 × (11.4/17)
// 역산: 원하는 px → ExcelJS 값 = px / PX_PER_PT × (17/11.4)
const EXCEL_ROW_FACTOR = 17 / 11.4;
const pxToRowHeight = (px: number) => Math.ceil(px / PX_PER_PT * EXCEL_ROW_FACTOR);
// ExcelJS 컬럼 너비 1단위 ≈ 7px (Calibri 11pt 기준)
const IMG_COL_W = Math.ceil(IMG_W / 7); // ≈ 39 단위

const getImgNaturalSize = (dataUrl: string): Promise<{ w: number; h: number }> =>
  new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 3, h: 4 });
    img.src = dataUrl;
  });

// 너비를 IMG_W로 고정, 비율에 맞춰 높이 결정
const displaySize = (w: number, h: number): { w: number; h: number } => ({
  w: IMG_W,
  h: Math.min(Math.round(h * IMG_W / w), MAX_H),
});

export const exportMonthlyExcel = async (receipts: Receipt[], yearMonth: string): Promise<void> => {
  const [year, month] = yearMonth.split('-').map(Number);
  const workbook = new ExcelJS.Workbook();

  const sorted = [...receipts].sort((a, b) => a.date.localeCompare(b.date));
  const total = receipts.reduce((s, r) => s + r.amount, 0);
  const remaining = MONTHLY_LIMIT - total;

  const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };

  // ── Sheet 1: 영수증 목록 ──────────────────────────────
  const ws1 = workbook.addWorksheet('영수증 목록');
  ws1.properties.defaultRowHeight = 25.5; // Excel 표시 기준 17pt (ExcelJS 내부 단위 × 2/3 = Excel pt)
  ws1.columns = [
    { header: '날짜', key: 'date', width: 14 },
    { header: '금액 (원)', key: 'amount', width: 16 },
    { header: '메모', key: 'notes', width: 30 },
  ];

  const hdr = ws1.getRow(1);
  hdr.font = { bold: true }; hdr.fill = headerFill; hdr.commit();

  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    const row = ws1.getRow(i + 2);
    row.getCell('date').value = r.date;
    row.getCell('amount').value = r.amount;
    row.getCell('notes').value = r.notes || '';
    row.commit();
  }

  const ss = sorted.length + 3;
  const sumRow = ws1.getRow(ss);
  sumRow.getCell(1).value = '합계'; sumRow.getCell(2).value = total;
  sumRow.font = { bold: true }; sumRow.commit();
  const limRow = ws1.getRow(ss + 1);
  limRow.getCell(1).value = '한도'; limRow.getCell(2).value = MONTHLY_LIMIT; limRow.commit();
  const remRow = ws1.getRow(ss + 2);
  remRow.getCell(1).value = '잔여'; remRow.getCell(2).value = remaining;
  if (remaining < 0) remRow.getCell(3).value = '⚠️ 한도 초과';
  remRow.font = { bold: true, color: { argb: remaining < 0 ? 'FFDC2626' : 'FF059669' } }; remRow.commit();

  // ── Sheet 2: 영수증 사진 ──────────────────────────────
  const withImages = sorted.filter(r => r.imageData);
  if (withImages.length > 0) {
    const naturalSizes = await Promise.all(withImages.map(r => getImgNaturalSize(r.imageData!)));
    const sizes = naturalSizes.map(({ w, h }) => displaySize(w, h));

    const ws2 = workbook.addWorksheet('영수증 사진');
    // 이미지 컬럼 2개, 너비 동일 — 이미지가 딱 붙어 일정하게 배치
    ws2.getColumn(1).width = IMG_COL_W;
    ws2.getColumn(2).width = IMG_COL_W;

    // 시트 헤더
    ws2.mergeCells('A1:B1');
    const sheetHdr = ws2.getCell('A1');
    sheetHdr.value = `${year}년 ${month}월 영수증 사진 (${withImages.length}장)`;
    sheetHdr.font = { bold: true, size: 13 };
    sheetHdr.fill = headerFill;
    sheetHdr.alignment = { horizontal: 'center', vertical: 'middle' };
    ws2.getRow(1).height = 28;

    const numGroups = Math.ceil(withImages.length / IMGS_PER_ROW);
    for (let g = 0; g < numGroups; g++) {
      const imgRow0 = 1 + g; // 0-based (헤더가 row 0)
      const groupStart = g * IMGS_PER_ROW;
      const groupEnd = Math.min(groupStart + IMGS_PER_ROW, withImages.length);

      // 같은 행에서 가장 높은 이미지 기준으로 행 높이 설정
      const maxH = Math.max(...sizes.slice(groupStart, groupEnd).map(s => s.h));
      ws2.getRow(imgRow0 + 1).height = pxToRowHeight(maxH);

      for (let pos = 0; pos < IMGS_PER_ROW; pos++) {
        const idx = groupStart + pos;
        if (idx >= withImages.length) break;

        const r = withImages[idx];
        const { w: dW, h: dH } = sizes[idx];
        const imgCol0 = pos; // 0-based: 첫 이미지=col 0, 두 번째=col 1

        const commaIdx = r.imageData!.indexOf(',');
        const base64 = r.imageData!.substring(commaIdx + 1);
        const meta = r.imageData!.substring(0, commaIdx);
        const ext = (meta.includes('png') ? 'png' : 'jpeg') as 'jpeg' | 'png';

        ws2.addImage(workbook.addImage({ base64, extension: ext }), {
          tl: { col: imgCol0, row: imgRow0 } as ExcelJS.Anchor,
          ext: { width: dW, height: dH },
        });
      }
    }
  }

  // 다운로드
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `점심정산_${yearMonth}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
