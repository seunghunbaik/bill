export interface Receipt {
  id: string;
  restaurantName: string;
  amount: number;
  date: string; // YYYY-MM-DD
  imageData?: string; // base64 compressed
  ocrText?: string;
  createdAt: string;
}

export const MONTHLY_LIMIT = 260_000;
