import React, {useState} from 'react';
import {db} from './firebase';
import {collection, addDoc, serverTimestamp} from 'firebase/firestore';

const AddViolation = ({user}) => {
  const [violationType, setViolationType] = useState('');
  const [fineAmount, setFineAmount] = useState('');
  const [violationDate, setViolationDate] = useState('');
  const [noticeNumber, setNoticeNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});

  // Calculate due date = violationDate + 30 days
  const calculateDueDate = (dateStr) => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 30);
    return date;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!violationType) newErrors.violationType = 'Required';
    if (!fineAmount) newErrors.fineAmount = 'Required';
    if (!violationDate) newErrors.violationDate = 'Required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    try {
      const dueDate = calculateDueDate(violationDate);
      await addDoc(collection(db, 'users', user.uid, 'violations'), {
        violationType,
        fineAmount: parseFloat(fineAmount),
        violationDate: new Date(violationDate),
        dueDate,
        status: 'Pending',
        noticeNumber,
        notes,
        createdAt: serverTimestamp()
      });
      setViolationType('');
      setFineAmount('');
      setViolationDate('');
      setNoticeNumber('');
      setNotes('');
      setMessage('Violation added successfully');
      setTimeout(() => setMessage(''), 3000);
      setErrors({});
    } catch (error) {
      console.error('Error adding violation:', error);
      setMessage('Error adding violation');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
          <span role="img" aria-label="violation">🚨</span> Add Traffic Violation
        </h2>
        {message && <p className="text-sm mb-2 text-green-600">{message}</p>}
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-center">
          <div className="flex flex-col">
            <input type="text" placeholder="Violation Type" value={violationType} onChange={e => setViolationType(e.target.value)} required className="border p-2 rounded w-36 focus:ring-2 focus:ring-blue-400 transition" />
            {errors.violationType && <span className="text-xs text-red-500">{errors.violationType}</span>}
          </div>
          <div className="flex flex-col">
            <input type="number" placeholder="Fine Amount (₹)" value={fineAmount} onChange={e => setFineAmount(e.target.value)} required className="border p-2 rounded w-28 focus:ring-2 focus:ring-blue-400 transition" min="0" step="0.01" />
            {errors.fineAmount && <span className="text-xs text-red-500">{errors.fineAmount}</span>}
          </div>
          <div className="flex flex-col">
            <input type="date" value={violationDate} onChange={e => setViolationDate(e.target.value)} required className="border p-2 rounded w-36 focus:ring-2 focus:ring-blue-400 transition" />
            {errors.violationDate && <span className="text-xs text-red-500">{errors.violationDate}</span>}
          </div>
          <div className="flex flex-col">
            <input type="text" placeholder="Notice Number (optional)" value={noticeNumber} onChange={e => setNoticeNumber(e.target.value)} className="border p-2 rounded w-32 focus:ring-2 focus:ring-blue-400 transition" />
          </div>
          <div className="flex flex-col">
            <input type="text" placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} className="border p-2 rounded w-40 focus:ring-2 focus:ring-blue-400 transition" />
          </div>
          <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow transition-colors flex items-center gap-2">
            <span role="img" aria-label="add">➕</span> Add Violation
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddViolation;
