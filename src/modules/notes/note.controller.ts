import { Router, Request, Response } from 'express';
import datasource from '../../datasource';
import { Note } from './note.entity';
import { Auth } from '../../lib/auth';
import { In, IsNull } from 'typeorm';

const noteController = Router();
const noteRepository = datasource.getRepository(Note);

// 指定したノートの子孫（子・孫・ひ孫…）の id をすべて集める
const findDescendantIds = async (parentId: number): Promise<number[]> => {
  const children = await noteRepository.find({
    where: { parentId },
    select: { id: true },
  });
  const childIds = children.map((child) => child.id);
  // 子それぞれについて、さらにその子孫を集める（再帰）
  const grandchildIds = await Promise.all(
    childIds.map((childId) => findDescendantIds(childId))
  );
  return childIds.concat(...grandchildIds);
};

// ノート一覧取得・検索
noteController.get('/', Auth, async (req: Request, res: Response) => {
  try {
    const userId = req.currentUser!.id;
    const parentIdParam = req.query.parentId as string | undefined;
    const keyword = req.query.keyword as string | undefined;

    let notes;

    // Case 1: keyword あり → 全文検索
    if (keyword) {
      const queryBuilder = noteRepository
        .createQueryBuilder('note')
        .where('note.userId = :userId', { userId })
        .andWhere('note.isArchived = :isArchived', { isArchived: false })
        .andWhere(
          '(LOWER(note.title) LIKE :keyword OR LOWER(note.content) LIKE :keyword)',
          { keyword: `%${keyword.toLowerCase()}%` }
        );

      // parentId が指定されている場合はさらにフィルタ
      if (parentIdParam !== undefined) {
        const parentId = parseInt(parentIdParam);
        queryBuilder.andWhere('note.parentId = :parentId', { parentId });
      }

      notes = await queryBuilder.orderBy('note.createdAt', 'DESC').getMany();
    }
    // Case 2: parentId あり → 子ノート取得
    else if (parentIdParam !== undefined) {
      const parentId = parseInt(parentIdParam);
      notes = await noteRepository.find({
        where: { userId, parentId, isArchived: false },
        order: { createdAt: 'DESC' },
      });
    }
    // Case 3: 両方なし → ルートノート取得
    else {
      notes = await noteRepository.find({
        where: { userId, parentId: IsNull(), isArchived: false },
        order: { createdAt: 'DESC' },
      });
    }

    res.status(200).json({ notes });
  } catch (error) {
    console.error('ノート一覧取得エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// ゴミ箱のノート一覧取得
// ※ '/:id' より上に書く（下に書くと 'trash' が :id として扱われてしまう）
noteController.get('/trash', Auth, async (req: Request, res: Response) => {
  try {
    const userId = req.currentUser!.id;

    const notes = await noteRepository.find({
      where: { userId, isArchived: true },
      order: { updatedAt: 'DESC' },
    });

    res.status(200).json({ notes });
  } catch (error) {
    console.error('ゴミ箱一覧取得エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// ノート詳細取得
noteController.get('/:id', Auth, async (req: Request, res: Response) => {
  try {
    const userId = req.currentUser!.id;
    const noteId = parseInt(req.params.id);

    const note = await noteRepository.findOne({
      where: { id: noteId, userId },
    });

    if (!note) {
      res.status(404).json({ message: 'ノートが見つかりません' });
      return;
    }

    res.status(200).json(note);
  } catch (error) {
    console.error('ノート取得エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// ノート作成
noteController.post('/', Auth, async (req: Request, res: Response) => {
  try {
    const { title, content, parentId } = req.body;
    const userId = req.currentUser!.id;

    // parentId が指定されている場合、存在確認と所有者チェック
    if (parentId != null) {
      const parentNote = await noteRepository.findOne({
        where: { id: parentId, userId },
      });
      if (!parentNote) {
        res.status(404).json({ message: '親ノートが見つかりません' });
        return;
      }
    }

    // ノート作成
    const note = await noteRepository.save({
      userId,
      title: title || null,
      content: content || null,
      parentId: parentId || null,
    });

    res.status(201).json(note);
  } catch (error) {
    console.error('ノート作成エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// ノート更新
noteController.patch('/:id', Auth, async (req: Request, res: Response) => {
  try {
    const userId = req.currentUser!.id;
    const noteId = parseInt(req.params.id);
    const { title, content } = req.body;

    // ノート存在確認と所有者チェック
    const note = await noteRepository.findOne({
      where: { id: noteId, userId },
    });

    if (!note) {
      res.status(404).json({ message: 'ノートが見つかりません' });
      return;
    }

    // 更新データの準備
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;

    // 更新
    await noteRepository.update({ id: noteId }, updateData);

    // 更新後のノートを取得
    const updatedNote = await noteRepository.findOne({
      where: { id: noteId },
    });

    res.status(200).json(updatedNote);
  } catch (error) {
    console.error('ノート更新エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// ノートをゴミ箱に移動（子孫ノートも一緒に移動）
noteController.patch('/:id/archive', Auth, async (req: Request, res: Response) => {
  try {
    const userId = req.currentUser!.id;
    const noteId = parseInt(req.params.id);

    // ノート存在確認と所有者チェック
    const note = await noteRepository.findOne({
      where: { id: noteId, userId },
    });

    if (!note) {
      res.status(404).json({ message: 'ノートが見つかりません' });
      return;
    }

    // 自分と子孫をまとめてゴミ箱へ
    const descendantIds = await findDescendantIds(noteId);
    await noteRepository.update(
      { id: In([noteId, ...descendantIds]) },
      { isArchived: true }
    );

    res.status(200).json({ message: 'ノートをゴミ箱に移動しました' });
  } catch (error) {
    console.error('ノートアーカイブエラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// ノートをゴミ箱から復元（子孫ノートも一緒に復元）
noteController.patch('/:id/restore', Auth, async (req: Request, res: Response) => {
  try {
    const userId = req.currentUser!.id;
    const noteId = parseInt(req.params.id);

    // ノート存在確認と所有者チェック
    const note = await noteRepository.findOne({
      where: { id: noteId, userId },
    });

    if (!note) {
      res.status(404).json({ message: 'ノートが見つかりません' });
      return;
    }

    // 自分と子孫をまとめて復元
    const descendantIds = await findDescendantIds(noteId);
    await noteRepository.update(
      { id: In([noteId, ...descendantIds]) },
      { isArchived: false }
    );

    // 親ノートがまだゴミ箱にある場合は、一番上の階層に移動して復元する
    if (note.parentId != null) {
      const parentNote = await noteRepository.findOne({
        where: { id: note.parentId },
      });
      if (parentNote?.isArchived) {
        await noteRepository.update({ id: noteId }, { parentId: null });
      }
    }

    // 復元後のノートを返す（フロントでサイドバーに戻すために使う）
    const restoredNote = await noteRepository.findOne({
      where: { id: noteId },
    });

    res.status(200).json(restoredNote);
  } catch (error) {
    console.error('ノート復元エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// ノート削除
noteController.delete('/:id', Auth, async (req: Request, res: Response) => {
  try {
    const userId = req.currentUser!.id;
    const noteId = parseInt(req.params.id);

    // ノート存在確認と所有者チェック
    const note = await noteRepository.findOne({
      where: { id: noteId, userId },
    });

    if (!note) {
      res.status(404).json({ message: 'ノートが見つかりません' });
      return;
    }

    // 削除 (CASCADE により子ノートも自動削除)
    await noteRepository.delete({ id: noteId });

    res.status(200).json({
      message: 'ノートを削除しました',
    });
  } catch (error) {
    console.error('ノート削除エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

export default noteController;

