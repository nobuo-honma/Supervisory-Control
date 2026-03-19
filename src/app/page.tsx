// src/app/page.tsx
'use client';
import { useState, useMemo } from 'react';
import { useRoster } from '@/hooks/useRoster';
import { useBlocks } from '@/hooks/useBlocks';
import SearchBar from '@/components/SearchBar';
import HouseholdCard from '@/components/HouseholdCard';
import HouseholdForm from '@/components/HouseholdForm';
import MemberForm from '@/components/MemberForm';
import UnifiedEntryForm from '@/components/UnifiedEntryForm';
import type {
  Household, Member,
  HouseholdInsert, MemberInsert,
  SearchFilters,
} from '@/types/roster';
import { defaultFilters } from '@/types/roster';

type Modal =
  | { type: 'addHousehold' }
  | { type: 'editHousehold'; hh: Household }
  | { type: 'addMember'; hh: Household }
  | { type: 'editMember'; member: Member; hh: Household }
  | { type: 'deleteHousehold'; hh: Household }
  | { type: 'deleteMember'; member: Member }
  | null;

export default function RosterPage() {
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const { blocks, addBlock } = useBlocks();
  const {
    households, loading, error,
    addHousehold, updateHousehold, deleteHousehold,
    addMember, updateMember, deleteMember,
    addUnifiedEntry,
  } = useRoster(filters);

  const [modal, setModal] = useState<Modal>(null);
  const [delErr, setDelErr] = useState<string | null>(null);
  const [newBlockName, setNewBlockName] = useState('');
  const [showBlockInput, setShowBlockInput] = useState(false);

  const totalMembers = useMemo(
    () => households.reduce((s, hh) => s + (hh.members?.length ?? 0), 0),
    [households]
  );

  // ── Household handlers ──────────────────────
  const handleAddHousehold = async (data: HouseholdInsert) => {
    const res = await addHousehold(data);
    if (!res.error) setModal(null);
    return res;
  };
  const handleEditHousehold = async (data: HouseholdInsert) => {
    if (modal?.type !== 'editHousehold') return { error: null };
    const res = await updateHousehold(modal.hh.id, data);
    if (!res.error) setModal(null);
    return res;
  };
  const handleDeleteHousehold = async () => {
    if (modal?.type !== 'deleteHousehold') return;
    const res = await deleteHousehold(modal.hh.id);
    if (res.error) { setDelErr(res.error); return; }
    setModal(null); setDelErr(null);
  };

  // ── Member handlers ─────────────────────────
  const handleAddMember = async (data: MemberInsert) => {
    const res = await addMember(data);
    if (!res.error) setModal(null);
    return res;
  };
  const handleEditMember = async (data: MemberInsert) => {
    if (modal?.type !== 'editMember') return { error: null };
    const res = await updateMember(modal.member.id, data);
    if (!res.error) setModal(null);
    return res;
  };
  const handleDeleteMember = async () => {
    if (modal?.type !== 'deleteMember') return;
    const res = await deleteMember(modal.member.id);
    if (res.error) { setDelErr(res.error); return; }
    setModal(null); setDelErr(null);
  };

  const handleAddUnifiedEntry = async (hData: HouseholdInsert, mData: Omit<MemberInsert, 'household_id'>) => {
    const res = await addUnifiedEntry(hData, mData);
    if (!res.error) setModal(null);
    return res;
  };

  // ── Add block ───────────────────────────────
  const handleAddBlock = async () => {
    if (!newBlockName.trim()) return;
    await addBlock(newBlockName.trim());
    setNewBlockName(''); setShowBlockInput(false);
  };

  return (
    <div className="app">
      {/* ヘッダー */}
      <header className="app-header print:hidden">
        <div className="app-header__inner">
          <div className="app-header__title">
            <span className="app-header__icon">📒</span>
            <h1>地区名簿</h1>
          </div>
          <div className="app-header__actions">
            {showBlockInput ? (
              <div className="block-input-row">
                <input className="block-input" value={newBlockName}
                  onChange={e => setNewBlockName(e.target.value)}
                  placeholder="支部名を入力"
                  onKeyDown={e => e.key === 'Enter' && handleAddBlock()} />
                <button className="btn btn--primary btn--sm" onClick={handleAddBlock}>追加</button>
                <button className="btn btn--ghost btn--sm" onClick={() => setShowBlockInput(false)}>✕</button>
              </div>
            ) : (
              <button className="btn btn--outline" onClick={() => setShowBlockInput(true)}>＋ ブロック追加</button>
            )}
            <button className="btn btn--outline" onClick={() => window.print()}>🖨 印刷</button>
            <button className="btn btn--primary" onClick={() => setModal({ type: 'addHousehold' })}>
              ＋ 世帯カード追加
            </button>
          </div>
        </div>
      </header>

      {/* 印刷タイトル */}
      <div className="print-title hidden print:block">
        <h1>地区名簿</h1>
        <p>印刷日：{new Date().toLocaleDateString('ja-JP')}</p>
      </div>

      <main className="app-main">
        <SearchBar
          filters={filters}
          onChange={setFilters}
          blocks={blocks}
          totalMembers={totalMembers}
          totalHouseholds={households.length}
        />

        {error && <div className="alert alert--error">{error}</div>}

        {loading ? (
          <div className="loading">
            <div className="loading__spinner" />
            <span>読み込み中...</span>
          </div>
        ) : households.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">📋</div>
            <p>該当する世帯が見つかりませんでした</p>
          </div>
        ) : (
          <div className="household-list">
            {households.map(hh => (
              <HouseholdCard
                key={hh.id}
                household={hh}
                onEditHousehold={h => setModal({ type: 'editHousehold', hh: h })}
                onDeleteHousehold={h => { setModal({ type: 'deleteHousehold', hh: h }); setDelErr(null); }}
                onAddMember={h => setModal({ type: 'addMember', hh: h })}
                onEditMember={(m, h) => setModal({ type: 'editMember', member: m, hh: h })}
                onDeleteMember={m => { setModal({ type: 'deleteMember', member: m }); setDelErr(null); }}
              />
            ))}
          </div>
        )}
      </main>

      {/* モーダル群 */}
      {modal?.type === 'addHousehold' && (
        <UnifiedEntryForm blocks={blocks} onSubmit={handleAddUnifiedEntry} onCancel={() => setModal(null)} />
      )}
      {modal?.type === 'editHousehold' && (
        <HouseholdForm initial={modal.hh} blocks={blocks} onSubmit={handleEditHousehold} onCancel={() => setModal(null)} />
      )}
      {modal?.type === 'addMember' && (
        <MemberForm household={modal.hh} onSubmit={handleAddMember} onCancel={() => setModal(null)} />
      )}
      {modal?.type === 'editMember' && (
        <MemberForm initial={modal.member} household={modal.hh} onSubmit={handleEditMember} onCancel={() => setModal(null)} />
      )}

      {/* 削除確認 */}
      {(modal?.type === 'deleteHousehold' || modal?.type === 'deleteMember') && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal modal--sm">
            <div className="modal__header">
              <h2 className="modal__title">削除の確認</h2>
            </div>
            <div className="modal__body">
              {modal.type === 'deleteHousehold' ? (
                <p><b>{modal.hh.address ?? '（住所未登録）'}</b> の世帯カードと全メンバーを削除しますか？</p>
              ) : (
                <p><b>{(modal as { member: Member }).member.name}</b> を名簿から削除しますか？</p>
              )}
              <p className="modal__body-sub">この操作は取り消せません。</p>
              {delErr && <div className="form-error">{delErr}</div>}
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => { setModal(null); setDelErr(null); }}>キャンセル</button>
              <button className="btn btn--danger"
                onClick={modal.type === 'deleteHousehold' ? handleDeleteHousehold : handleDeleteMember}>
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
