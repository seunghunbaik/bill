import { Receipt } from '../types';

const KEY = 'bill_receipts';

export const getReceipts = (): Receipt[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Receipt[];
  } catch {
    return [];
  }
};

export const saveReceipt = (r: Receipt): void => {
  localStorage.setItem(KEY, JSON.stringify([...getReceipts(), r]));
};

export const updateReceipt = (updated: Receipt): void => {
  localStorage.setItem(KEY, JSON.stringify(getReceipts().map(r => r.id === updated.id ? updated : r)));
};

export const deleteReceipt = (id: string): void => {
  localStorage.setItem(KEY, JSON.stringify(getReceipts().filter(r => r.id !== id)));
};

export const getReceiptById = (id: string): Receipt | undefined =>
  getReceipts().find(r => r.id === id);

export const getReceiptsByMonth = (yearMonth: string): Receipt[] =>
  getReceipts().filter(r => r.date.startsWith(yearMonth));
