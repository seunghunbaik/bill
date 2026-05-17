import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { saveReceipt } from '../utils/storage';
import { recognizeReceipt } from '../utils/ocr';
import { compressImage } from '../utils/helpers';
import { Receipt } from '../types';

interface BatchItem {
  id: string;
  imagePreview: string;
  imageData: string;
  amount: string;
  date: string;
  notes: string;
  status: 'processing' | 'done' | 'failed';
  progress: number;
}

const today = () => new Date().toISOString().split('T')[0];

const MultiAddPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const processFiles = useCallback(async (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    // 각 파일에 대해 임시 아이템 생성
    const newItems: BatchItem[] = imageFiles.map(_f => ({
      id: uuidv4(),
      imagePreview: '',
      imageData: '',
      amount: '',
      date: today(),
      notes: '',
      status: 'processing',
      progress: 0,
    }));

    setItems(prev => [...prev, ...newItems]);

    // 병렬 처리
    await Promise.all(imageFiles.map(async (file, idx) => {
      const item = newItems[idx];
      try {
        const compressed = await compressImage(file);
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, imagePreview: compressed, imageData: compressed } : i));

        const result = await recognizeReceipt(compressed, pct => {
          setItems(prev => prev.map(i => i.id === item.id ? { ...i, progress: pct } : i));
        });

        setItems(prev => prev.map(i => i.id === item.id ? {
          ...i,
          amount: result.amount ? String(result.amount) : '',
          date: result.date ?? today(),
          status: 'done',
          progress: 100,
        } : i));
      } catch {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'failed', progress: 0 } : i));
      }
    }));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    processFiles(files);
    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  }, [processFiles]);

  const updateItem = (id: string, field: keyof BatchItem, value: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleSaveAll = async () => {
    const valid = items.filter(i => i.status !== 'processing' && Number(i.amount) > 0 && i.date);
    if (valid.length === 0) { alert('저장할 영수증이 없습니다. 금액을 입력해주세요.'); return; }
    setSaving(true);
    try {
      await Promise.all(valid.map(item => {
        const receipt: Receipt = {
          id: item.id,
          amount: Number(item.amount.replace(/,/g, '')),
          date: item.date,
          notes: item.notes.trim() || undefined,
          imageData: item.imageData || undefined,
          createdAt: new Date().toISOString(),
        };
        return saveReceipt(receipt);
      }));
      navigate('/list');
    } catch {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const processing = items.some(i => i.status === 'processing');
  const validCount = items.filter(i => i.status !== 'processing' && Number(i.amount) > 0).length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>영수증 여러 장 추가</h1>
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>← 뒤로</button>
      </div>

      {/* 업로드 존 */}
      <div
        className={`upload-zone${isDragging ? ' dragover' : ''}`}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{ marginBottom: 24 }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <span className="upload-icon">📷</span>
        <p className="upload-text">영수증 이미지를 여러 장 선택하세요</p>
        <p className="upload-hint">클릭 또는 드래그 — 여러 파일을 한 번에 선택 가능합니다</p>
      </div>

      {/* 영수증 목록 */}
      {items.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
            {items.map(item => (
              <div key={item.id} className="card" style={{ padding: 16, position: 'relative' }}>
                {/* 삭제 버튼 */}
                <button
                  onClick={() => removeItem(item.id)}
                  style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)' }}
                >✕</button>

                {/* 이미지 미리보기 */}
                <div style={{ width: '100%', height: 160, background: 'var(--bg)', borderRadius: 8, overflow: 'hidden', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.imagePreview
                    ? <img src={item.imagePreview} alt="영수증" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    : <span style={{ fontSize: 32 }}>🧾</span>
                  }
                </div>

                {/* OCR 상태 */}
                {item.status === 'processing' && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>인식 중... {item.progress}%</div>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${item.progress}%`, background: 'var(--green)', borderRadius: 2, transition: 'width .2s' }} />
                    </div>
                  </div>
                )}
                {item.status === 'failed' && (
                  <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>⚠️ 인식 실패 — 직접 입력</div>
                )}

                {/* 입력 필드 */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>금액 (원) *</div>
                    <input
                      type="number"
                      value={item.amount}
                      onChange={e => updateItem(item.id, 'amount', e.target.value)}
                      placeholder="금액 입력"
                      style={{ width: '100%', padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, background: '#fff' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>날짜</div>
                    <input
                      type="date"
                      value={item.date}
                      onChange={e => updateItem(item.id, 'date', e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, background: '#fff' }}
                    />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>메모</div>
                  <input
                    type="text"
                    value={item.notes}
                    onChange={e => updateItem(item.id, 'notes', e.target.value)}
                    placeholder="메모 (선택)"
                    style={{ width: '100%', padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, background: '#fff' }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* 전체 저장 버튼 */}
          <div style={{ position: 'sticky', bottom: 20, display: 'flex', gap: 10 }}>
            <button
              className="btn btn-green"
              style={{ flex: 1, fontSize: 16, padding: '14px 0', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}
              onClick={handleSaveAll}
              disabled={saving || processing || validCount === 0}
            >
              {saving ? '저장 중...' : processing ? `인식 중... (${items.filter(i => i.status === 'processing').length}장)` : `✓ ${validCount}장 전체 저장`}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MultiAddPage;
