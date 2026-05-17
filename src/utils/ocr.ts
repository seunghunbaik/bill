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

const parseAmount = (text: string): number | null => {
  // Try labeled totals first (합계, 결제금액, etc.)
  const labeled = text.match(
    /(?:합\s*계|결\s*제\s*금\s*액|총\s*금\s*액|청\s*구\s*금\s*액|승\s*인\s*금\s*액|받\s*을\s*금\s*액|지\s*불\s*금\s*액|실\s*결\s*제)[^\d]*([0-9,]+)/i,
  );
  if (labeled) {
    const n = parseInt(labeled[1].replace(/,/g, ''), 10);
    if (n > 0 && n < 10_000_000) return n;
  }

  // Fallback: find all amounts ending with 원 and pick the largest
  const matches = [...text.matchAll(/([0-9,]{3,})\s*원/g)];
  const amounts = matches
    .map(m => parseInt(m[1].replace(/,/g, ''), 10))
    .filter(n => n > 0 && n < 10_000_000);

  return amounts.length > 0 ? Math.max(...amounts) : null;
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
