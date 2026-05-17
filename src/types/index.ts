export interface Receipt {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  imageData?: string; // base64 compressed
  ocrText?: string;
  createdAt: string;
}

export const MONTHLY_LIMIT = 260_000;
