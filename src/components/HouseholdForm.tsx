// src/components/HouseholdForm.tsx
'use client';
import { useState } from 'react';
import type { Household, HouseholdInsert, Block } from '@/types/roster';

interface Props {
  initial?: Household;
  blocks: Block[];
  onSubmit: (data: HouseholdInsert) => Promise<{ error: string | null }>;
  onCancel: () => void;
}

export default function HouseholdForm({ initial, blocks, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<HouseholdInsert>({
    block_id: initial?.block_id ?? (blocks[0]?.id ?? ''),
    address: initial?.address ?? null,
    building: initial?.building ?? null,
    notes: initial?.notes ?? null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (key: keyof HouseholdInsert, val: string | null) =>
    setForm(p => ({ ...p, [key]: val || null }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.block_id) { setErr('支部を選択してください。'); return; }
    setSubmitting(true); setErr(null);
    const res = await onSubmit(form);
    if (res.error) { setErr(res.error); setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal modal--sm">
        <div className="modal__header">
          <h2 className="modal__title">{initial ? '世帯カード編集' : '世帯カード追加'}</h2>
          <button className="modal__close" onClick={onCancel}>✕</button>
        </div>
        <form className="modal__form" onSubmit={handleSubmit}>
          {err && <div className="form-error">{err}</div>}
          <div className="form-section">
            <div className="form-row">
              <div className="form-group form-group--required">
                <label className="form-label">支部</label>
                <select className="form-input" value={form.block_id}
                  onChange={e => setForm(p => ({ ...p, block_id: e.target.value }))}>
                  <option value="">選択...</option>
                  {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">住所</label>
                <input className="form-input" value={form.address ?? ''}
                  onChange={e => set('address', e.target.value)} placeholder="〇〇市〇〇町1-1" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">建物名・部屋番号</label>
                <input className="form-input" value={form.building ?? ''}
                  onChange={e => set('building', e.target.value)} placeholder="〇〇マンション 101号" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">備考</label>
                <textarea className="form-input form-textarea" rows={2}
                  value={form.notes ?? ''}
                  onChange={e => set('notes', e.target.value)} />
              </div>
            </div>
          </div>
          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onCancel}>キャンセル</button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? '保存中...' : (initial ? '変更を保存' : '追加する')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
