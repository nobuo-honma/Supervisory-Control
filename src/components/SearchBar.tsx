// src/components/SearchBar.tsx
'use client';
import type { SearchFilters, Division } from '@/types/roster';
import { DIVISIONS } from '@/types/roster';
import type { Block } from '@/types/roster';

interface Props {
  filters: SearchFilters;
  onChange: (f: SearchFilters) => void;
  blocks: Block[];
  totalMembers: number;
  totalHouseholds: number;
}

export default function SearchBar({ filters, onChange, blocks, totalMembers, totalHouseholds }: Props) {
  const set = (patch: Partial<SearchFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="search-bar print:hidden">
      {/* テキスト検索 */}
      <div className="search-bar__row">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            type="text"
            placeholder="氏名・よみがな・電話番号で検索..."
            value={filters.query}
            onChange={e => set({ query: e.target.value })}
          />
          {filters.query && (
            <button className="search-clear" onClick={() => set({ query: '' })}>✕</button>
          )}
        </div>

        <select className="search-select" value={filters.block_id} onChange={e => set({ block_id: e.target.value })}>
          <option value="">全支部</option>
          {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        <select className="search-select" value={filters.division} onChange={e => set({ division: e.target.value as Division | '' })}>
          <option value="">全部別</option>
          {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* フラグフィルター */}
      <div className="search-bar__row search-bar__row--flags">
        <FilterChip
          label="所在"
          value={filters.is_present}
          options={[['all','全て'],['present','在'],['absent','不在']]}
          onChange={v => set({ is_present: v as SearchFilters['is_present'] })}
        />
        <FilterChip
          label="新聞"
          value={filters.has_newspaper}
          options={[['all','全て'],['yes','○'],['no','✕']]}
          onChange={v => set({ has_newspaper: v as SearchFilters['has_newspaper'] })}
        />
        <FilterChip
          label="訪問"
          value={filters.visited}
          options={[['all','全て'],['yes','○'],['no','✕']]}
          onChange={v => set({ visited: v as SearchFilters['visited'] })}
        />
        <FilterChip
          label="会合"
          value={filters.attended}
          options={[['all','全て'],['yes','○'],['no','✕']]}
          onChange={v => set({ attended: v as SearchFilters['attended'] })}
        />

        <div className="search-counts">
          <span className="count-item"><b>{totalHouseholds}</b> 世帯</span>
          <span className="count-sep">/</span>
          <span className="count-item"><b>{totalMembers}</b> 名</span>
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <div className="filter-chip">
      <span className="filter-chip__label">{label}</span>
      {options.map(([val, text]) => (
        <button
          key={val}
          className={`filter-chip__btn${value === val ? ' filter-chip__btn--active' : ''}`}
          onClick={() => onChange(val)}
        >{text}</button>
      ))}
    </div>
  );
}
