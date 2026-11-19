import { Request, Response, NextFunction } from 'express';

// ログインが必要なルートの前に置く関所
// 誰なのかわからない（setCurrentUser でユーザーが見つからなかった）ときは、先に進ませずに 401 を返す
// （以前はエラーを投げていたため、Express の標準のエラー処理で 500 になっていた）
export const Auth = (req: Request, res: Response, next: NextFunction) => {
  if (req.currentUser == null) {
    res.status(401).json({ message: 'ログインが必要です' });
    return;
  }
  next();
};
