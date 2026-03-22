// src/app/info/page.tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function InfoPage() {
  const [status, setStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [counts, setCounts] = useState<{ blocks: number; households: number; members: number } | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [b, h, m] = await Promise.all([
          supabase.from('blocks').select('id', { count: 'exact', head: true }),
          supabase.from('households').select('id', { count: 'exact', head: true }),
          supabase.from('members').select('id', { count: 'exact', head: true }),
        ]);
        if (b.error || h.error || m.error) {
          throw new Error((b.error ?? h.error ?? m.error)?.message);
        }
        setCounts({ blocks: b.count ?? 0, households: h.count ?? 0, members: m.count ?? 0 });
        setStatus('ok');
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setErrMsg(msg);
        setStatus('error');
      }
    })();
  }, []);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '（未設定）';
  const masked = url.replace(/^(https:\/\/[a-zA-Z0-9]{6})[^.]+/, '$1****');

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__inner">
          <div className="app-header__title">
            <span className="app-header__icon">📋</span>
            <h1>統監情報</h1>
          </div>
          <div className="app-header__actions">
            <Link href="/" className="btn btn--outline">← ホームへ戻る</Link>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="info-card">
          <h2 className="info-card__title">アプリ情報</h2>
          <table className="info-table">
            <tbody>
              <tr><th>アプリ名</th><td>地区名簿システム</td></tr>
              <tr><th>バージョン</th><td>0.1.0</td></tr>
              <tr><th>フレームワーク</th><td>Next.js 15 (App Router)</td></tr>
              <tr><th>データベース</th><td>Supabase (PostgreSQL)</td></tr>
            </tbody>
          </table>
        </div>

        <div className="info-card">
          <h2 className="info-card__title">Supabase 接続情報</h2>
          <table className="info-table">
            <tbody>
              <tr>
                <th>接続先 URL</th>
                <td><code className="info-code">{masked}</code></td>
              </tr>
              <tr>
                <th>接続状態</th>
                <td>
                  {status === 'checking' && <span className="info-badge info-badge--checking">確認中...</span>}
                  {status === 'ok'       && <span className="info-badge info-badge--ok">✅ 接続成功</span>}
                  {status === 'error'    && <span className="info-badge info-badge--err">❌ 接続エラー</span>}
                </td>
              </tr>
            </tbody>
          </table>
          {status === 'error' && errMsg && (
            <div className="alert alert--error" style={{ marginTop: 12 }}>{errMsg}</div>
          )}
        </div>

        {counts && (
          <div className="info-card">
            <h2 className="info-card__title">データ件数</h2>
            <div className="info-counts">
              <div className="info-count-item">
                <span className="info-count-num">{counts.blocks}</span>
                <span className="info-count-label">ブロック</span>
              </div>
              <div className="info-count-item">
                <span className="info-count-num">{counts.households}</span>
                <span className="info-count-label">世帯</span>
              </div>
              <div className="info-count-item">
                <span className="info-count-num">{counts.members}</span>
                <span className="info-count-label">メンバー</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
