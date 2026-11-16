import { Router, Request, Response } from 'express';
import datasource from '../../datasource';
import { User } from '../users/user.entity';
import { compare, hash } from 'bcryptjs';
import { encodeJwt } from '../../lib/jwt';
import { randomUUID } from 'crypto';
import { LessThan, EntityManager } from 'typeorm';
import { rateLimit } from 'express-rate-limit';
import { Note } from '../notes/note.entity';
import { guestSampleNotes, SampleNote, toContent } from './guest-sample-notes';

const authController = Router();
const userRepository = datasource.getRepository(User);

// ユーザー登録
authController.post('/signup', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ message: '名前、メール、パスワードは必須です' });
      return;
    }

    // メールアドレスの重複チェック
    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      res
        .status(400)
        .json({ message: 'このメールアドレスは既に使用されています' });
      return;
    }

    // パスワードのハッシュ化
    const hashedPassword = await hash(password, 10);

    // ユーザー作成
    const user = await userRepository.save({
      name,
      email,
      password: hashedPassword,
    });

    if (!user) {
      res.status(404).json({ message: 'ユーザーが見つかりません' });
      return;
    }

    const token = encodeJwt(user.id);

    // パスワードを除外してレスポンスを返す
    res.status(200).json({
      user: {
        ...user,
        password: undefined,
      },
      token,
    });
  } catch (error) {
    console.error('ユーザー登録エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// ログイン
authController.post('/signin', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 必須項目のバリデーション
    if (!email || !password) {
      res.status(400).json({ message: 'メールとパスワードは必須です' });
      return;
    }

    // ユーザーの検索
    const user = await userRepository.findOne({
      where: { email },
    });
    if (!user) {
      res
        .status(401)
        .json({ message: 'メールアドレスまたはパスワードが正しくありません' });
      return;
    }

    // パスワードの確認
    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      res
        .status(401)
        .json({ message: 'メールアドレスまたはパスワードが正しくありません' });
      return;
    }

    // JWTトークンの生成
    const token = encodeJwt(user.id);

    // パスワードを除外してレスポンスを返す
    res.status(200).json({
      user: {
        ...user,
        password: undefined,
      },
      token,
    });
  } catch (error) {
    console.error('ログインエラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// ゲストは作ってから 24 時間で削除する
const GUEST_LIFETIME_MS = 24 * 60 * 60 * 1000;

// ゲストの作りすぎを防ぐ：同じ IP からは 1 時間に 10 回まで
const guestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'しばらく時間をおいてから、もう一度お試しください' },
});

// サンプルのノートを、親 → 子の順に作る。position は同じ親の中で 0, 1, 2 …
const createSampleNotes = async (
  manager: EntityManager,
  userId: string,
  samples: SampleNote[],
  parentId: number | null,
) => {
  for (const [index, sample] of samples.entries()) {
    const note = await manager.save(Note, {
      userId,
      parentId,
      title: sample.title,
      icon: sample.icon,
      content: toContent(sample.blocks),
      position: index,
    });
    if (sample.children) {
      await createSampleNotes(manager, userId, sample.children, note.id);
    }
  }
};

// お試し用のゲストを作ってログインする
authController.post('/guest', guestLimiter, async (_req: Request, res: Response) => {
  try {
    const user = await datasource.transaction(async (manager) => {
      // ① 24 時間より前に作られたゲストを削除する（ノートは ON DELETE CASCADE で一緒に消える）
      //    isGuest = true のユーザーだけが対象。本物のユーザーは消さない
      await manager.delete(User, {
        isGuest: true,
        createdAt: LessThan(new Date(Date.now() - GUEST_LIFETIME_MS)),
      });

      // ② 新しいゲストを作る。メールアドレスもパスワードもランダムで、誰も知らない
      const guest = await manager.save(User, {
        name: 'ゲスト',
        email: `guest-${randomUUID()}@guest.local`,
        password: await hash(randomUUID(), 10),
        isGuest: true,
      });

      // ③ サンプルのノートを入れる
      await createSampleNotes(manager, guest.id, guestSampleNotes, null);

      return guest;
    });

    // ④ ログインと同じ形で返す（フロントはログイン後の処理を共通にできる）
    res.status(200).json({
      user: { ...user, password: undefined },
      token: encodeJwt(user.id),
    });
  } catch (error) {
    console.error('ゲスト作成エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// 現在のユーザー情報取得
authController.get('/me', async (req: Request, res: Response) => {
  try {
    if (req.currentUser == null) {
      res.status(200).json(null);
      return;
    }
    const user = await userRepository.findOne({
      where: { id: req.currentUser.id },
    });
    if (!user) {
      res.status(404).json({ message: 'ユーザーが見つかりません' });
      return;
    }
    res.status(200).json({
      ...user,
      password: undefined,
    });
  } catch (error) {
    console.error('ユーザー情報取得エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

export default authController;
