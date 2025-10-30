import { firestore } from '../utils/firebase';

const accountsCol = () => firestore.collection('accounts');

export async function getBalance(userId: string) {
  const accountSnap = await accountsCol().where('userId', '==', userId).limit(1).get();
  if (accountSnap.empty) throw new Error('Account not found');
  const account = accountSnap.docs[0].data() as any;
  return { balance: account.balance as number };
}



