// src/hooks/useRoster.ts
'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  Member, Household,
  MemberInsert, MemberUpdate,
  HouseholdInsert, HouseholdUpdate,
  SearchFilters,
} from '@/types/roster';

// ─────────────────────────────────────────────
//  Household + members をまとめて取得
// ─────────────────────────────────────────────
export function useRoster(filters: SearchFilters) {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    // まず members に対してフィルターを構築
    let mq = supabase
      .from('members')
      .select(`
        *,
        household:households(
          id, block_id, address, building, notes,
          block:blocks(id, name, sort_order)
        )
      `)
      .order('name_kana', { ascending: true });

    if (filters.query) {
      const q = filters.query.trim();
      mq = mq.or(
        `name.ilike.%${q}%,name_kana.ilike.%${q}%,phone.ilike.%${q}%`
      );
    }
    if (filters.division)     mq = mq.eq('division', filters.division);
    if (filters.is_present === 'present') mq = mq.eq('is_present', true);
    if (filters.is_present === 'absent')  mq = mq.eq('is_present', false);
    if (filters.has_newspaper === 'yes')  mq = mq.eq('has_newspaper', true);
    if (filters.has_newspaper === 'no')   mq = mq.eq('has_newspaper', false);
    if (filters.visited === 'yes')        mq = mq.eq('visited', true);
    if (filters.visited === 'no')         mq = mq.eq('visited', false);
    if (filters.attended === 'yes')       mq = mq.eq('attended', true);
    if (filters.attended === 'no')        mq = mq.eq('attended', false);

    const { data: members, error: mErr } = await mq;
    if (mErr) { setError(mErr.message); setLoading(false); return; }

    // block_id フィルターは household 側なので後処理
    let rows = (members ?? []) as (Member & { household: Household })[];
    if (filters.block_id) {
      rows = rows.filter(m => m.household?.block_id === filters.block_id);
    }

    // households 単位でグループ化
    const map = new Map<string, Household>();
    for (const m of rows) {
      const hh = m.household!;
      if (!map.has(hh.id)) {
        map.set(hh.id, { ...hh, members: [] });
      }
      const entry = map.get(hh.id)!;
      entry.members = [...(entry.members ?? []), m];
    }

    // 支部ソート → 住所ソート
    const sorted = Array.from(map.values()).sort((a, b) => {
      const ba = (a.block?.sort_order ?? 99) - (b.block?.sort_order ?? 99);
      if (ba !== 0) return ba;
      return (a.address ?? '').localeCompare(b.address ?? '', 'ja');
    });

    setHouseholds(sorted);
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetch(); }, [fetch]);

  // ── CRUD: Household ────────────────────────
  const addHousehold = async (data: HouseholdInsert) => {
    const { error } = await supabase.from('households').insert([data]);
    if (!error) await fetch();
    return { error: error?.message ?? null };
  };

  const updateHousehold = async (id: string, data: HouseholdUpdate) => {
    const { error } = await supabase.from('households').update(data).eq('id', id);
    if (!error) await fetch();
    return { error: error?.message ?? null };
  };

  const deleteHousehold = async (id: string) => {
    const { error } = await supabase.from('households').delete().eq('id', id);
    if (!error) await fetch();
    return { error: error?.message ?? null };
  };

  // ── CRUD: Member ───────────────────────────
  const addMember = async (data: MemberInsert) => {
    const { error } = await supabase.from('members').insert([data]);
    if (!error) await fetch();
    return { error: error?.message ?? null };
  };

  const updateMember = async (id: string, data: MemberUpdate) => {
    const { error } = await supabase.from('members').update(data).eq('id', id);
    if (!error) await fetch();
    return { error: error?.message ?? null };
  };

  const deleteMember = async (id: string) => {
    const { error } = await supabase.from('members').delete().eq('id', id);
    if (!error) await fetch();
    return { error: error?.message ?? null };
  };

  // ── Unified: Household + Member ──────────────────
  const addUnifiedEntry = async (hData: HouseholdInsert, mDatas: Omit<MemberInsert, 'household_id'>[]) => {
    // 1. 世帯を追加
    const { data: hRes, error: hErr } = await supabase
      .from('households')
      .insert([hData])
      .select()
      .single();

    if (hErr) return { error: hErr.message };

    // 2. メンバーを一括追加
    const membersWithHhId = mDatas.map(m => ({ ...m, household_id: hRes.id }));
    const { error: mErr } = await supabase
      .from('members')
      .insert(membersWithHhId);

    if (mErr) return { error: mErr.message };

    await fetch();
    return { error: null };
  };

  return {
    households, loading, error, refetch: fetch,
    addHousehold, updateHousehold, deleteHousehold,
    addMember, updateMember, deleteMember,
    addUnifiedEntry,
  };
}
