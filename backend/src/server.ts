import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import './utils/env';
import * as swaggerUi from 'swagger-ui-express';
import swaggerDocument from './docs/openapi.json';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';
import { accountRouter } from './routes/account';
import { transactionRouter } from './routes/transactions';
import { deviceRouter } from './routes/devices';

const app = express();

app.use(helmet());
app.use(cors({ origin: (process.env.CORS_ORIGINS || '').split(',').filter(Boolean), credentials: true }));
app.use(express.json());

const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use(globalLimiter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument as any));

// Basic request logging (method, url)
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});
app.use('/auth', authRouter);
app.use('/account', accountRouter);
app.use('/transactions', transactionRouter);
app.use('/devices', deviceRouter);
app.use('/admin', adminRouter);

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => console.log(`API listening on ${PORT}`));
