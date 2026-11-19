import { Request, Response, NextFunction } from 'express';

// 最後の砦：どのルートでも受け止められなかった想定外のエラーを、ここで受け取る
// Express の標準のエラー処理は HTML（開発中はスタックトレースつき）を返すので、
// ほかの API と同じ JSON の形にそろえ、中身（どのファイルの何行目か）は外に出さない
// ※ 引数が 4 つあることで、Express は「エラー処理用のミドルウェア」だと判断する
export default (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({ message: 'サーバーエラーが発生しました' });
};
