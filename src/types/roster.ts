// src/types/roster.ts

export type CardType = '世帯' | '連名' | '個人';

export type Division =
  | '壮年部' | '女性部' | '男子部' | '華陽会'
  | '男子学生部' | '男子高等部' | '男子中等部'
  | '少年部' | '女子学生部' | '女子高等部'
  | '女子中等部' | '少女部' | '未就学';

export const DIVISIONS: Division[] = [
  '壮年部', '女性部', '男子部', '華陽会',
  '男子学生部', '男子高等部', '男子中等部',
  '少年部', '女子学生部', '女子高等部',
  '女子中等部', '少女部', '未就学',
];

export const CARD_TYPES: CardType[] = ['世帯', '連名', '個人'];

// -----------------------------------------------
export interface Block {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface Household {
  id: string;
  block_id: string;
  address: string | null;
  building: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  block?: Block;
  members?: Member[];
}

export interface Member {
  id: string;
  household_id: string;
  card_type: CardType;
  name: string;
  name_kana: string | null;
  division: Division | null;
  position: string | null;
  gakkai_study: string | null;
  is_present: boolean;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  faith_date: string | null;
  has_newspaper: boolean;
  visited: boolean;
  attended: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  household?: Household;
}

// フォーム用
export type MemberInsert = Omit<Member, 'id' | 'created_at' | 'updated_at' | 'household'>;
export type MemberUpdate = Partial<MemberInsert>;
export type HouseholdInsert = Omit<Household, 'id' | 'created_at' | 'updated_at' | 'block' | 'members'>;
export type HouseholdUpdate = Partial<HouseholdInsert>;

// 検索フィルター
export interface SearchFilters {
  query: string;
  block_id: string;       // '' = all
  division: Division | '';
  is_present: 'all' | 'present' | 'absent';
  has_newspaper: 'all' | 'yes' | 'no';
  visited: 'all' | 'yes' | 'no';
  attended: 'all' | 'yes' | 'no';
}

export const defaultFilters: SearchFilters = {
  query: '',
  block_id: '',
  division: '',
  is_present: 'all',
  has_newspaper: 'all',
  visited: 'all',
  attended: 'all',
};
