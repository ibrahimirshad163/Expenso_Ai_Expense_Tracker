import React, {useState} from 'react';
import {db} from './firebase';
import {collection, addDoc, serverTimestamp} from 'firebase/firestore';

const AddStock = ({user}) => {
  const [stockName, setStockName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [buyDate, setBuyDate] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!stockName) newErrors.stockName = 'Required';
    if (!quantity) newErrors.quantity = 'Required';
    if (!buyPrice) newErrors.buyPrice = 'Required';
    if (!currentPrice) newErrors.currentPrice = 'Required';
    if (!buyDate) newErrors.buyDate = 'Required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'stocks'), {
        stockName,
        quantity: parseFloat(quantity),
        buyPrice: parseFloat(buyPrice),
        currentPrice: parseFloat(currentPrice),
        buyDate: new Date(buyDate),
        status: 'Holding',
        createdAt: serverTimestamp()
      });
      setStockName('');
      setQuantity('');
      setBuyPrice('');
      setCurrentPrice('');
      setBuyDate('');
      setMessage('Stock added successfully');
      setTimeout(() => setMessage(''), 3000);
      setErrors({});
    } catch (error) {
      console.error('Error adding stock:', error);
      setMessage('Error adding stock');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
          <span role="img" aria-label="stock">📊</span> Add Stock
        </h2>
        {message && <p className="text-sm mb-2 text-green-600">{message}</p>}
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-center">
          <div className="flex flex-col">
            <input type="text" placeholder="Stock Name" value={stockName} onChange={e => setStockName(e.target.value)} required className="border p-2 rounded w-36 focus:ring-2 focus:ring-blue-400 transition" />
            {errors.stockName && <span className="text-xs text-red-500">{errors.stockName}</span>}
          </div>
          <div className="flex flex-col">
            <input type="number" placeholder="Quantity" value={quantity} onChange={e => setQuantity(e.target.value)} required className="border p-2 rounded w-24 focus:ring-2 focus:ring-blue-400 transition" min="0" step="0.01" />
            {errors.quantity && <span className="text-xs text-red-500">{errors.quantity}</span>}
          </div>
          <div className="flex flex-col">
            <input type="number" placeholder="Buy Price (₹)" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} required className="border p-2 rounded w-28 focus:ring-2 focus:ring-blue-400 transition" min="0" step="0.01" />
            {errors.buyPrice && <span className="text-xs text-red-500">{errors.buyPrice}</span>}
          </div>
          <div className="flex flex-col">
            <input type="number" placeholder="Current Price (₹)" value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} required className="border p-2 rounded w-28 focus:ring-2 focus:ring-blue-400 transition" min="0" step="0.01" />
            {errors.currentPrice && <span className="text-xs text-red-500">{errors.currentPrice}</span>}
          </div>
          <div className="flex flex-col">
            <input type="date" value={buyDate} onChange={e => setBuyDate(e.target.value)} required className="border p-2 rounded w-36 focus:ring-2 focus:ring-blue-400 transition" />
            {errors.buyDate && <span className="text-xs text-red-500">{errors.buyDate}</span>}
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition-colors flex items-center gap-2">
            <span role="img" aria-label="add">➕</span> Add Stock
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddStock;
