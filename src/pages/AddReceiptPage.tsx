import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { saveReceipt, updateReceipt, getReceiptById } from '../utils/storage';
import { recognizeReceipt } from '../utils/ocr';
import { compressImage } from '../utils/helpers';
import { Receipt } from '../types';

const today = () => new Date().toISOString().split('T')[0];

const AddReceiptPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrDone, setOcrDone] = useState(false);
  const [ocrFailed, setOcrFailed] = useState(false);

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getReceiptById(id).then(r => {
      if (!r) return;
      setAmount(String(r.amount));
      setDate(r.date);
      setNotes(r.notes ?? '');
      if (r.imageData) { setImagePreview(r.imageData); setImageData(r.imageData); }
    }).catch(() => {});
  }, [id]);

  const processImage = useCallback(async (file: File) => {
    setOcrDone(false);
    setOcrFailed(false);
    setIsProcessing(true);
    setOcrProgress(0);
    const compressed = await compressImage(file);
    setImagePreview(compressed);
    setImageData(compressed);
    try {
      const result = await recognizeReceipt(compressed, pct => setOcrProgress(pct));
      if (result.amount) setAmount(String(result.amount));
      if (result.date) setDate(result.date);
      setOcrDone(true);
    } catch {
      setOcrFailed(true);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) processImage(file);
  }, [processImage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount.replace(/,/g, ''));
    if (!amount || isNaN(num) || num <= 0) { setError('금액을 입력해주세요.'); return; }
    if (!date) { setError('날짜를 입력해주세요.'); return; }
    setError('');

    const receipt: Receipt = {
      id: id ?? uuidv4(),
      amount: num,
      date,
      notes: notes.trim() || undefined,
      imageData: imageData ?? undefined,
      createdAt: isEdit
        ? ((await getReceiptById(id!).catch(() => undefined))?.createdAt ?? new Date().toISOString())
        : new Date().toISOString(),
    };

    try {
      if (isEdit) { await updateReceipt(receipt); } else { await saveReceipt(receipt); }
      navigate('/');
    } catch (e: any) {
      setError('저장 실패: ' + (e?.message ?? '다시 시도해주세요.'));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>{isEdit ? '영수증 수정' : '영수증 추가'}</h1>
        {!isEdit && (
          <Link to="/add-multi" style={{ fontSize: 13, color: 'var(--green-dark)', fontWeight: 600, textDecoration: 'none' }}>
            여러 장 한 번에 →
          </Link>
        )}
      </div>

      {!imagePreview ? (
        <div
          className={`upload-zone${isDragging ? ' dragover' : ''}`}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{ marginBottom: 24 }}
        >
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: 'none' }} />
          <span className="upload-icon">📷</span>
          <p className="upload-text">영수증 이미지를 올려주세요</p>
          <p className="upload-hint">클릭하거나 드래그 · 카메라로 촬영도 가능합니다<br />업로드 시 금액과 날짜를 자동으로 인식합니다</p>
        </div>
      ) : (
        <div className="image-preview" style={{ marginBottom: 24 }}>
          <img src={imagePreview} alt="영수증" />
          {isProcessing && (
            <div className="ocr-overlay">
              <div className="ocr-spinner" />
              <div className="ocr-label">영수증 인식 중...</div>
              <div className="ocr-pct">{ocrProgress}%</div>
              <div className="ocr-progress-bar">
                <div className="ocr-progress-fill" style={{ width: `${ocrProgress}%` }} />
              </div>
            </div>
          )}
          <button className="preview-change" onClick={() => fileInputRef.current?.click()}>이미지 변경</button>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: 'none' }} />
        </div>
      )}

      {ocrDone && <div className="ocr-badge" style={{ marginBottom: 16 }}>✓ OCR 인식 완료 — 아래 내용을 확인하고 저장하세요</div>}
      {ocrFailed && <div className="ocr-badge ocr-badge-warn" style={{ marginBottom: 16 }}>⚠️ 자동 인식 실패 — 직접 입력해주세요</div>}

      <div className="card">
        <form className="form" onSubmit={handleSubmit}>
          {error && <div className="error-box">⚠️ {error}</div>}
          <div className="form-row">
            <div className="field">
              <label>금액 (원) *</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="예) 12500" min="0" autoFocus={!imagePreview} />
            </div>
            <div className="field">
              <label>날짜 *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>메모 (선택)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="추가 메모를 입력하세요" />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)} style={{ flex: 1 }}>취소</button>
            <button type="submit" className="btn btn-green" style={{ flex: 2 }}>{isEdit ? '✓ 수정 완료' : '+ 저장하기'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddReceiptPage;
