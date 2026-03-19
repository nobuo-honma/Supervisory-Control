-- ============================================================
--  名簿アプリ スキーマ
--  blocks → households → members の3層構造
-- ============================================================

-- 支部テーブル
create table blocks (
  id   uuid default gen_random_uuid() primary key,
  name text not null unique,   -- 支部名
  sort_order int default 0,
  created_at timestamptz default now()
);

-- 世帯カードテーブル
create table households (
  id         uuid default gen_random_uuid() primary key,
  block_id   uuid not null references blocks(id) on delete restrict,
  address    text,             -- 住所（番地まで）
  building   text,             -- 建物名・部屋番号
  notes      text,             -- 備考
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 個人テーブル（世帯カード内の各メンバー）
create table members (
  id              uuid default gen_random_uuid() primary key,
  household_id    uuid not null references households(id) on delete cascade,

  -- カード種別：世帯の代表者か、同世帯内の連名か、独立個人か
  card_type       text not null default '連名'
                  check (card_type in ('世帯', '連名', '個人')),

  -- 基本情報
  name            text not null,         -- 氏名
  name_kana       text,                  -- よみがな

  -- 組織情報
  division        text                   -- 部別
                  check (division in (
                    '壮年部','女性部','男子部','華陽会',
                    '男子学生部','男子高等部','男子中等部',
                    '少年部','女子学生部','女子高等部',
                    '女子中等部','少女部','未就学'
                  )),
  position        text,                  -- 役職
  gakkai_study    text,                  -- 教学

  -- 状態
  is_present      boolean default true,  -- 所在（在:true / 不在:false）

  -- 連絡先
  phone           text,
  email           text,

  -- 個人情報
  birth_date      date,                  -- 生年月日
  faith_date      date,                  -- 入信年月日

  -- 活動フラグ
  has_newspaper   boolean default false, -- 新聞購読（○/✕）
  visited         boolean default false, -- 訪問（○/✕）
  attended        boolean default false, -- 会合参加（○/✕）

  notes           text,                  -- 備考

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- updated_at 自動更新
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger households_updated_at
  before update on households
  for each row execute function update_updated_at();

create trigger members_updated_at
  before update on members
  for each row execute function update_updated_at();

-- RLS 有効化
alter table blocks     enable row level security;
alter table households enable row level security;
alter table members    enable row level security;

-- 認証ユーザーに全操作許可（認証不要なら anon に変更）
create policy "auth full access blocks"
  on blocks for all to authenticated using (true) with check (true);
create policy "auth full access households"
  on households for all to authenticated using (true) with check (true);
create policy "auth full access members"
  on members for all to authenticated using (true) with check (true);

-- ============================================================
--  サンプルデータ
-- ============================================================
insert into blocks (name, sort_order) values
  ('第一支部', 1),
  ('第二支部', 2),
  ('第三支部', 3);

-- 第一支部の世帯サンプル
with b as (select id from blocks where name = '第一支部')
insert into households (block_id, address, building)
select b.id, '岩見沢市1条1丁目1-1', null from b
union all
select b.id, '岩見沢市2条2丁目2-2', '〇〇マンション201号' from b;

-- 世帯メンバーサンプル
with h1 as (
  select id from households where address = '岩見沢市1条1丁目1-1' limit 1
)
insert into members
  (household_id, card_type, name, name_kana, division, position, is_present,
   phone, birth_date, faith_date, has_newspaper, visited, attended)
select
  h1.id,'世帯','山田 太郎','やまだ たろう','壮年部','ブロック長',true,
  '090-0001-0001','1960-04-01','1985-06-15',true,true,true
from h1
union all
select
  h1.id,'連名','山田 花子','やまだ はなこ','女性部','副ブロック長',true,
  '090-0001-0002','1963-08-20','1985-06-15',true,false,true
from h1;

with h2 as (
  select id from households where address = '岩見沢市2条2丁目2-2' limit 1
)
insert into members
  (household_id, card_type, name, name_kana, division, is_present,
   phone, birth_date, faith_date, has_newspaper, visited, attended)
select
  h2.id,'個人','鈴木 次郎','すずき じろう','男子部',true,
  '090-0002-0001','1995-03-10','2010-01-01',false,true,false
from h2;
