import { createWorker } from 'tesseract.js';

export interface OcrResult {
  rawText: string;
  amount: number | null;
  date: string | null; // YYYY-MM-DD
  restaurantName: string | null;
}

export const recognizeReceipt = async (
  image: File | string,
  onProgress?: (pct: number) => void,
): Promise<OcrResult> => {
  const worker = await createWorker('kor+eng', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') {
        onProgress?.(Math.round(m.progress * 100));
      }
    },
  });

  const { data } = await worker.recognize(image);
  await worker.terminate();

  const text = data.text;
  return {
    rawText: text,
    amount: parseAmount(text),
    date: parseDate(text),
    restaurantName: parseRestaurantName(text),
  };
};

// ── 금액 파싱 ──────────────────────────────────────────
const parseAmount = (text: string): number | null => {
  const candidates: number[] = [];

  // 1순위: 합계/결제금액 등 레이블 뒤 숫자
  const labelPat = /(?:합\s*계|결\s*제\s*금\s*액|총\s*금\s*액|청\s*구\s*금\s*액|승\s*인\s*금\s*액|받\s*을\s*금\s*액|지\s*불\s*금\s*액|실\s*결\s*제|주\s*문\s*금\s*액|최\s*종\s*금\s*액)[^\d\n]{0,15}([\d,]+)/gi;
  for (const m of text.matchAll(labelPat)) {
    const n = parseInt(m[1].replace(/,/g, ''), 10);
    if (n >= 1000 && n < 10_000_000) candidates.push(n);
  }
  if (candidates.length > 0) return Math.max(...candidates);

  // 2순위: ₩ 또는 W 뒤 숫자
  for (const m of text.matchAll(/[₩W]\s*([\d,]+)/g)) {
    const n = parseInt(m[1].replace(/,/g, ''), 10);
    if (n >= 1000 && n < 10_000_000) candidates.push(n);
  }
  if (candidates.length > 0) return Math.max(...candidates);

  // 3순위: 원 앞 숫자
  for (const m of text.matchAll(/([\d,]{4,})\s*원/g)) {
    const n = parseInt(m[1].replace(/,/g, ''), 10);
    if (n >= 1000 && n < 10_000_000) candidates.push(n);
  }
  if (candidates.length > 0) return Math.max(...candidates);

  // 4순위: 4자리 이상 숫자 중 가장 큰 값
  for (const m of text.matchAll(/([\d,]{4,})/g)) {
    const n = parseInt(m[1].replace(/,/g, ''), 10);
    if (n >= 1000 && n < 10_000_000) candidates.push(n);
  }
  return candidates.length > 0 ? Math.max(...candidates) : null;
};

// ── 날짜 파싱 ──────────────────────────────────────────
const parseDate = (text: string): string | null => {
  // "주문일시 : 2026/05/15 ..." 같은 형식도 포함
  const patterns = [
    /(\d{4})[년\-\/.]\s*(\d{1,2})[월\-\/.]\s*(\d{1,2})/,
    /(\d{2})[년\-\/.]\s*(\d{1,2})[월\-\/.]\s*(\d{1,2})/,
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) {
      let y = parseInt(m[1], 10);
      if (y < 100) y += 2000;
      const mo = parseInt(m[2], 10);
      const d = parseInt(m[3], 10);
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y >= 2020 && y <= 2099) {
        return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
  }
  return null;
};

// ── 식당명 파싱 ────────────────────────────────────────
const parseRestaurantName = (text: string): string | null => {
  // 1순위: 명시적 레이블 (배달 주문서, 카드영수증 등)
  const labelPatterns = [
    /주문\s*매장\s*[:：]\s*(.+)/,
    /매\s*장\s*명\s*[:：]\s*(.+)/,
    /상\s*호\s*[:：]\s*(.+)/,
    /가\s*게\s*명\s*[:：]\s*(.+)/,
    /점\s*포\s*명\s*[:：]\s*(.+)/,
    /가\s*맹\s*점\s*[:：]\s*(.+)/,
  ];
  for (const pat of labelPatterns) {
    const m = text.match(pat);
    if (m) {
      const name = m[1].trim().split(/\s{2,}|\t/)[0].trim();
      if (name.length >= 2 && name.length <= 20) return name;
    }
  }

  // 2순위: 상단 첫 의미있는 줄
  const SKIP = [
    /사업자/, /등록번호/, /대표/, /주\s*소/, /전\s*화/, /TEL/i, /FAX/i,
    /영수증/, /RECEIPT/i, /^\d+$/, /감사합니다/, /배달/, /주문서/,
    /카드/, /승인/, /결제/, /합계/, /부가세/, /VAT/i, /품목/, /수량/,
    /요청/, /고객/, /연락/,
  ];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length >= 2);
  for (const line of lines.slice(0, 10)) {
    if (SKIP.some(p => p.test(line))) continue;
    if (/^\d/.test(line)) continue;
    if (line.length > 20) continue;
    if (/[가-힣]{2,}/.test(line) || /[a-zA-Z]{3,}/.test(line)) {
      return line.replace(/[\[\]()（）]/g, '').trim();
    }
  }
  return null;
};
