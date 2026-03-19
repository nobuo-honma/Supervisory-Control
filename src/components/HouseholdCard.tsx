// src/components/HouseholdCard.tsx
'use client';
import type { Household, Member } from '@/types/roster';

interface Props {
  household: Household;
  onEditHousehold: (hh: Household) => void;
  onDeleteHousehold: (hh: Household) => void;
  onAddMember: (hh: Household) => void;
  onEditMember: (m: Member, hh: Household) => void;
  onDeleteMember: (m: Member) => void;
}

function calcAge(birth: string | null): string {
  if (!birth) return '—';
  const b = new Date(birth), t = new Date();
  const age = t.getFullYear() - b.getFullYear()
    - (t < new Date(t.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0);
  return `${age}歳`;
}

function fmt(d: string | null) {
  return d ? d.replace(/-/g, '/') : '—';
}

const FLAG = (v: boolean) => (
  <span className={`flag ${v ? 'flag--yes' : 'flag--no'}`}>{v ? '○' : '✕'}</span>
);

const PRESENCE = (v: boolean) => (
  <span className={`presence-badge ${v ? '' : 'presence-badge--absent'}`}>
    {v ? '在' : '不在'}
  </span>
);

const CARD_BADGE: Record<string, string> = {
  '世帯': 'card-badge card-badge--household',
  '連名': 'card-badge card-badge--joint',
  '個人': 'card-badge card-badge--individual',
};

export default function HouseholdCard({
  household, onEditHousehold, onDeleteHousehold, onAddMember, onEditMember, onDeleteMember,
}: Props) {
  const members = household.members ?? [];
  const blockName = household.block?.name ?? '';

  return (
    <div className="household-card">
      {/* カードヘッダー */}
      <div className="hh-header">
        <div className="hh-header__left">
          <span className="hh-block-tag">{blockName}</span>
          <div className="hh-address">
            <span className="hh-address__main">{household.address ?? '住所未登録'}</span>
            {household.building && (
              <span className="hh-address__building">{household.building}</span>
            )}
          </div>
        </div>
        <div className="hh-header__actions print:hidden">
          <button className="icon-btn" title="世帯を編集" onClick={() => onEditHousehold(household)}>✏️</button>
          <button className="icon-btn icon-btn--add" title="メンバー追加" onClick={() => onAddMember(household)}>＋</button>
          <button className="icon-btn icon-btn--del" title="世帯を削除" onClick={() => onDeleteHousehold(household)}>🗑</button>
        </div>
      </div>

      {/* メンバー一覧 */}
      {members.length === 0 ? (
        <div className="hh-empty">メンバーなし</div>
      ) : (
        <div className="member-list">
          <div className="member-list__head">
            <span>種別</span>
            <span>氏名</span>
            <span>部別</span>
            <span>役職</span>
            <span>所在</span>
            <span>電話番号</span>
            <span>生年月日</span>
            <span>年齢</span>
            <span>入信日</span>
            <span>新聞</span>
            <span>訪問</span>
            <span>会合</span>
            <span className="print:hidden">操作</span>
          </div>
          {members.map(m => (
            <div key={m.id} className="member-row">
              <span><span className={CARD_BADGE[m.card_type]}>{m.card_type}</span></span>
              <span className="member-name">
                <span>{m.name}</span>
                {m.name_kana && <span className="member-kana">{m.name_kana}</span>}
              </span>
              <span className="cell-small">{m.division ?? '—'}</span>
              <span className="cell-small">{m.position ?? '—'}</span>
              <span>{PRESENCE(m.is_present)}</span>
              <span className="cell-phone">{m.phone ?? '—'}</span>
              <span className="cell-small">{fmt(m.birth_date)}</span>
              <span className="cell-small">{calcAge(m.birth_date)}</span>
              <span className="cell-small">{fmt(m.faith_date)}</span>
              <span>{FLAG(m.has_newspaper)}</span>
              <span>{FLAG(m.visited)}</span>
              <span>{FLAG(m.attended)}</span>
              <span className="member-actions print:hidden">
                <button className="icon-btn" onClick={() => onEditMember(m, household)}>✏️</button>
                <button className="icon-btn icon-btn--del" onClick={() => onDeleteMember(m)}>🗑</button>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 備考 */}
      {household.notes && (
        <div className="hh-notes">📝 {household.notes}</div>
      )}
    </div>
  );
}
