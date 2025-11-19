import React, {useState} from 'react';
import {db} from './firebase';
import {addDoc, collection, doc, getDoc, setDoc, updateDoc, Timestamp} from 'firebase/firestore';

const AddExpense = ({user}) => {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!amount) newErrors.amount = 'Required';
    if (!category) newErrors.category = 'Required';
    if (!date) newErrors.date = 'Required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    if (!user) {
      setMessage('User not logged in.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      // Convert date string to Firestore Timestamp
      const expenseDate = date ? Timestamp.fromDate(new Date(date)) : null;

      // 1️⃣ Add expense to Firestore
      await addDoc(collection(db, 'users', user.uid, 'expenses'), {
        amount: parseFloat(amount),
        category,
        date: expenseDate,
        note,
        createdAt: Timestamp.now()
      });

      // 2️⃣ Update budget document (create if missing)
      const budgetRef = doc(db, 'users', user.uid, 'budget', 'budgetData');
      const budgetSnap = await getDoc(budgetRef);

      if (budgetSnap.exists()) {
        const currentBudget = budgetSnap.data().amount || 0;
        const newBudget = currentBudget - parseFloat(amount);
        await updateDoc(budgetRef, {amount: newBudget});
      } else {
        // Create budget document with default 0 if missing
        await setDoc(budgetRef, {amount: 0});
        setMessage('Budget document not found, created with default amount 0. Please update your budget.');
      }

      // Clear form inputs if no earlier message set
      if (!message) {
        setMessage('Expense added successfully!');
        setAmount('');
        setCategory('');
        setDate('');
        setNote('');
      }
      setTimeout(() => setMessage(''), 3000);
      setErrors({});
    } catch (error) {
      console.error('Error adding expense or updating budget:', error);
      setMessage('Error adding expense or updating budget.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
          <span role="img" aria-label="expense">💸</span> Add Expense
        </h2>
        {message && <p className="text-sm mb-2 text-green-600">{message}</p>}
        <form onSubmit={handleAddExpense} className="flex flex-wrap gap-3 items-center">
          <div className="flex flex-col">
            <input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} required className="border p-2 rounded w-28 focus:ring-2 focus:ring-blue-400 transition" />
            {errors.amount && <span className="text-xs text-red-500">{errors.amount}</span>}
          </div>
          <div className="flex flex-col">
            <input type="text" placeholder="Category" value={category} onChange={e => setCategory(e.target.value)} required className="border p-2 rounded w-32 focus:ring-2 focus:ring-blue-400 transition" />
            {errors.category && <span className="text-xs text-red-500">{errors.category}</span>}
          </div>
          <div className="flex flex-col">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="border p-2 rounded w-36 focus:ring-2 focus:ring-blue-400 transition" />
            {errors.date && <span className="text-xs text-red-500">{errors.date}</span>}
          </div>
          <div className="flex flex-col">
            <input type="text" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} className="border p-2 rounded w-40 focus:ring-2 focus:ring-blue-400 transition" />
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition-colors flex items-center gap-2">
            <span role="img" aria-label="add">➕</span> Add Expense
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddExpense;
