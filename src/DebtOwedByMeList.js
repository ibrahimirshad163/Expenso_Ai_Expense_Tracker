// src/DebtOwedByMeList.js

import React, {useEffect, useState} from 'react';
import {db} from './firebase';
import {collection, addDoc, deleteDoc, doc, query, where, updateDoc, onSnapshot} from 'firebase/firestore';

const DebtOwedByMeList = ({user}) => {
  const [debts, setDebts] = useState([]);
  const [lender, setLender] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!user?.uid) return;
    const debtsRef = collection(db, 'debtsOwedByMe');
    const q = query(debtsRef, where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
      setDebts(data);
    });
    return () => unsubscribe();
  }, [user]);

  const addDebt = async () => {
    if (!lender || !amount || !dueDate) return;
    await addDoc(collection(db, 'debtsOwedByMe'), {
      userId: user.uid,
      lender,
      amount: parseFloat(amount),
      dueDate,
      note,
      status: 'Unpaid'
    });
    setLender('');
    setAmount('');
    setDueDate('');
    setNote('');
  };

  const markAsPaid = async (id) => {
    await updateDoc(doc(db, 'debtsOwedByMe', id), {status: 'Paid'});
  };

  const deleteDebt = async (id) => {
    await deleteDoc(doc(db, 'debtsOwedByMe', id));
  };

  return (
    <div className='p-4'>
      <h2 className='text-lg font-semibold mb-2'>Debts You Owe</h2>
      <input type='text' placeholder='Lender' value={lender} onChange={e => setLender(e.target.value)} className='border p-1 mr-1'/>
      <input type='number' placeholder='Amount' value={amount} onChange={e => setAmount(e.target.value)} className='border p-1 mr-1'/>
      <input type='date' placeholder='Due Date' value={dueDate} onChange={e => setDueDate(e.target.value)} className='border p-1 mr-1'/>
      <input type='text' placeholder='Note (optional)' value={note} onChange={e => setNote(e.target.value)} className='border p-1 mr-1'/>
      <button onClick={addDebt} className='bg-blue-500 text-white px-2 py-1 rounded'>Add Debt</button>

      <div className='mt-4'>
        {debts.length === 0 && <p className='text-gray-500'>No debts found.</p>}
        {debts.map(debt => (
          <div key={debt.id} className='border p-2 mb-2 rounded'>
            <div className="flex items-center gap-2 mb-2">
              <p><strong>Lender:</strong> {debt.lender}</p>
              {debt.status === 'Paid' ? (
                <span className="ml-2 px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-semibold">✔️ Paid</span>
              ) : (
                <span className="ml-2 px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 text-xs font-semibold">Pending</span>
              )}
            </div>
            <p><strong>Amount:</strong> ₹{debt.amount}</p>
            <p><strong>Due Date:</strong> {debt.dueDate}</p>
            {debt.note && <p><strong>Note:</strong> {debt.note}</p>}
            {debt.status !== 'Paid' && (
              <button
                onClick={() => markAsPaid(debt.id)}
                className='bg-green-500 text-white px-2 py-1 rounded mr-2 mt-1'
              >
                Mark as Paid
              </button>
            )}
            <button
              onClick={() => deleteDebt(debt.id)}
              className='bg-red-500 text-white px-2 py-1 rounded mt-1'
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DebtOwedByMeList;
