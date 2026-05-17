import {
  collection, doc, getDocs, setDoc, deleteDoc, getDoc, query, orderBy,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Receipt } from '../types';

const col = () => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('로그인이 필요합니다.');
  return collection(db, 'users', uid, 'receipts');
};

// Firestore는 undefined 필드를 허용하지 않으므로 저장 전 제거
const strip = (r: Receipt): Record<string, unknown> =>
  Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined));

export const getReceipts = async (): Promise<Receipt[]> => {
  const snap = await getDocs(query(col(), orderBy('date', 'asc')));
  return snap.docs.map(d => d.data() as Receipt);
};

export const saveReceipt = async (r: Receipt): Promise<void> => {
  await setDoc(doc(col(), r.id), strip(r));
};

export const updateReceipt = async (r: Receipt): Promise<void> => {
  await setDoc(doc(col(), r.id), strip(r));
};

export const deleteReceipt = async (id: string): Promise<void> => {
  await deleteDoc(doc(col(), id));
};

export const getReceiptById = async (id: string): Promise<Receipt | undefined> => {
  const snap = await getDoc(doc(col(), id));
  return snap.exists() ? (snap.data() as Receipt) : undefined;
};
