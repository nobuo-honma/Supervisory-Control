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

// ★ ViewModeに 'stats'（統監シート）を追加
type ViewMode = 'table' | 'card' | 'stats';

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

// 和暦（令和・平成・昭和）に変換する関数
function formatWareki(dateStr?: string | null) {
  if (!dateStr || dateStr === '-') return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();

  let era = '';
  let warekiYear = y;

  if (y > 2019 || (y === 2019 && m >= 5)) {
    era = '令和'; warekiYear = y - 2018;
  } else if (y > 1989 || (y === 1989 && m >= 1 && day >= 8)) {
    era = '平成'; warekiYear = y - 1988;
  } else if (y > 1926 || (y === 1926 && m >= 12 && day >= 25)) {
    era = '昭和'; warekiYear = y - 1925;
  } else if (y > 1912 || (y === 1912 && m >= 7 && day >= 30)) {
    era = '大正'; warekiYear = y - 1911;
  } else {
    return `${y}年${m}月${day}日`;
  }

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

  const blockList = useMemo(() => blocks.map(b => typeof b === 'string' ? b : (b as any).name), [blocks]);

  // リスト・カード表示用のフィルタリング
  const displayedHouseholds = useMemo(() => {
    return households.map(hh => {
      const hhBlockName = typeof hh.block === 'string' ? hh.block : (hh.block as any)?.name || (hh as any).blocks?.name || '';
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

  // ★ 統監シート用の集計処理（全体データから計算）
  const statsDivisions = useMemo(() => ALL_DIVISIONS.filter(d => d !== 'すべて'), []);
  const statsData = useMemo(() => {
    const initialStats = () => ({
      setaiCard: 0, kojinCard: 0, seikyo: 0,
      divisions: Object.fromEntries(statsDivisions.map(d => [d, 0])),
      total: 0
    });

    const bStats: Record<string, ReturnType<typeof initialStats>> = {};
    blockList.forEach(b => bStats[b] = initialStats());
    const totalStats = initialStats();

    households.forEach(hh => {
      const hhBlockName = typeof hh.block === 'string' ? hh.block : (hh.block as any)?.name || (hh as any).blocks?.name || '';
      if (!hhBlockName || !bStats[hhBlockName]) return;

      const members = hh.members || [];
      const hhCardType = (hh as any).card_type || (hh as any).cardType || '世帯';

      if (hhCardType === '世帯') { bStats[hhBlockName].setaiCard++; totalStats.setaiCard++; }
      else if (hhCardType === '個人') { bStats[hhBlockName].kojinCard++; totalStats.kojinCard++; }

      const hasSeikyo = members.some(m => (m as any).has_newspaper === true || (m as any).newspaper === '〇');
      if (hasSeikyo && (hhCardType === '世帯' || hhCardType === '個人')) {
        bStats[hhBlockName].seikyo++; totalStats.seikyo++;
      }

      members.forEach(m => {
        const div = m.division;
        if (div && bStats[hhBlockName].divisions[div] !== undefined) {
          bStats[hhBlockName].divisions[div]++; totalStats.divisions[div]++;
          bStats[hhBlockName].total++; totalStats.total++;
        }
      });
    });

    return { blockStats: bStats, totalStats };
  }, [households, blockList, statsDivisions]);

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

  const getBadgeStyle = (type: string) => {
    const isSetai = type === '世帯'; const isKojin = type === '個人';
    return {
      display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
      backgroundColor: isSetai ? '#e0f2fe' : isKojin ? '#d1fae5' : '#f1f5f9',
      color: isSetai ? '#0369a1' : isKojin ? '#047857' : '#475569',
      border: `1px solid ${isSetai ? '#bae6fd' : isKojin ? '#a7f3d0' : '#e2e8f0'}`
    };
  };

  const renderTableView = () => {
    return (
      <div className="table-wrapper">
        <table style={{ width: '100%', minWidth: '1050px', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr>
              <th className="th-cell">ブロック / 区分</th>
              <th className="th-cell">氏名 / ふりがな</th>
              <th className="th-cell">部別 / 役職・教学</th>
              <th className="th-cell">住所 / 連絡先</th>
              <th className="th-cell">日付情報 / 年齢</th>
              <th className="th-cell">状況</th>
              <th className="th-cell print:hidden" style={{ textAlign: 'center' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {displayedHouseholds.flatMap((hh) => {
              const members = hh.members || [];
              const hhBlockName = typeof hh.block === 'string' ? hh.block : (hh.block as any)?.name || (hh as any).blocks?.name || '';
              const fullAddress = [(hh as any).address, (hh as any).building].filter(Boolean).join(' ');

              if (members.length === 0) {
                return (
                  <tr key={`empty-${hh.id}`} style={{ backgroundColor: '#fff' }}>
                    <td className="td-cell nowrap-on-mobile">
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{hhBlockName}</div>
                      <span style={getBadgeStyle('不明')}>不明</span>
                    </td>
                    <td className="td-cell" style={{ color: '#9ca3af' }} colSpan={5}>（メンバーが登録されていません）</td>
                    <td className="td-cell print:hidden" style={{ textAlign: 'center' }}>
                      <button className="btn btn--outline btn--sm" onClick={() => setModal({ type: 'addMember', hh })}>＋追加</button>
                    </td>
                  </tr>
                );
              }

              return members.map((m, idx) => {
                const rowBg = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
                const mCardType = (m as any).card_type || '連名';
                const mNameKana = (m as any).name_kana || '-';
                const mPosition = (m as any).position || '-';
                const mStudy = (m as any).gakkai_study || '-';
                const mPhone = (m as any).phone || '-';
                const mAge = calculateAge((m as any).birth_date);
                const mBirthDate = formatWareki((m as any).birth_date);
                const mFaithDate = formatWareki((m as any).faith_date);
                const mNewspaper = (m as any).has_newspaper ? '〇' : '✕';
                const mVisit = (m as any).visited ? '〇' : '✕';
                const mMeeting = (m as any).attended ? '〇' : '✕';

                return (
                  <tr key={m.id} style={{ backgroundColor: rowBg }}>
                    <td className="td-cell nowrap-on-mobile">
                      <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>{hhBlockName}</div>
                      <span style={getBadgeStyle(mCardType)}>{mCardType}</span>
                    </td>
                    <td className="td-cell nowrap-on-mobile">
                      <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1d4ed8', marginBottom: '4px' }}>{m.name}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{mNameKana}</div>
                    </td>
                    <td className="td-cell nowrap-on-mobile">
                      <div style={{ marginBottom: '6px' }}><span style={{ display: 'inline-block', padding: '2px 6px', backgroundColor: '#e5e7eb', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>{m.division || '-'}</span></div>
                      <div style={{ fontSize: '13px', marginBottom: '2px' }}>{mPosition}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{mStudy}</div>
                    </td>
                    <td className="td-cell">
                      <div style={{ fontSize: '13px', marginBottom: '6px', minWidth: '120px' }}>{fullAddress || '-'}</div>
                      <div style={{ fontSize: '13px', color: '#4b5563' }}>📞 {mPhone}</div>
                    </td>
                    <td className="td-cell nowrap-on-mobile">
                      <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                        <span style={{ color: '#9ca3af', fontWeight: 'bold', marginRight: '4px' }}>生:</span>
                        {mBirthDate} <b style={{ color: '#1d4ed8' }}>{mAge !== null ? `(${mAge}歳)` : ''}</b>
                      </div>
                      <div style={{ fontSize: '13px' }}>
                        <span style={{ color: '#9ca3af', fontWeight: 'bold', marginRight: '4px' }}>入:</span>
                        {mFaithDate}
                      </div>
                    </td>
                    <td className="td-cell nowrap-on-mobile">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                        <span style={{ fontWeight: mNewspaper === '〇' ? 'bold' : 'normal', color: mNewspaper === '〇' ? '#1d4ed8' : '#6b7280' }}>聖教: {mNewspaper}</span>
                        <span style={{ fontWeight: mVisit === '〇' ? 'bold' : 'normal', color: mVisit === '〇' ? '#047857' : '#6b7280' }}>訪問: {mVisit}</span>
                        <span style={{ fontWeight: mMeeting === '〇' ? 'bold' : 'normal', color: mMeeting === '〇' ? '#b45309' : '#6b7280' }}>会合: {mMeeting}</span>
                      </div>
                    </td>
                    <td className="td-cell print:hidden" style={{ textAlign: 'center' }}>
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

  // ★ 統監シートの描画
  const renderStatsView = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ padding: '16px', background: '#fff', borderRadius: '8px', border: '1px solid #d1d5db' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px' }}>📊 統監シート（地区集計表）</h2>

          <div className="table-wrapper" style={{ marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '600px' }}>
              <thead>
                <tr>
                  <th className="th-cell" style={{ textAlign: 'center' }}>B数</th>
                  <th className="th-cell">ブロック名</th>
                  <th className="th-cell" style={{ textAlign: 'center' }}>会員カード<br />(世帯)</th>
                  <th className="th-cell" style={{ textAlign: 'center' }}>個人会員<br />カード</th>
                  <th className="th-cell" style={{ textAlign: 'center' }}>聖教購読世帯<br />（内部）</th>
                </tr>
              </thead>
              <tbody>
                {blockList.map((bName, i) => (
                  <tr key={bName} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                    {i === 0 && <td className="td-cell" style={{ backgroundColor: '#f3f4f6', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle' }} rowSpan={blockList.length}>{blockList.length}</td>}
                    <td className="td-cell">{bName.replace('ブロック', 'B')}</td>
                    <td className="td-cell" style={{ textAlign: 'right' }}>{statsData.blockStats[bName].setaiCard}</td>
                    <td className="td-cell" style={{ textAlign: 'right' }}>{statsData.blockStats[bName].kojinCard}</td>
                    <td className="td-cell" style={{ textAlign: 'right' }}>{statsData.blockStats[bName].seikyo}</td>
                  </tr>
                ))}
                <tr style={{ backgroundColor: '#e5e7eb', fontWeight: 'bold' }}>
                  <td className="td-cell" colSpan={2} style={{ textAlign: 'center' }}>地区合計</td>
                  <td className="td-cell" style={{ textAlign: 'right' }}>{statsData.totalStats.setaiCard}</td>
                  <td className="td-cell" style={{ textAlign: 'right' }}>{statsData.totalStats.kojinCard}</td>
                  <td className="td-cell" style={{ textAlign: 'right' }}>{statsData.totalStats.seikyo}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '1000px' }}>
              <thead>
                <tr>
                  <th className="th-cell">ブロック名</th>
                  <th className="th-cell" style={{ textAlign: 'center' }}>世帯<br />統監</th>
                  {statsDivisions.map(d => <th key={d} className="th-cell" style={{ textAlign: 'center', fontSize: '12px', padding: '8px' }}>{d}</th>)}
                  <th className="th-cell" style={{ backgroundColor: '#e0e7ff', color: '#3730a3', textAlign: 'center' }}>部員<br />合計</th>
                </tr>
              </thead>
              <tbody>
                {blockList.map((bName, i) => (
                  <tr key={bName} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                    <td className="td-cell" style={{ fontWeight: 'bold' }}>{bName.replace('ブロック', 'B')}</td>
                    <td className="td-cell" style={{ textAlign: 'right', backgroundColor: '#f3f4f6' }}>{statsData.blockStats[bName].setaiCard}</td>
                    {statsDivisions.map(d => (
                      <td key={d} className="td-cell" style={{ textAlign: 'right' }}>{statsData.blockStats[bName].divisions[d]}</td>
                    ))}
                    <td className="td-cell" style={{ textAlign: 'right', fontWeight: 'bold', backgroundColor: '#e0e7ff', color: '#3730a3' }}>{statsData.blockStats[bName].total}</td>
                  </tr>
                ))}
                <tr style={{ backgroundColor: '#e5e7eb', fontWeight: 'bold' }}>
                  <td className="td-cell">地区合計</td>
                  <td className="td-cell" style={{ textAlign: 'right' }}>{statsData.totalStats.setaiCard}</td>
                  {statsDivisions.map(d => (
                    <td key={d} className="td-cell" style={{ textAlign: 'right' }}>{statsData.totalStats.divisions[d]}</td>
                  ))}
                  <td className="td-cell" style={{ textAlign: 'right', color: '#3730a3' }}>{statsData.totalStats.total}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app">
      {/* ★ スマホ対応用のCSS */}
      <style>{`
        /* 共通スタイル */
        .th-cell { padding: 12px; border-right: 1px solid #d1d5db; border-bottom: 2px solid #9ca3af; background-color: #f3f4f6; font-weight: bold; white-space: nowrap; text-align: left; }
        .td-cell { padding: 12px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #d1d5db; vertical-align: top; }
        .table-wrapper { overflow-x: auto; background-color: #fff; border: 1px solid #d1d5db; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); -webkit-overflow-scrolling: touch; }
        
        /* ヘッダーの基本レイアウト修正 */
        .app-header {
          background: #fff;
          border-bottom: 1px solid #e5e7eb;
          padding: 12px 16px;
        }
        .app-header__inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap; /* 要素が溢れたら折り返す */
        }

        /* モバイル対応 */
        @media (max-width: 768px) {
          .app-header {
            padding: 8px 12px;
          }
          .app-header__inner {
            flex-direction: column; /* 縦並びにする */
            align-items: stretch;
            gap: 12px;
          }
          .app-header__title {
            justify-content: flex-start;
          }
          .responsive-actions {
            display: flex;
            flex-direction: column;
            width: 100%;
            gap: 12px;
          }
          
          /* 表示切替ボタン（タブ）を横いっぱいに */
          .btn-group {
            display: flex;
            width: 100%;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            overflow: hidden;
          }
          .btn-group button {
            flex: 1;
            padding: 12px 8px !important;
            font-size: 14px !important;
          }

          /* アクションボタンのグリッド配置 */
          .action-btns {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .action-btns button {
            font-size: 13px;
            padding: 10px 4px;
          }
          /* 「新規登録」は目立たせるため2列使う */
          .action-btns button:last-child {
            grid-column: span 2;
          }

          /* ブロック追加入力欄 */
          .block-input-row {
            display: flex;
            width: 100%;
            gap: 4px;
            z-index: 10;
          }
          .block-input-row input {
            flex: 1;
            min-width: 0; /* widthオーバーフロー防止 */
          }

          /* フィルターエリア（ブロック選択など） */
          .responsive-filters {
            flex-direction: column;
            align-items: stretch !important;
            padding: 12px !important;
            gap: 12px !important;
          }
          .scrollable-tabs {
            width: 100%;
            overflow-x: auto;
            display: flex;
            gap: 6px;
            padding-bottom: 4px;
            -webkit-overflow-scrolling: touch;
          }
          .scrollable-tabs button {
            white-space: nowrap;
            padding: 8px 14px !important;
            flex-shrink: 0;
          }

          /* 部別セレクトボックス */
          .division-filter-wrapper {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
          }
          .filter-select {
            flex: 1;
            margin-left: 8px;
          }

          /* テーブルの文字サイズ調整 */
          .th-cell, .td-cell {
            padding: 8px !important;
            font-size: 12px !important;
          }
        }
      `}</style>

      <header className="app-header print:hidden">
        <div className="app-header__inner">
          <div className="app-header__title">
            <Link href="/" className="btn btn--ghost btn--sm">← ホーム</Link>
            <span className="app-header__icon">📒</span>
            <h1>地区名簿</h1>
          </div>
          <div className="app-header__actions responsive-actions">

            {/* 切り替えトグル */}
            <div className="btn-group">
              <button
                style={{ padding: '6px 12px', background: viewMode === 'table' ? '#4f46e5' : '#fff', color: viewMode === 'table' ? '#fff' : '#374151', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                onClick={() => setViewMode('table')}>🗂 表</button>
              <button
                style={{ padding: '6px 12px', background: viewMode === 'card' ? '#4f46e5' : '#fff', color: viewMode === 'card' ? '#fff' : '#374151', border: 'none', borderLeft: '1px solid #d1d5db', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                onClick={() => setViewMode('card')}>💳 カード</button>
              <button
                style={{ padding: '6px 12px', background: viewMode === 'stats' ? '#4f46e5' : '#fff', color: viewMode === 'stats' ? '#fff' : '#374151', border: 'none', borderLeft: '1px solid #d1d5db', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                onClick={() => setViewMode('stats')}>📊 統監</button>
            </div>

            {showBlockInput ? (
              <div className="block-input-row">
                <input className="block-input border border-slate-400 rounded outline-none focus:border-blue-500" value={newBlockName} onChange={e => setNewBlockName(e.target.value)} placeholder="ブロック名を入力" onKeyDown={e => e.key === 'Enter' && handleAddBlock()} />
                <button className="btn btn--primary" onClick={handleAddBlock}>追加</button>
                <button className="btn btn--ghost" onClick={() => setShowBlockInput(false)}>✕</button>
              </div>
            ) : (
              <div className="action-btns">
                <button className="btn btn--outline" onClick={() => setShowBlockInput(true)}>＋ ブロック追加</button>
                <button className="btn btn--outline" onClick={() => { setViewMode('table'); setTimeout(() => window.print(), 100); }}>🖨 印刷</button>
                <button className="btn btn--primary" onClick={() => setModal({ type: 'addHousehold' })} style={{ gridColumn: 'span 2' }}>＋ 新規登録</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="print-title hidden print:block" style={{ marginBottom: '16px' }}>
        <h1>地区名簿一覧</h1>
        <p>印刷日：{new Date().toLocaleDateString('ja-JP')} / 抽出メンバー数: {totalMembers}名</p>
      </div>

      <main className="app-main">
        {/* 統監シート以外の場合はフィルターを表示 */}
        {viewMode !== 'stats' && (
          <div className="responsive-filters print:hidden" style={{ padding: '16px', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div className="scrollable-tabs">
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
            <div className="division-filter-wrapper">
              <span style={{ fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap' }}>部別:</span>
              <select
                value={selectedDivision}
                onChange={e => setSelectedDivision(e.target.value)}
                className="filter-select"
                style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px', outline: 'none', backgroundColor: '#fff' }}
              >
                {ALL_DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        )}

        {error && <div className="alert alert--error">{error}</div>}

        {loading ? (
          <div className="loading">
            <div className="loading__spinner" />
            <span>読み込み中...</span>
          </div>
        ) : households.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">📋</div>
            <p>データが登録されていません</p>
          </div>
        ) : (
          <>
            {viewMode === 'table' && renderTableView()}
            {viewMode === 'stats' && renderStatsView()}
            {viewMode === 'card' && (
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
            )}
          </>
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
                <p><b>{(modal.hh as any).address ?? '（住所未登録）'}</b> の世帯カードと全メンバーを削除しますか？</p>
              ) : (
                <p><b>{(modal as { member: Member }).member.name}</b> を名簿から削除しますか？</p>
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