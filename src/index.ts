import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import setCurrentUser from './middleware/set-current-user';
import errorHandler from './middleware/error-handler';
import authController from './modules/auth/auth.controller';
import noteController from './modules/notes/note.controller';
import datasource from './datasource';

require('dotenv').config();
const DEFAULT_PORT = 8888;
const MAX_PORT_ATTEMPTS = 10;

const app: Express = express();
const httpServer = createServer(app);

// Render はプロキシ（中継サーバー）の後ろで動くので、1つ手前の IP を「アクセスした人の IP」として扱う
// （回数制限 express-rate-limit が、人ごとに数えられるようにするため）
app.set('trust proxy', 1);

// JSONミドルウェアの設定
app.use(express.json());
app.use(cors());
app.use(setCurrentUser);

// 静的ファイル配信の設定
app.use('/uploads', express.static('uploads'));

// ルートの設定
app.use('/auth', authController);
app.use('/notes', noteController);

app.get('/', (req: Request, res: Response) => {
  res.send('hello world');
});

// 想定外のエラーを JSON の 500 で返す（ルートの登録より「あと」に置く。順番に通るので、最後に受け止める）
app.use(errorHandler);

// ポートが使用可能かチェックする関数
function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const testServer = createServer();
    testServer.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      }
    });
    testServer.once('listening', () => {
      testServer.close();
      resolve(true);
    });
    testServer.listen(port);
  });
}

// 使用可能なポートを見つけてサーバーを起動する関数
async function startServer() {
  let currentPort = DEFAULT_PORT;
  let serverStarted = false;

  for (let attempt = 0; attempt < MAX_PORT_ATTEMPTS; attempt++) {
    const isAvailable = await checkPort(currentPort);

    if (isAvailable) {
      httpServer.listen(currentPort, () => {
        console.log('\n✓ Server successfully started!');
        console.log(`✓ Port: ${currentPort}`);
        console.log(`✓ Local: http://localhost:${currentPort}\n`);
      });
      serverStarted = true;
      break;
    } else {
      console.log(
        `Port ${currentPort} is already in use, trying ${currentPort + 1}...`
      );
      currentPort++;
    }
  }

  if (!serverStarted) {
    console.error(
      `\n✗ Could not find an available port after ${MAX_PORT_ATTEMPTS} attempts.`
    );
    console.error(
      `✗ Tried ports ${DEFAULT_PORT} to ${
        DEFAULT_PORT + MAX_PORT_ATTEMPTS - 1
      }\n`
    );
    process.exit(1);
  }
}

// データベース初期化後にサーバーを起動
datasource
  .initialize()
  .then(async () => {
    await startServer();
  })
  .catch((error) => console.error(error));
