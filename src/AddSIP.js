import React, {useState} from 'react';
import {db} from './firebase';
import {collection, addDoc, serverTimestamp} from 'firebase/firestore';

const AddSIP = ({user}) => {
  const [fundName, setFundName] = useState('');
  const [sipAmount, setSipAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [expectedReturnRate, setExpectedReturnRate] = useState('');
  const [durationMonths, setDurationMonths] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!fundName) newErrors.fundName = 'Required';
    if (!sipAmount) newErrors.sipAmount = 'Required';
    if (!startDate) newErrors.startDate = 'Required';
    if (!expectedReturnRate) newErrors.expectedReturnRate = 'Required';
    if (!durationMonths) newErrors.durationMonths = 'Required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'sips'), {
        fundName,
        sipAmount: parseFloat(sipAmount),
        startDate: new Date(startDate),
        expectedReturnRate: parseFloat(expectedReturnRate),
        durationMonths: parseInt(durationMonths),
        status: 'Active',
        createdAt: serverTimestamp()
      });
      setFundName('');
      setSipAmount('');
      setStartDate('');
      setExpectedReturnRate('');
      setDurationMonths('');
      setMessage('SIP added successfully');
      setTimeout(() => setMessage(''), 3000);
      setErrors({});
    } catch (error) {
      console.error('Error adding SIP:', error);
      setMessage('Error adding SIP');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
          <span role="img" aria-label="sip">📈</span> Add SIP/Mutual Fund
        </h2>
        {message && <p className="text-sm mb-2 text-green-600">{message}</p>}
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-center">
          <div className="flex flex-col">
            <input type="text" placeholder="Fund Name" value={fundName} onChange={e => setFundName(e.target.value)} required className="border p-2 rounded w-40 focus:ring-2 focus:ring-blue-400 transition" />
            {errors.fundName && <span className="text-xs text-red-500">{errors.fundName}</span>}
          </div>
          <div className="flex flex-col">
            <input type="number" placeholder="SIP Amount (₹)" value={sipAmount} onChange={e => setSipAmount(e.target.value)} required className="border p-2 rounded w-32 focus:ring-2 focus:ring-blue-400 transition" min="0" step="0.01" />
            {errors.sipAmount && <span className="text-xs text-red-500">{errors.sipAmount}</span>}
          </div>
          <div className="flex flex-col">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="border p-2 rounded w-36 focus:ring-2 focus:ring-blue-400 transition" />
            {errors.startDate && <span className="text-xs text-red-500">{errors.startDate}</span>}
          </div>
          <div className="flex flex-col">
            <input type="number" placeholder="Return Rate %" value={expectedReturnRate} onChange={e => setExpectedReturnRate(e.target.value)} required className="border p-2 rounded w-28 focus:ring-2 focus:ring-blue-400 transition" min="0" step="0.01" />
            {errors.expectedReturnRate && <span className="text-xs text-red-500">{errors.expectedReturnRate}</span>}
          </div>
          <div className="flex flex-col">
            <input type="number" placeholder="Duration (months)" value={durationMonths} onChange={e => setDurationMonths(e.target.value)} required className="border p-2 rounded w-32 focus:ring-2 focus:ring-blue-400 transition" min="1" />
            {errors.durationMonths && <span className="text-xs text-red-500">{errors.durationMonths}</span>}
          </div>
          <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow transition-colors flex items-center gap-2">
            <span role="img" aria-label="add">➕</span> Add SIP
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddSIP;
