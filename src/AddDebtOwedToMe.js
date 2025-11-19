import React, {useState} from 'react';
import {db} from './firebase';
import {collection, addDoc, Timestamp} from 'firebase/firestore';

const AddDebtOwedToMe = ({user}) => {
  const [amount, setAmount] = useState('');
  const [debtorName, setDebtorName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');

  const handleAddDebt = async (e) => {
    e.preventDefault();
    if (!user) {
      setMessage('Please log in to add debts.');
      return;
    }
    if (!amount || !debtorName || !dueDate) {
      setMessage('Amount, Debtor Name, and Due Date are required.');
      return;
    }
    try {
      await addDoc(collection(db, 'users', user.uid, 'debtsOwedToMe'), {
        amount: parseFloat(amount),
        debtorName: debtorName.trim(),
        dueDate, // stored as string 'YYYY-MM-DD'
        note: note.trim() || '',
        cleared: false,
        createdAt: Timestamp.now()
      });
      setMessage('Debt added successfully!');
      setAmount('');
      setDebtorName('');
      setDueDate('');
      setNote('');
    } catch (error) {
      console.error('Error adding debt:', error);
      setMessage('Failed to add debt.');
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-xl font-semibold mb-4">Add Debt Owed To Me</h2>
      {message && <p className="mb-2 text-green-600">{message}</p>}
      <form onSubmit={handleAddDebt} className="flex flex-col gap-3">
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="border p-2 rounded"
          min="0.01"
          step="0.01"
        />
        <input
          type="text"
          placeholder="Debtor Name"
          value={debtorName}
          onChange={(e) => setDebtorName(e.target.value)}
          required
          className="border p-2 rounded"
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          required
          className="border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="border p-2 rounded"
        />
        <button type="submit" className="bg-blue-500 text-white p-2 rounded">
          Add Debt
        </button>
      </form>
    </div>
  );
};

export default AddDebtOwedToMe;
