import { createWorker } from 'tesseract.js';

export interface OcrResult {
  rawText: string;
  amount: number | null;
  date: string | null; // YYYY-MM-DD
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
  };
};

// ── 금액 파싱 ──────────────────────────────────────────
const parseAmount = (text: string): number | null => {
  const candidates: number[] = [];

  // 1순위: 합계/결제금액 레이블 — 띄어쓰기 많아도 매칭
  const totalPatterns = [
    /합\s{0,5}계\s{0,60}([\d,]+)/gi,
    /결\s{0,2}제\s{0,2}금\s{0,2}액\s{0,60}([\d,]+)/gi,
    /총\s{0,2}금\s{0,2}액\s{0,60}([\d,]+)/gi,
    /청\s{0,2}구\s{0,2}금\s{0,2}액\s{0,60}([\d,]+)/gi,
    /승\s{0,2}인\s{0,2}금\s{0,2}액\s{0,60}([\d,]+)/gi,
    /받\s{0,2}을\s{0,2}금\s{0,2}액\s{0,60}([\d,]+)/gi,
    /주\s{0,2}문\s{0,2}금\s{0,2}액\s{0,60}([\d,]+)/gi,
    /최\s{0,2}종\s{0,2}금\s{0,2}액\s{0,60}([\d,]+)/gi,
  ];

  for (const pat of totalPatterns) {
    for (const m of text.matchAll(pat)) {
      const n = parseInt(m[1].replace(/,/g, ''), 10);
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

  // 4순위: 줄 단위로 파싱 — 수량+가격 오인식("1 16,500" → 116500) 방지
  // 각 줄에서 마지막 숫자만 추출해 후보에 추가
  for (const line of text.split('\n')) {
    const nums = [...line.matchAll(/([\d,]{3,})/g)].map(m =>
      parseInt(m[1].replace(/,/g, ''), 10),
    ).filter(n => n >= 1000 && n < 10_000_000);
    if (nums.length > 0) candidates.push(Math.max(...nums));
  }
  return candidates.length > 0 ? Math.max(...candidates) : null;
};

// ── 날짜 파싱 ──────────────────────────────────────────
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

