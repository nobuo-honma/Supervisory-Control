// src/hooks/useBlocks.ts
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Block } from '@/types/roster';

export function useBlocks() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('blocks')
      .select('*')
      .order('sort_order')
      .then(({ data }) => {
        setBlocks((data as Block[]) ?? []);
        setLoading(false);
      });
  }, []);

  const addBlock = async (name: string) => {
    const { error } = await supabase
      .from('blocks')
      .insert([{ name, sort_order: blocks.length + 1 }]);
    if (!error) {
      const { data } = await supabase.from('blocks').select('*').order('sort_order');
      setBlocks((data as Block[]) ?? []);
    }
    return { error: error?.message ?? null };
  };

  return { blocks, loading, addBlock };
}
