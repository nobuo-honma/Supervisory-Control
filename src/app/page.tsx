// src/app/page.tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function HomePage() {
  const [deleting, setDeleting] = useState(false);
  const [delResult, setDelResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleDeleteSample = async () => {
    if (!confirm('サンプルデータをすべて削除しますか？\nこの操作は取り消せません。')) return;
    setDeleting(true);
    setDelResult(null);
    try {
      // members → households（外部キー参照のため順番に削除）
      const { error: mErr } = await supabase.from('members').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (mErr) throw mErr;
      const { error: hErr } = await supabase.from('households').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (hErr) throw hErr;
      const { error: bErr } = await supabase.from('blocks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (bErr) throw bErr;
      setDelResult({ ok: true, msg: 'すべてのデータを削除しました。' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setDelResult({ ok: false, msg: `削除エラー: ${msg}` });
    } finally {
      setDeleting(false);
    }
  };

  const menus = [
    {
      id: 'register',
      href: '/roster?action=add',
      icon: '✏️',
      label: '新規登録',
      desc: '世帯・メンバーを新規に登録する',
      color: 'primary',
    },
    {
      id: 'roster',
      href: '/roster',
      icon: '📒',
      label: '名簿表示',
      desc: '世帯カードと名簿一覧を表示・編集する',
      color: 'secondary',
    },
    {
      id: 'print',
      href: '/roster?action=print',
      icon: '🖨️',
      label: '名簿印刷',
      desc: '名簿を印刷用レイアウトで出力する',
      color: 'secondary',
    },
    {
      id: 'info',
      href: '/info',
      icon: '📋',
      label: '統監情報',
      desc: 'アプリの情報・Supabase接続状態を確認する',
      color: 'secondary',
    },
  ];

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-header__inner">
          <span className="home-header__icon">📒</span>
          <div>
            <h1 className="home-header__title">地区名簿</h1>
            <p className="home-header__sub">メインメニュー</p>
          </div>
        </div>
      </header>

      <main className="home-main">
        <div className="home-menu-grid">
          {menus.map((m) => (
            <Link key={m.id} href={m.href} className={`home-menu-card home-menu-card--${m.color}`}>
              <span className="home-menu-card__icon">{m.icon}</span>
              <span className="home-menu-card__label">{m.label}</span>
              <span className="home-menu-card__desc">{m.desc}</span>
            </Link>
          ))}

          {/* サンプルデータ削除（ボタン形式） */}
          <button
            className="home-menu-card home-menu-card--danger"
            onClick={handleDeleteSample}
            disabled={deleting}
          >
            <span className="home-menu-card__icon">🗑️</span>
            <span className="home-menu-card__label">
              {deleting ? '削除中...' : 'サンプルデータの削除'}
            </span>
            <span className="home-menu-card__desc">
              登録されているすべてのデータを削除する
            </span>
          </button>
        </div>

        {delResult && (
          <div className={`home-alert home-alert--${delResult.ok ? 'ok' : 'err'}`}>
            {delResult.ok ? '✅' : '❌'} {delResult.msg}
          </div>
        )}
      </main>
    </div>
  );
}
