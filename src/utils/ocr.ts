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

const parseAmount = (text: string): number | null => {
  const candidates: number[] = [];

  // 1순위: 합계/결제금액 등 레이블이 있는 금액
  const labelPatterns = [
    /(?:합\s*계|결\s*제\s*금\s*액|총\s*금\s*액|청\s*구\s*금\s*액|승\s*인\s*금\s*액|받\s*을\s*금\s*액|지\s*불\s*금\s*액|실\s*결\s*제|주\s*문\s*금\s*액|최\s*종\s*금\s*액)[^\d\n]{0,10}([\d,]+)/gi,
  ];
  for (const pat of labelPatterns) {
    for (const m of text.matchAll(pat)) {
      const n = parseInt(m[2].replace(/,/g, ''), 10);
      if (n >= 1000 && n < 10_000_000) candidates.push(n);
    }
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

const parseDate = (text: string): string | null => {
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

const SKIP_PATTERNS = [
  /사업자/,/등록번호/,/대표자/,/주\s*소/,/전\s*화/,/TEL/i,/FAX/i,
  /영수증/,/RECEIPT/i,/^\d+$/,/^[0-9\-\s]+$/,/감사합니다/,/안녕/,
  /카드/,/승인/,/결제/,/합계/,/부가세/,/VAT/i,/세금/,/주문/,
];

const parseRestaurantName = (text: string): string | null => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length >= 2);
  for (const line of lines.slice(0, 8)) {
    if (SKIP_PATTERNS.some(p => p.test(line))) continue;
    if (/^\d/.test(line)) continue;       // 숫자로 시작하는 줄 제외
    if (line.length > 20) continue;        // 너무 긴 줄 제외
    if (/[a-zA-Z가-힣]{2,}/.test(line)) { // 의미 있는 문자가 있는 줄
      return line.replace(/[^\w가-힣\s]/g, '').trim();
    }
  }
  return null;
};
