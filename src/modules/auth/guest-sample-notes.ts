// ゲストに最初から入れておくサンプルのノート
// content は、フロントのエディタ（BlockNote）が保存する形と同じ「ブロックの配列」の JSON 文字列

type Block = {
  type: 'heading' | 'paragraph' | 'bulletListItem';
  props?: { level: 1 | 2 | 3 };
  content: string;
};

export type SampleNote = {
  title: string;
  icon: string | null;
  blocks: Block[];
  children?: SampleNote[];
};

export const toContent = (blocks: Block[]): string => JSON.stringify(blocks);

export const guestSampleNotes: SampleNote[] = [
  {
    title: 'はじめに',
    icon: '📘',
    blocks: [
      { type: 'heading', props: { level: 2 }, content: 'ようこそ！' },
      {
        type: 'paragraph',
        content:
          'これはお試し用のゲストアカウントです。自由に書き換えて大丈夫です。データは 24 時間で消えます。',
      },
      { type: 'heading', props: { level: 3 }, content: '試せること' },
      { type: 'bulletListItem', content: 'サイドバーの ⋮⋮ をつかんで、ノートを並び替える' },
      { type: 'bulletListItem', content: '▶ を押して子ノートを開く・＋で子ノートを作る' },
      { type: 'bulletListItem', content: 'タイトルの上でアイコン（絵文字）を変える' },
      { type: 'bulletListItem', content: 'お気に入り・ゴミ箱・ダークモード・検索' },
    ],
  },
  {
    title: '買い物メモ',
    icon: '📝',
    blocks: [
      { type: 'bulletListItem', content: '牛乳' },
      { type: 'bulletListItem', content: 'パン' },
      { type: 'bulletListItem', content: 'コーヒー豆' },
    ],
  },
  {
    title: '読書記録',
    icon: '📂',
    blocks: [{ type: 'paragraph', content: '読みたい本と、読み終わった本をまとめています。' }],
    children: [
      {
        title: '読みたい本',
        icon: '📗',
        blocks: [{ type: 'bulletListItem', content: 'リーダブルコード' }],
      },
      {
        title: '読み終わった本',
        icon: '📙',
        blocks: [{ type: 'bulletListItem', content: 'プログラミング TypeScript' }],
      },
    ],
  },
];
