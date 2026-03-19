# 地区名簿アプリ

Next.js 15 + TypeScript + Supabase による地区名簿管理システムです。

## データ構造

```
blocks（支部）
  └── households（世帯カード）
        └── members（個人 / 連名 / 世帯代表）
```

## 管理できる項目

| 項目 | 場所 |
|------|------|
| ブロック名（支部名） | blocks テーブル |
| カード種別（世帯・連名・個人） | members.card_type |
| 氏名・よみがな | members |
| 部別（壮年部〜未就学 13種） | members.division |
| 役職 | members.position |
| 教学 | members.gakkai_study |
| 所在（在・不在） | members.is_present |
| 住所 | households.address |
| 建物名・部屋番号 | households.building |
| 連絡先（電話・メール） | members |
| 生年月日 → 年齢自動計算 | members.birth_date |
| 入信年月日 | members.faith_date |
| 新聞購読（○/✕） | members.has_newspaper |
| 訪問（○/✕） | members.visited |
| 会合参加（○/✕） | members.attended |
| 備考 | members.notes / households.notes |

## セットアップ

### 1. パッケージインストール
```bash
npm install @supabase/ssr @supabase/supabase-js
```

### 2. Supabase テーブル作成
`supabase/schema.sql` を Supabase の SQL Editor で実行してください。

### 3. 環境変数
`.env.local` を作成：
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. 起動
```bash
npm run dev
```

## 主な機能

- **支部追加**：ヘッダーの「＋支部追加」から
- **世帯カード追加**：「＋世帯カード追加」→支部・住所を登録
- **メンバー追加**：世帯カードの「＋」ボタン
- **検索**：氏名・よみがな・電話番号で横断検索
- **フィルター**：支部・部別・所在・新聞・訪問・会合参加
- **印刷**：ヘッダーの「🖨 印刷」または Ctrl+P

## 認証なしで使う場合
`schema.sql` の RLS ポリシーで `authenticated` を `anon` に変更してください。
