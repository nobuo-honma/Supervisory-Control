// src/app/roster/page.tsx
'use client';
import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useRoster } from '@/hooks/useRoster';
import { useBlocks } from '@/hooks/useBlocks';
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

type ViewMode = 'table' | 'card';

const ALL_DIVISIONS = [
  "すべて", "壮年部", "男子部", "男子学生部", "男子高等部", "男子中等部", "少年部",
  "男子未就学", "女性部", "華陽会", "女子学生部", "女子高等部", "女子中等部", "少女部", "女子未就学"
];

// 生年月日から年齢を計算する関数
function calculateAge(birthDateString?: string | null) {
  if (!birthDateString) return null;
  const birthDate = new Date(birthDateString);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// ★ 和暦（令和・平成・昭和）に変換する関数
function formatWareki(dateStr?: string | null) {
  if (!dateStr || dateStr === '-') return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr; // 日付として不正ならそのまま返す

  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();

  let era = '';
  let warekiYear = y;

  if (y > 2019 || (y === 2019 && m >= 5)) {
    era = '令和';
    warekiYear = y - 2018;
  } else if (y > 1989 || (y === 1989 && m >= 1 && day >= 8)) {
    era = '平成';
    warekiYear = y - 1988;
  } else if (y > 1926 || (y === 1926 && m >= 12 && day >= 25)) {
    era = '昭和';
    warekiYear = y - 1925;
  } else if (y > 1912 || (y === 1912 && m >= 7 && day >= 30)) {
    era = '大正';
    warekiYear = y - 1911;
  } else {
    // 明治以前の場合は西暦のまま返す
    return `${y}年${m}月${day}日`;
  }

  // 1年の場合は「元年」にする
  const yearStr = warekiYear === 1 ? '元' : warekiYear.toString();
  return `${era}${yearStr}年${m}月${day}日`;
}

function RosterContent() {
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  const [selectedBlock, setSelectedBlock] = useState<string>('すべて');
  const [selectedDivision, setSelectedDivision] = useState<string>('すべて');

  const { blocks, addBlock } = useBlocks();
  const {
    households, loading, error,
    addHousehold, updateHousehold, deleteHousehold,
    addMember, updateMember, deleteMember,
    addUnifiedEntry,
  } = useRoster(filters);

  const searchParams = useSearchParams();
  const [modal, setModal] = useState<Modal>(null);
  const [delErr, setDelErr] = useState<string | null>(null);
  const [newBlockName, setNewBlockName] = useState('');
  const [showBlockInput, setShowBlockInput] = useState(false);

  const displayedHouseholds = useMemo(() => {
    return households.map(hh => {
      // Supabaseの外部キー参照対応（block または blocks プロパティ）
      const hhBlockName = typeof hh.block === 'string' ? hh.block : hh.block?.name || hh.blocks?.name || '';

      if (selectedBlock !== 'すべて' && hhBlockName !== selectedBlock) return null;
      let filteredMembers = hh.members || [];
      if (selectedDivision !== 'すべて') {
        filteredMembers = filteredMembers.filter(m => m.division === selectedDivision);
      }
      if (selectedDivision !== 'すべて' && filteredMembers.length === 0) return null;
      return { ...hh, members: filteredMembers };
    }).filter(Boolean) as Household[];
  }, [households, selectedBlock, selectedDivision]);

  const totalMembers = useMemo(
    () => displayedHouseholds.reduce((s, hh) => s + (hh.members?.length ?? 0), 0), [displayedHouseholds]
  );

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'add') setModal({ type: 'addHousehold' });
    else if (action === 'print') {
      setViewMode('table');
      const timer = setTimeout(() => window.print(), 800);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const handleAddHousehold = async (data: HouseholdInsert) => { const res = await addHousehold(data); if (!res.error) setModal(null); return res; };
  const handleEditHousehold = async (data: HouseholdInsert) => { if (modal?.type !== 'editHousehold') return { error: null }; const res = await updateHousehold(modal.hh.id, data); if (!res.error) setModal(null); return res; };
  const handleDeleteHousehold = async () => { if (modal?.type !== 'deleteHousehold') return; const res = await deleteHousehold(modal.hh.id); if (res.error) { setDelErr(res.error); return; } setModal(null); setDelErr(null); };
  const handleAddMember = async (data: MemberInsert) => { const res = await addMember(data); if (!res.error) setModal(null); return res; };
  const handleEditMember = async (data: MemberInsert) => { if (modal?.type !== 'editMember') return { error: null }; const res = await updateMember(modal.member.id, data); if (!res.error) setModal(null); return res; };
  const handleDeleteMember = async () => { if (modal?.type !== 'deleteMember') return; const res = await deleteMember(modal.member.id); if (res.error) { setDelErr(res.error); return; } setModal(null); setDelErr(null); };
  const handleAddUnifiedEntry = async (hData: HouseholdInsert, mDatas: Omit<MemberInsert, 'household_id'>[]) => { const res = await addUnifiedEntry(hData, mDatas); if (!res.error) setModal(null); return res; };
  const handleAddBlock = async () => { if (!newBlockName.trim()) return; await addBlock(newBlockName.trim()); setNewBlockName(''); setShowBlockInput(false); };

  const blockList = useMemo(() => blocks.map(b => typeof b === 'string' ? b : (b as any).name), [blocks]);

  // テーブル用スタイル定義
  const thStyle = { padding: '12px', borderRight: '1px solid #d1d5db', borderBottom: '2px solid #9ca3af', backgroundColor: '#f3f4f6', fontWeight: 'bold', whiteSpace: 'nowrap' as const, textAlign: 'left' as const };
  const tdStyle = { padding: '12px', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db', verticalAlign: 'top' as const };
  const getBadgeStyle = (type: string) => {
    const isSetai = type === '世帯';
    const isKojin = type === '個人';
    return {
      display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
      backgroundColor: isSetai ? '#e0f2fe' : isKojin ? '#d1fae5' : '#f1f5f9',
      color: isSetai ? '#0369a1' : isKojin ? '#047857' : '#475569',
      border: `1px solid ${isSetai ? '#bae6fd' : isKojin ? '#a7f3d0' : '#e2e8f0'}`
    };
  };

  const renderTableView = () => {
    return (
      <div style={{ overflowX: 'auto', backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', minWidth: '1050px', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr>
              <th style={thStyle}>ブロック / 区分</th>
              <th style={thStyle}>氏名 / ふりがな</th>
              <th style={thStyle}>部別 / 役職・教学</th>
              <th style={thStyle}>住所 / 連絡先</th>
              <th style={thStyle}>日付情報 / 年齢</th>
              <th style={thStyle}>状況</th>
              <th style={{ ...thStyle, textAlign: 'center' }} className="print:hidden">操作</th>
            </tr>
          </thead>
          <tbody>
            {displayedHouseholds.flatMap((hh) => {
              const members = hh.members || [];
              const hhBlockName = typeof hh.block === 'string' ? hh.block : hh.block?.name || hh.blocks?.name || '';
              const fullAddress = [hh.address, hh.building].filter(Boolean).join(' ');

              if (members.length === 0) {
                return (
                  <tr key={`empty-${hh.id}`} style={{ backgroundColor: '#fff' }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{hhBlockName}</div>
                      <span style={getBadgeStyle('不明')}>不明</span>
                    </td>
                    <td style={{ ...tdStyle, color: '#9ca3af' }} colSpan={5}>（メンバーが登録されていません）</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }} className="print:hidden">
                      <button className="btn btn--outline btn--sm" onClick={() => setModal({ type: 'addMember', hh })}>＋追加</button>
                    </td>
                  </tr>
                );
              }

              return members.map((m, idx) => {
                const rowBg = idx % 2 === 0 ? '#ffffff' : '#f9fafb';

                const mCardType = m.card_type || '連名';
                const mNameKana = m.name_kana || '-';
                const mPosition = m.position || '-';
                const mStudy = m.gakkai_study || '-';
                const mPhone = m.phone || '-';

                // 年齢の計算
                const mAge = calculateAge(m.birth_date);

                // ★ 和暦への変換を適用
                const mBirthDate = formatWareki(m.birth_date);
                const mFaithDate = formatWareki(m.faith_date);

                const mNewspaper = m.has_newspaper ? '〇' : '✕';
                const mVisit = m.visited ? '〇' : '✕';
                const mMeeting = m.attended ? '〇' : '✕';

                return (
                  <tr key={m.id} style={{ backgroundColor: rowBg }}>
                    {/* ブロック / 区分 */}
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>{hhBlockName}</div>
                      <span style={getBadgeStyle(mCardType)}>{mCardType}</span>
                    </td>
                    {/* 氏名 / ふりがな */}
                    <td style={tdStyle}>
                      <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1d4ed8', marginBottom: '4px' }}>{m.name}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{mNameKana}</div>
                    </td>
                    {/* 部別 / 役職・教学 */}
                    <td style={tdStyle}>
                      <div style={{ marginBottom: '6px' }}><span style={{ display: 'inline-block', padding: '2px 6px', backgroundColor: '#e5e7eb', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>{m.division || '-'}</span></div>
                      <div style={{ fontSize: '13px', marginBottom: '2px' }}>{mPosition}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{mStudy}</div>
                    </td>
                    {/* 住所(建物含む) / 連絡先 */}
                    <td style={tdStyle}>
                      <div style={{ fontSize: '13px', marginBottom: '6px' }}>{fullAddress || '-'}</div>
                      <div style={{ fontSize: '13px', color: '#4b5563' }}>📞 {mPhone}</div>
                    </td>
                    {/* 日付 / 年齢 */}
                    <td style={tdStyle}>
                      <div style={{ fontSize: '13px', marginBottom: '4px', whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#9ca3af', fontWeight: 'bold', marginRight: '4px' }}>生:</span>
                        {mBirthDate} <b style={{ color: '#1d4ed8' }}>{mAge !== null ? `(${mAge}歳)` : ''}</b>
                      </div>
                      <div style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#9ca3af', fontWeight: 'bold', marginRight: '4px' }}>入:</span>
                        {mFaithDate}
                      </div>
                    </td>
                    {/* 状況 */}
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                        <span style={{ fontWeight: mNewspaper === '〇' ? 'bold' : 'normal', color: mNewspaper === '〇' ? '#1d4ed8' : '#6b7280' }}>聖教: {mNewspaper}</span>
                        <span style={{ fontWeight: mVisit === '〇' ? 'bold' : 'normal', color: mVisit === '〇' ? '#047857' : '#6b7280' }}>訪問: {mVisit}</span>
                        <span style={{ fontWeight: mMeeting === '〇' ? 'bold' : 'normal', color: mMeeting === '〇' ? '#b45309' : '#6b7280' }}>会合: {mMeeting}</span>
                      </div>
                    </td>
                    {/* 操作 */}
                    <td style={{ ...tdStyle, textAlign: 'center' }} className="print:hidden">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <button className="btn btn--outline btn--sm" onClick={() => setModal({ type: 'editMember', member: m, hh })}>編集</button>
                        <button className="btn btn--ghost btn--sm" onClick={() => setModal({ type: 'editHousehold', hh })} style={{ fontSize: '11px', padding: '2px 8px' }}>世帯</button>
                      </div>
                    </td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="app">
      <header className="app-header print:hidden">
        <div className="app-header__inner">
          <div className="app-header__title">
            <Link href="/" className="btn btn--ghost btn--sm">← ホーム</Link>
            <span className="app-header__icon">📒</span>
            <h1>地区名簿</h1>
          </div>
          <div className="app-header__actions">

            <div style={{ display: 'inline-flex', marginRight: '8px', border: '1px solid #d1d5db', borderRadius: '6px', overflow: 'hidden' }}>
              <button
                style={{ padding: '6px 16px', background: viewMode === 'table' ? '#4f46e5' : '#fff', color: viewMode === 'table' ? '#fff' : '#374151', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => setViewMode('table')}>🗂 表</button>
              <button
                style={{ padding: '6px 16px', background: viewMode === 'card' ? '#4f46e5' : '#fff', color: viewMode === 'card' ? '#fff' : '#374151', border: 'none', borderLeft: '1px solid #d1d5db', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => setViewMode('card')}>💳 カード</button>
            </div>

            {showBlockInput ? (
              <div className="block-input-row" style={{ display: 'flex', gap: '4px' }}>
                <input className="block-input" value={newBlockName} onChange={e => setNewBlockName(e.target.value)} placeholder="ブロック名を入力" onKeyDown={e => e.key === 'Enter' && handleAddBlock()} />
                <button className="btn btn--primary btn--sm" onClick={handleAddBlock}>追加</button>
                <button className="btn btn--ghost btn--sm" onClick={() => setShowBlockInput(false)}>✕</button>
              </div>
            ) : (
              <button className="btn btn--outline" onClick={() => setShowBlockInput(true)}>＋ ブロック追加</button>
            )}
            <button className="btn btn--outline" onClick={() => { setViewMode('table'); setTimeout(() => window.print(), 100); }}>🖨 印刷</button>
            <button className="btn btn--primary" onClick={() => setModal({ type: 'addHousehold' })}>＋ 新規登録</button>
          </div>
        </div>
      </header>

      <div className="print-title hidden print:block" style={{ marginBottom: '16px' }}>
        <h1>地区名簿一覧</h1>
        <p>印刷日：{new Date().toLocaleDateString('ja-JP')} / 抽出メンバー数: {totalMembers}名</p>
      </div>

      <main className="app-main">
        <div style={{ padding: '16px', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }} className="print:hidden">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['すべて', ...blockList].map(bName => (
              <button
                key={bName}
                onClick={() => setSelectedBlock(bName)}
                className={`btn btn--sm ${selectedBlock === bName ? 'btn--primary' : 'btn--outline'}`}
              >
                {bName}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>部別:</span>
            <select
              value={selectedDivision}
              onChange={e => setSelectedDivision(e.target.value)}
              style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px', outline: 'none' }}
            >
              {ALL_DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {error && <div className="alert alert--error">{error}</div>}

        {loading ? (
          <div className="loading">
            <div className="loading__spinner" />
            <span>読み込み中...</span>
          </div>
        ) : displayedHouseholds.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">📋</div>
            <p>該当する条件のメンバーが見つかりませんでした</p>
          </div>
        ) : (
          viewMode === 'table' ? renderTableView() : (
            <div className="household-list print:hidden">
              {displayedHouseholds.map(hh => (
                <HouseholdCard
                  key={hh.id} household={hh}
                  onEditHousehold={h => setModal({ type: 'editHousehold', hh: h })}
                  onDeleteHousehold={h => { setModal({ type: 'deleteHousehold', hh: h }); setDelErr(null); }}
                  onAddMember={h => setModal({ type: 'addMember', hh: h })}
                  onEditMember={(m, h) => setModal({ type: 'editMember', member: m, hh: h })}
                  onDeleteMember={m => { setModal({ type: 'deleteMember', member: m }); setDelErr(null); }}
                />
              ))}
            </div>
          )
        )}
      </main>

      {modal?.type === 'addHousehold' && <UnifiedEntryForm blocks={blocks} onSubmit={handleAddUnifiedEntry} onCancel={() => setModal(null)} />}
      {modal?.type === 'editHousehold' && <HouseholdForm initial={modal.hh} blocks={blocks} onSubmit={handleEditHousehold} onCancel={() => setModal(null)} />}
      {modal?.type === 'addMember' && <MemberForm household={modal.hh} onSubmit={handleAddMember} onCancel={() => setModal(null)} />}
      {modal?.type === 'editMember' && <MemberForm initial={modal.member} household={modal.hh} onSubmit={handleEditMember} onCancel={() => setModal(null)} />}

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
                <p><b>{modal.member.name}</b> を名簿から削除しますか？</p>
              )}
              <p className="modal__body-sub">この操作は取り消せません。</p>
              {delErr && <div className="form-error">{delErr}</div>}
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => { setModal(null); setDelErr(null); }}>キャンセル</button>
              <button className="btn btn--danger" onClick={modal.type === 'deleteHousehold' ? handleDeleteHousehold : handleDeleteMember}>削除する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RosterPage() {
  return (
    <Suspense fallback={<div className="loading" style={{ paddingTop: 80 }}><div className="loading__spinner" /><span>読み込み中...</span></div>}>
      <RosterContent />
    </Suspense>
  );
}