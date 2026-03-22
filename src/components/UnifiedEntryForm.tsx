// src/components/UnifiedEntryForm.tsx
'use client';
import { useState } from 'react';
import type { 
  HouseholdInsert, MemberInsert, Block, Division, CardType 
} from '@/types/roster';
import { DIVISIONS } from '@/types/roster';

interface Props {
  blocks: Block[];
  onSubmit: (hData: HouseholdInsert, mDatas: Omit<MemberInsert, 'household_id'>[]) => Promise<{ error: string | null }>;
  onCancel: () => void;
}

type EntryType = 'household' | 'individual';

const INITIAL_MEMBER = (cardType: CardType): Omit<MemberInsert, 'household_id'> => ({
  card_type: cardType,
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

export default function UnifiedEntryForm({ blocks, onSubmit, onCancel }: Props) {
  const [entryType, setEntryType] = useState<EntryType>('household');
  const [hForm, setHForm] = useState<HouseholdInsert>({
    block_id: blocks[0]?.id ?? '',
    address: '',
    building: '',
    notes: '',
  });

  const [members, setMembers] = useState<Omit<MemberInsert, 'household_id'>[]>([
    INITIAL_MEMBER('世帯')
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // カード種類の切り替え
  const handleTypeChange = (type: EntryType) => {
    setEntryType(type);
    if (type === 'individual') {
      setMembers([INITIAL_MEMBER('個人')]);
    } else {
      setMembers([INITIAL_MEMBER('世帯')]);
    }
  };

  // メンバー追加
  const addMember = () => {
    setMembers([...members, INITIAL_MEMBER('連名')]);
  };

  // メンバー削除
  const removeMember = (index: number) => {
    if (members.length <= 1) return;
    setMembers(members.filter((_, i) => i !== index));
  };

  // メンバー情報更新
  const updateMember = (index: number, updates: Partial<Omit<MemberInsert, 'household_id'>>) => {
    setMembers(members.map((m, i) => i === index ? { ...m, ...updates } : m));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hForm.block_id) { setErr('ブロックを選択してください。'); return; }
    if (members.some(m => !m.name.trim())) { setErr('すべてのメンバーの氏名を入力してください。'); return; }
    
    setSubmitting(true); 
    setErr(null);
    const res = await onSubmit(hForm, members);
    if (res.error) { 
      setErr(res.error); 
      setSubmitting(false); 
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal modal--lg">
        <div className="modal__header">
          <h2 className="modal__title">新規登録</h2>
          <button className="modal__close" onClick={onCancel}>✕</button>
        </div>

        <form className="modal__form" onSubmit={handleSubmit}>
          {err && <div className="form-error">{err}</div>}

          {/* カード種類選択 */}
          <div className="entry-type-selector">
            <button type="button" 
              className={`type-btn ${entryType === 'household' ? 'active' : ''}`}
              onClick={() => handleTypeChange('household')}>
              🏠 世帯カード
            </button>
            <button type="button" 
              className={`type-btn ${entryType === 'individual' ? 'active' : ''}`}
              onClick={() => handleTypeChange('individual')}>
              👤 個人カード
            </button>
          </div>

          <div className="unified-form-content">
            {/* 世帯情報セクション */}
            <div className="form-section">
              <h3 className="form-section-title">拠点情報</h3>
              <div className="form-row">
                <div className="form-group form-group--required">
                  <label className="form-label">ブロック</label>
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
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">建物名・部屋番号</label>
                  <input className="form-input" value={hForm.building ?? ''}
                    onChange={e => setHForm(p => ({ ...p, building: e.target.value || null }))}
                    placeholder="例: 〇〇マンション 101号" />
                </div>
                <div className="form-group">
                  <label className="form-label">世帯備考</label>
                  <input className="form-input" value={hForm.notes ?? ''}
                    onChange={e => setHForm(p => ({ ...p, notes: e.target.value || null }))} />
                </div>
              </div>
            </div>

            {/* メンバー情報セクション */}
            <div className="members-section">
              <h3 className="form-section-title">
                {entryType === 'household' ? '世帯メンバー情報' : '個人情報'}
              </h3>
              
              <div className="members-list">
                {members.map((m, idx) => (
                  <div key={idx} className="member-form-card">
                    <div className="member-form-header">
                      <span className="member-number">
                        {entryType === 'household' 
                          ? (idx === 0 ? '代表者' : `連名 ${idx}`) 
                          : '本人'}
                      </span>
                      {entryType === 'household' && idx > 0 && (
                        <button type="button" className="btn-remove" onClick={() => removeMember(idx)}>削除</button>
                      )}
                    </div>

                    <div className="form-row">
                      <div className="form-group form-group--required">
                        <label className="form-label">氏名</label>
                        <input className="form-input" value={m.name}
                          onChange={e => updateMember(idx, { name: e.target.value })}
                          placeholder="山田 太郎" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">よみがな</label>
                        <input className="form-input" value={m.name_kana ?? ''}
                          onChange={e => updateMember(idx, { name_kana: e.target.value || null })} />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">部別</label>
                        <select className="form-input" value={m.division ?? ''}
                          onChange={e => updateMember(idx, { division: e.target.value as Division || null })}>
                          <option value="">選択</option>
                          {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">役職</label>
                        <input className="form-input" value={m.position ?? ''}
                          onChange={e => updateMember(idx, { position: e.target.value || null })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">教学</label>
                        <input className="form-input" value={m.gakkai_study ?? ''}
                          onChange={e => updateMember(idx, { gakkai_study: e.target.value || null })} />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">生年月日</label>
                        <input type="date" className="form-input" value={m.birth_date ?? ''}
                          onChange={e => updateMember(idx, { birth_date: e.target.value || null })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">入信日</label>
                        <input type="date" className="form-input" value={m.faith_date ?? ''}
                          onChange={e => updateMember(idx, { faith_date: e.target.value || null })} />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">電話番号</label>
                        <input className="form-input" value={m.phone ?? ''}
                          onChange={e => updateMember(idx, { phone: e.target.value || null })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">活動フラグ</label>
                        <div className="flags-row">
                          <label className="flag-toggle">
                            <input type="checkbox" checked={m.has_newspaper} 
                              onChange={e => updateMember(idx, { has_newspaper: e.target.checked })} />
                            <span className="flag-toggle__track" />
                            <span className="flag-toggle__label">新聞</span>
                          </label>
                          <label className="flag-toggle">
                            <input type="checkbox" checked={m.visited} 
                              onChange={e => updateMember(idx, { visited: e.target.checked })} />
                            <span className="flag-toggle__track" />
                            <span className="flag-toggle__label">訪問</span>
                          </label>
                          <label className="flag-toggle">
                            <input type="checkbox" checked={m.attended} 
                              onChange={e => updateMember(idx, { attended: e.target.checked })} />
                            <span className="flag-toggle__track" />
                            <span className="flag-toggle__label">合流</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {entryType === 'household' && (
                <button type="button" className="btn-add-member" onClick={addMember}>
                  ＋ メンバーを追加
                </button>
              )}
            </div>
          </div>

          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onCancel}>キャンセル</button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? '登録中...' : '登録を完了する'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .modal--lg { max-width: 900px; }
        .unified-form-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding: 1rem 0;
        }
        .entry-type-selector {
          display: flex;
          gap: 10px;
          margin-bottom: 1rem;
        }
        .type-btn {
          flex: 1;
          padding: 12px;
          border: 2px solid var(--border);
          border-radius: var(--r);
          background: var(--surface-2);
          cursor: pointer;
          font-weight: 600;
          transition: 0.2s;
        }
        .type-btn.active {
          border-color: var(--primary);
          background: var(--primary-lt);
          color: var(--primary-dk);
        }
        .form-section {
          background: var(--surface-2);
          padding: 1.25rem;
          border-radius: var(--r);
          border: 1px solid var(--border-lt);
        }
        .form-section-title {
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 1rem;
          color: var(--primary-dk);
          border-left: 4px solid var(--primary);
          padding-left: 10px;
        }
        .members-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-height: 450px;
          overflow-y: auto;
          padding-right: 8px;
        }
        .member-form-card {
          background: white;
          border: 1px solid var(--border);
          border-radius: var(--r);
          padding: 1.25rem;
          position: relative;
        }
        .member-form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px dashed var(--border-lt);
        }
        .member-number {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-sub);
          background: var(--surface-2);
          padding: 2px 10px;
          border-radius: 100px;
        }
        .btn-remove {
          background: none;
          border: none;
          color: var(--danger);
          font-size: 0.8rem;
          cursor: pointer;
          text-decoration: underline;
        }
        .btn-add-member {
          width: 100%;
          padding: 12px;
          margin-top: 1rem;
          border: 2px dashed var(--border);
          border-radius: var(--r);
          background: transparent;
          color: var(--primary);
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
        }
        .btn-add-member:hover {
          background: var(--primary-lt);
          border-color: var(--primary);
        }
      `}</style>
    </div>
  );
}
