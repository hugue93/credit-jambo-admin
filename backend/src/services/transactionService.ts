import { firestore, messaging } from '../utils/firebase';
import { z } from 'zod';

const accountsCol = () => firestore.collection('accounts');
const transactionsCol = () => firestore.collection('transactions');
const devicesCol = () => firestore.collection('devices');

export const TxSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().positive(),
});

export async function listTransactions(userId: string) {
  const txSnap = await transactionsCol()
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  return txSnap.docs.map(d => d.data());
}

export async function deposit(input: z.infer<typeof TxSchema>) {
  const { userId, amount } = TxSchema.parse(input);
  let newBalanceNumber = 0;
  await firestore.runTransaction(async (tx) => {
    const accountSnap = await tx.get(accountsCol().where('userId', '==', userId).limit(1));
    if (accountSnap.empty) throw new Error('Account not found');
    const accountDoc = accountSnap.docs[0];
    const account = accountDoc.data() as any;
    const newBalance = (account.balance || 0) + amount;
    newBalanceNumber = Number(newBalance || 0);
    tx.update(accountDoc.ref, { balance: newBalance });
    const txRef = transactionsCol().doc();
    tx.set(txRef, {
      id: txRef.id,
      userId,
      type: 'deposit',
      amount,
      balanceAfter: newBalance,
      createdAt: new Date(),
    });
  });
  // Notify user devices
  try {
    const devs = await devicesCol()
      .where('userId', '==', userId)
      .get();
    const tokens: string[] = [];
    devs.forEach((d) => {
      const data = d.data() as any;
      const t = data.fcmToken as string | undefined;
      const verified = !!data.verifiedAt;
      if (verified && t) tokens.push(t);
    });
    if (tokens.length) {
      await messaging.sendEachForMulticast({
        tokens,
        notification: {
          title: 'Deposit successful',
          body: `You deposited RWF ${amount}`,
        },
        data: { type: 'deposit', amount: String(amount) },
      });
      // Low balance warning after deposit (edge case if still low)
      if (newBalanceNumber < 5000) {
        await messaging.sendEachForMulticast({
          tokens,
          notification: {
            title: 'Low balance warning',
            body: `Your balance is low: RWF ${newBalanceNumber}`,
          },
          data: { type: 'low_balance', balance: String(newBalanceNumber) },
        });
      }
    }
  } catch (e) {
    console.error('[tx] deposit notify error:', e);
  }
  return { message: 'Deposit successful' };
}

export async function withdraw(input: z.infer<typeof TxSchema>) {
  const { userId, amount } = TxSchema.parse(input);
  let newBalanceNumber = 0;
  await firestore.runTransaction(async (tx) => {
    const accountSnap = await tx.get(accountsCol().where('userId', '==', userId).limit(1));
    if (accountSnap.empty) throw new Error('Account not found');
    const accountDoc = accountSnap.docs[0];
    const account = accountDoc.data() as any;
    const current = account.balance || 0;
    if (amount > current) throw new Error('Insufficient funds');
    const newBalance = current - amount;
    newBalanceNumber = Number(newBalance || 0);
    tx.update(accountDoc.ref, { balance: newBalance });
    const txRef = transactionsCol().doc();
    tx.set(txRef, {
      id: txRef.id,
      userId,
      type: 'withdraw',
      amount,
      balanceAfter: newBalance,
      createdAt: new Date(),
    });
  });
  // Notify user devices
  try {
    const devs = await devicesCol()
      .where('userId', '==', userId)
      .get();
    const tokens: string[] = [];
    devs.forEach((d) => {
      const data = d.data() as any;
      const t = data.fcmToken as string | undefined;
      const verified = !!data.verifiedAt;
      if (verified && t) tokens.push(t);
    });
    if (tokens.length) {
      await messaging.sendEachForMulticast({
        tokens,
        notification: {
          title: 'Withdrawal alert',
          body: `You withdrew RWF ${amount}`,
        },
        data: { type: 'withdraw', amount: String(amount) },
      });
      if (newBalanceNumber < 5000) {
        await messaging.sendEachForMulticast({
          tokens,
          notification: {
            title: 'Low balance warning',
            body: `Your balance is low: RWF ${newBalanceNumber}`,
          },
          data: { type: 'low_balance', balance: String(newBalanceNumber) },
        });
      }
    }
  } catch (e) {
    console.error('[tx] withdraw notify error:', e);
  }
  return { message: 'Withdrawal successful' };
}



