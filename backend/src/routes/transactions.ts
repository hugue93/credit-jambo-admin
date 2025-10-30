import { Router } from 'express';
import { requireAuth, AuthedRequest } from '../middlewares/auth';
import { listTransactions, deposit, withdraw, TxSchema } from '../services/transactionService';

export const transactionRouter = Router();

transactionRouter.get('/', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const data = await listTransactions(req.userId!);
    res.json(data);
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Error' });
  }
});

transactionRouter.post('/deposit', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const input = TxSchema.parse({ userId: req.userId!, amount: req.body.amount });
    const result = await deposit(input);
    res.status(201).json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Invalid input' });
  }
});

transactionRouter.post('/withdraw', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const input = TxSchema.parse({ userId: req.userId!, amount: req.body.amount });
    const result = await withdraw(input);
    res.status(201).json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Invalid input' });
  }
});
