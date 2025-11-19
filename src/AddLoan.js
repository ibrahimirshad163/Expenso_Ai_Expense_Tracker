import React, {useState} from 'react';
import {db} from './firebase';
import {collection, addDoc, serverTimestamp} from 'firebase/firestore';

const AddLoan = ({user}) => {
  const [loanOrganizationName, setLoanOrganizationName] = useState('');
  const [reason, setReason] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [annualInterest, setAnnualInterest] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!loanOrganizationName) newErrors.loanOrganizationName = 'Required';
    if (!dueDate) newErrors.dueDate = 'Required';
    if (!loanAmount) newErrors.loanAmount = 'Required';
    if (!annualInterest) newErrors.annualInterest = 'Required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'loans'), {
        loanOrganizationName,
        reason,
        dueDate: new Date(dueDate),
        loanAmount: parseFloat(loanAmount),
        annualInterest: parseFloat(annualInterest),
        status: 'Pending',
        createdAt: serverTimestamp()
      });
      setLoanOrganizationName('');
      setReason('');
      setDueDate('');
      setLoanAmount('');
      setAnnualInterest('');
      setMessage('Loan added successfully');
      setTimeout(() => setMessage(''), 3000);
      setErrors({});
    } catch (error) {
      console.error('Error adding loan:', error);
      setMessage('Error adding loan');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
          <span role="img" aria-label="loan">💸</span> Add Loan
        </h2>
        {message && <p className="text-sm mb-2 text-green-600">{message}</p>}
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-center">
          <div className="flex flex-col">
            <input type="text" placeholder="Organization" value={loanOrganizationName} onChange={e => setLoanOrganizationName(e.target.value)} required className="border p-2 rounded w-36 focus:ring-2 focus:ring-blue-400 transition" />
            {errors.loanOrganizationName && <span className="text-xs text-red-500">{errors.loanOrganizationName}</span>}
          </div>
          <div className="flex flex-col">
            <input type="text" placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} className="border p-2 rounded w-36 focus:ring-2 focus:ring-blue-400 transition" />
          </div>
          <div className="flex flex-col">
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required className="border p-2 rounded w-36 focus:ring-2 focus:ring-blue-400 transition" />
            {errors.dueDate && <span className="text-xs text-red-500">{errors.dueDate}</span>}
          </div>
          <div className="flex flex-col">
            <input type="number" placeholder="Amount" value={loanAmount} onChange={e => setLoanAmount(e.target.value)} required className="border p-2 rounded w-28 focus:ring-2 focus:ring-blue-400 transition" min="0" step="0.01" />
            {errors.loanAmount && <span className="text-xs text-red-500">{errors.loanAmount}</span>}
          </div>
          <div className="flex flex-col">
            <input type="number" placeholder="Interest %" value={annualInterest} onChange={e => setAnnualInterest(e.target.value)} required className="border p-2 rounded w-24 focus:ring-2 focus:ring-blue-400 transition" min="0" step="0.01" />
            {errors.annualInterest && <span className="text-xs text-red-500">{errors.annualInterest}</span>}
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition-colors flex items-center gap-2">
            <span role="img" aria-label="add">➕</span> Add Loan
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddLoan;
