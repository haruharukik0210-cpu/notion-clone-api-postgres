import { Request, Response, NextFunction } from 'express';
import datasource from '../datasource';
import { User } from '../modules/users/user.entity';
import { decodeJwt } from '../lib/jwt';

// 全部のリクエストの前に動く関所：トークンから「誰なのか」を調べて req.currentUser に入れる
// ここでは「通す・通さない」は決めない（それは Auth の役目）
// トークンがない・読めない・ユーザーが消えている → どれも「ログインしていない人」として次へ進める
//   → ログインや /auth/me は、壊れたトークンが残っていても使える
//   → ログインが必要なルートでは、Auth が 401 を返す
export default async (req: Request, _res: Response, next: NextFunction) => {
  const token = _getTokenFromHeader(req);
  if (!token) return next();

  let userId: string;
  try {
    userId = decodeJwt(token);
  } catch {
    // 署名が合わない・形が壊れているトークン。エラーにはせず、ログインしていない扱いにする
    return next();
  }

  // DB の読み込みに失敗したとき（DB が落ちているなど）は、本当の故障なので、そのままエラーにする（→ 500）
  const user = await datasource.getRepository(User).findOne({ where: { id: userId } });
  if (user) req.currentUser = user;
  next();
};

const _getTokenFromHeader = (req: Request): string | undefined => {
  if (
    req.headers.authorization &&
    req.headers.authorization.split(' ')[0] === 'Bearer'
  ) {
    return req.headers.authorization.split(' ')[1];
  }
};
