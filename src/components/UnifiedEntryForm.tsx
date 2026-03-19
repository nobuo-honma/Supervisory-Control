// src/components/UnifiedEntryForm.tsx
'use client';
import { useState } from 'react';
import type { 
  HouseholdInsert, MemberInsert, Block, Division, CardType 
} from '@/types/roster';
import { DIVISIONS, CARD_TYPES } from '@/types/roster';

interface Props {
  blocks: Block[];
  onSubmit: (hData: HouseholdInsert, mData: Omit<MemberInsert, 'household_id'>) => Promise<{ error: string | null }>;
  onCancel: () => void;
}

export default function UnifiedEntryForm({ blocks, onSubmit, onCancel }: Props) {
  const [hForm, setHForm] = useState<HouseholdInsert>({
    block_id: blocks[0]?.id ?? '',
    address: '',
    building: '',
    notes: '',
  });

  const [mForm, setMForm] = useState<Omit<MemberInsert, 'household_id'>>({
    card_type: '世帯',
    name: '',
    name_kana: '',
    division: null,
    position: '',
    gakkai_study: '',
    is_present: true,
    phone: '',
    email: '',
    birth_date: null,
    faith_date: null,
    has_newspaper: false,
    visited: false,
    attended: false,
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hForm.block_id) { setErr('支部を選択してください。'); return; }
    if (!mForm.name.trim()) { setErr('氏名は必須です。'); return; }
    setSubmitting(true); setErr(null);
    const res = await onSubmit(hForm, mForm);
    if (res.error) { setErr(res.error); setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal modal--lg">
        <div className="modal__header">
          <h2 className="modal__title">世帯カード新規登録</h2>
          <button className="modal__close" onClick={onCancel}>✕</button>
        </div>

        <form className="modal__form" onSubmit={handleSubmit}>
          {err && <div className="form-error">{err}</div>}

          <div className="unified-form-grid">
            {/* 左カラム: 世帯情報 */}
            <div className="form-column">
              <h3 className="form-section-title">🏠 世帯情報</h3>
              <div className="form-group form-group--required">
                <label className="form-label">支部</label>
                <select className="form-input" value={hForm.block_id}
                  onChange={e => setHForm(p => ({ ...p, block_id: e.target.value }))}>
                  <option value="">選択してください</option>
                  {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">住所</label>
                <input className="form-input" value={hForm.address ?? ''}
                  onChange={e => setHForm(p => ({ ...p, address: e.target.value || null }))}
                  placeholder="例: 岩見沢市1条1丁目" />
              </div>
              <div className="form-group">
                <label className="form-label">建物名・部屋番号</label>
                <input className="form-input" value={hForm.building ?? ''}
                  onChange={e => setHForm(p => ({ ...p, building: e.target.value || null }))}
                  placeholder="例: 〇〇マンション 101号" />
              </div>
              <div className="form-group">
                <label className="form-label">世帯備考</label>
                <textarea className="form-input form-textarea" rows={2}
                  value={hForm.notes ?? ''}
                  onChange={e => setHForm(p => ({ ...p, notes: e.target.value || null }))} />
              </div>
            </div>

            {/* 右カラム: 世帯主情報 */}
            <div className="form-column">
              <h3 className="form-section-title">👤 代表者情報</h3>
              <div className="form-row">
                <div className="form-group form-group--required">
                  <label className="form-label">氏名</label>
                  <input className="form-input" value={mForm.name}
                    onChange={e => setMForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="山田 太郎" />
                </div>
                <div className="form-group">
                  <label className="form-label">よみがな</label>
                  <input className="form-input" value={mForm.name_kana ?? ''}
                    onChange={e => setMForm(p => ({ ...p, name_kana: e.target.value || null }))}
                    placeholder="やまだ たろう" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">部別</label>
                  <select className="form-input" value={mForm.division ?? ''}
                    onChange={e => setMForm(p => ({ ...p, division: e.target.value as Division || null }))}>
                    <option value="">選択してください</option>
                    {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">役職</label>
                  <input className="form-input" value={mForm.position ?? ''}
                    onChange={e => setMForm(p => ({ ...p, position: e.target.value || null }))}
                    placeholder="例: ブロック長" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">教学</label>
                  <input className="form-input" value={mForm.gakkai_study ?? ''}
                    onChange={e => setMForm(p => ({ ...p, gakkai_study: e.target.value || null }))}
                    placeholder="例: 教授" />
                </div>
                <div className="form-group">
                  <label className="form-label">電話番号</label>
                  <input className="form-input" value={mForm.phone ?? ''}
                    onChange={e => setMForm(p => ({ ...p, phone: e.target.value || null }))}
                    placeholder="090-0000-0000" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">生年月日</label>
                  <input type="date" className="form-input" value={mForm.birth_date ?? ''}
                    onChange={e => setMForm(p => ({ ...p, birth_date: e.target.value || null }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">入信年月日</label>
                  <input type="date" className="form-input" value={mForm.faith_date ?? ''}
                    onChange={e => setMForm(p => ({ ...p, faith_date: e.target.value || null }))} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">活動状況</label>
                <div className="flags-row">
                  <label className="flag-toggle">
                    <input type="checkbox" checked={mForm.has_newspaper} 
                      onChange={e => setMForm(p => ({ ...p, has_newspaper: e.target.checked }))} />
                    <span className="flag-toggle__track" />
                    <span className="flag-toggle__label">新聞</span>
                  </label>
                  <label className="flag-toggle">
                    <input type="checkbox" checked={mForm.visited} 
                      onChange={e => setMForm(p => ({ ...p, visited: e.target.checked }))} />
                    <span className="flag-toggle__track" />
                    <span className="flag-toggle__label">訪問</span>
                  </label>
                  <label className="flag-toggle">
                    <input type="checkbox" checked={mForm.attended} 
                      onChange={e => setMForm(p => ({ ...p, attended: e.target.checked }))} />
                    <span className="flag-toggle__track" />
                    <span className="flag-toggle__label">合流</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onCancel}>キャンセル</button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? '登録中...' : '世帯カードを作成'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .unified-form-grid {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 2rem;
          padding: 1rem 0;
        }
        .form-column {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .form-section-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--color-primary);
          border-bottom: 2px solid var(--color-border);
          padding-bottom: 0.5rem;
          margin-bottom: 0.5rem;
        }
        @media (max-width: 768px) {
          .unified-form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
