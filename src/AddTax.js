import React, {useState} from 'react';
import {db} from './firebase';
import {collection, addDoc, serverTimestamp} from 'firebase/firestore';

const AddTax = ({user}) => {
  const [taxType, setTaxType] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!taxType) newErrors.taxType = 'Required';
    if (!amount) newErrors.amount = 'Required';
    if (!dueDate) newErrors.dueDate = 'Required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'taxes'), {
        taxType,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        notes,
        status: 'Pending',
        createdAt: serverTimestamp()
      });
      setTaxType('');
      setAmount('');
      setDueDate('');
      setNotes('');
      setMessage('Tax entry added successfully');
      setTimeout(() => setMessage(''), 3000);
      setErrors({});
    } catch (error) {
      console.error('Error adding tax entry:', error);
      setMessage('Error adding tax entry');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
          <span role="img" aria-label="tax">💰</span> Add Tax Entry
        </h2>
        {message && <p className="text-sm mb-2 text-green-600">{message}</p>}
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-center">
          <div className="flex flex-col">
            <input type="text" placeholder="Tax Type" value={taxType} onChange={e => setTaxType(e.target.value)} required className="border p-2 rounded w-36 focus:ring-2 focus:ring-blue-400 transition" />
            {errors.taxType && <span className="text-xs text-red-500">{errors.taxType}</span>}
          </div>
          <div className="flex flex-col">
            <input type="number" placeholder="Amount (₹)" value={amount} onChange={e => setAmount(e.target.value)} required className="border p-2 rounded w-28 focus:ring-2 focus:ring-blue-400 transition" min="0" step="0.01" />
            {errors.amount && <span className="text-xs text-red-500">{errors.amount}</span>}
          </div>
          <div className="flex flex-col">
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required className="border p-2 rounded w-36 focus:ring-2 focus:ring-blue-400 transition" />
            {errors.dueDate && <span className="text-xs text-red-500">{errors.dueDate}</span>}
          </div>
          <div className="flex flex-col">
            <input type="text" placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} className="border p-2 rounded w-40 focus:ring-2 focus:ring-blue-400 transition" />
          </div>
          <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded shadow transition-colors flex items-center gap-2">
            <span role="img" aria-label="add">➕</span> Add Tax Entry
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddTax;
