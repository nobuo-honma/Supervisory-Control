// src/components/MemberForm.tsx
'use client';
import { useState } from 'react';
import type { Member, MemberInsert, Household, CardType, Division } from '@/types/roster';
import { CARD_TYPES, DIVISIONS } from '@/types/roster';

interface Props {
  initial?: Member;
  household: Household;
  onSubmit: (data: MemberInsert) => Promise<{ error: string | null }>;
  onCancel: () => void;
}

const emptyMember = (householdId: string): MemberInsert => ({
  household_id: householdId,
  card_type: '連名',
  name: '',
  name_kana: null,
  division: null,
  position: null,
  gakkai_study: null,
  is_present: true,
  phone: null,
  email: null,
  birth_date: null,
  faith_date: null,
  has_newspaper: false,
  visited: false,
  attended: false,
  notes: null,
});

const sanitizeMember = (m: Member): MemberInsert => ({
  household_id: m.household_id,
  card_type: m.card_type,
  name: m.name,
  name_kana: m.name_kana,
  division: m.division,
  position: m.position,
  gakkai_study: m.gakkai_study,
  is_present: m.is_present,
  phone: m.phone,
  email: m.email,
  birth_date: m.birth_date,
  faith_date: m.faith_date,
  has_newspaper: m.has_newspaper,
  visited: m.visited,
  attended: m.attended,
  notes: m.notes,
});

export default function MemberForm({ initial, household, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<MemberInsert>(
    initial
      ? sanitizeMember(initial)
      : emptyMember(household.id)
  );
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (key: keyof MemberInsert, value: unknown) =>
    setForm(p => ({ ...p, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setErr('氏名は必須です。'); return; }
    setSubmitting(true); setErr(null);
    const res = await onSubmit(form);
    if (res.error) { setErr(res.error); setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal">
        <div className="modal__header">
          <h2 className="modal__title">{initial ? 'メンバー編集' : 'メンバー追加'}</h2>
          <button className="modal__close" onClick={onCancel}>✕</button>
        </div>

        <form className="modal__form" onSubmit={handleSubmit}>
          {err && <div className="form-error">{err}</div>}

          {/* 世帯情報（表示のみ） */}
          <div className="form-info-row">
            <span className="form-info-label">世帯住所</span>
            <span className="form-info-val">{household.address ?? '—'} {household.building ?? ''}</span>
          </div>

          {/* カード種別 */}
          <div className="form-section">
            <div className="form-section__label">カード種別</div>
            <div className="card-type-buttons">
              {CARD_TYPES.map(t => (
                <button key={t} type="button"
                  className={`card-type-btn${form.card_type === t ? ' card-type-btn--active' : ''}`}
                  onClick={() => set('card_type', t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* 基本情報 */}
          <div className="form-section">
            <div className="form-section__label">基本情報</div>
            <div className="form-row">
              <div className="form-group form-group--required">
                <label className="form-label">氏名</label>
                <input className="form-input" value={form.name}
                  onChange={e => set('name', e.target.value)} placeholder="山田 太郎" />
              </div>
              <div className="form-group">
                <label className="form-label">よみがな</label>
                <input className="form-input" value={form.name_kana ?? ''}
                  onChange={e => set('name_kana', e.target.value || null)} placeholder="やまだ たろう" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">生年月日</label>
                <input type="date" className="form-input" value={form.birth_date ?? ''}
                  onChange={e => set('birth_date', e.target.value || null)} />
              </div>
              <div className="form-group">
                <label className="form-label">入信年月日</label>
                <input type="date" className="form-input" value={form.faith_date ?? ''}
                  onChange={e => set('faith_date', e.target.value || null)} />
              </div>
            </div>
          </div>

          {/* 組織情報 */}
          <div className="form-section">
            <div className="form-section__label">組織情報</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">部別</label>
                <select className="form-input" value={form.division ?? ''}
                  onChange={e => set('division', e.target.value as Division || null)}>
                  <option value="">選択してください</option>
                  {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">役職</label>
                <input className="form-input" value={form.position ?? ''}
                  onChange={e => set('position', e.target.value || null)} placeholder="ブロック長" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">教学</label>
                <input className="form-input" value={form.gakkai_study ?? ''}
                  onChange={e => set('gakkai_study', e.target.value || null)} placeholder="教学級" />
              </div>
              <div className="form-group">
                <label className="form-label">所在</label>
                <select className="form-input" value={form.is_present ? 'present' : 'absent'}
                  onChange={e => set('is_present', e.target.value === 'present')}>
                  <option value="present">在</option>
                  <option value="absent">不在</option>
                </select>
              </div>
            </div>
          </div>

          {/* 連絡先 */}
          <div className="form-section">
            <div className="form-section__label">連絡先</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">電話番号</label>
                <input className="form-input" value={form.phone ?? ''}
                  onChange={e => set('phone', e.target.value || null)} placeholder="090-0000-0000" />
              </div>
              <div className="form-group">
                <label className="form-label">メール</label>
                <input type="email" className="form-input" value={form.email ?? ''}
                  onChange={e => set('email', e.target.value || null)} />
              </div>
            </div>
          </div>

          {/* 活動フラグ */}
          <div className="form-section">
            <div className="form-section__label">活動状況</div>
            <div className="flags-row">
              {([
                ['has_newspaper', '新聞購読'],
                ['visited', '訪問'],
                ['attended', '会合参加'],
              ] as [keyof MemberInsert, string][]).map(([key, label]) => (
                <label key={key} className="flag-toggle">
                  <input type="checkbox"
                    checked={!!form[key]}
                    onChange={e => set(key, e.target.checked)} />
                  <span className="flag-toggle__track" />
                  <span className="flag-toggle__label">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 備考 */}
          <div className="form-section">
            <div className="form-group">
              <label className="form-label">備考</label>
              <textarea className="form-input form-textarea" rows={3}
                value={form.notes ?? ''}
                onChange={e => set('notes', e.target.value || null)} />
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
