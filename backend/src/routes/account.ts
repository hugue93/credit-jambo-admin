import { Router } from 'express';
import { requireAuth, AuthedRequest } from '../middlewares/auth';
import { getBalance } from '../services/accountService';

export const accountRouter = Router();

accountRouter.get('/balance', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const result = await getBalance(req.userId!);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Error' });
  }
});
