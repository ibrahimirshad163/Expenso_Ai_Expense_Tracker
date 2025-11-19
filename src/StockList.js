import React, {useState, useEffect} from 'react';
import {db} from './firebase';
import {collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp} from 'firebase/firestore';

const StockList = ({user}) => {
  const [stocks, setStocks] = useState([]);
  const [sellForm, setSellForm] = useState({id: null, quantity: '', price: '', date: ''});

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'users', user.uid, 'stocks'),
      (snapshot) => {
        const stockData = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));
        setStocks(stockData);
      }
    );
    return () => unsub();
  }, [user]);

  const deleteStock = async (id) => {
    if (window.confirm('Delete this stock?')) {
      await deleteDoc(doc(db, 'users', user.uid, 'stocks', id));
    }
  };

  const handleSellClick = (stock) => {
    setSellForm({id: stock.id, quantity: stock.quantity, price: stock.currentPrice, date: new Date().toISOString().slice(0,10)});
  };
  const handleSellChange = (e) => {
    setSellForm({...sellForm, [e.target.name]: e.target.value});
  };
  const handleSellSubmit = async (stock) => {
    const sellQty = parseFloat(sellForm.quantity);
    const sellPrice = parseFloat(sellForm.price);
    const sellDate = sellForm.date ? new Date(sellForm.date) : new Date();
    if (!sellQty || !sellPrice || sellQty > stock.quantity || sellQty <= 0) return;
    if (sellQty === stock.quantity) {
      await updateDoc(doc(db, 'users', user.uid, 'stocks', stock.id), {
        status: 'Sold',
        sellQuantity: sellQty,
        sellPrice,
        sellDate,
        soldAt: serverTimestamp()
      });
    } else {
      // Partial sale: update original, add new sold record
      await updateDoc(doc(db, 'users', user.uid, 'stocks', stock.id), {
        quantity: stock.quantity - sellQty
      });
      await addDoc(collection(db, 'users', user.uid, 'stocks'), {
        stockName: stock.stockName,
        quantity: sellQty,
        buyPrice: stock.buyPrice,
        currentPrice: stock.currentPrice,
        buyDate: stock.buyDate,
        status: 'Sold',
        sellQuantity: sellQty,
        sellPrice,
        sellDate,
        createdAt: serverTimestamp(),
        soldAt: serverTimestamp()
      });
    }
    setSellForm({id: null, quantity: '', price: '', date: ''});
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
        <span role="img" aria-label="stock">📊</span> Your Stocks
      </h2>
      {stocks.length === 0 ? (
        <div className="bg-white rounded shadow p-4 text-center text-gray-500">No stocks added yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stocks.map((stock) => {
            const totalInvested = stock.quantity * stock.buyPrice;
            const currentValue = stock.quantity * stock.currentPrice;
            const gainLoss = currentValue - totalInvested;
            const gainLossPercentage = (gainLoss / totalInvested) * 100;
            const isProfit = gainLoss > 0;
            const isSold = stock.status === 'Sold';
            return (
              <div key={stock.id} className={`bg-white rounded-xl shadow-lg p-5 flex flex-col border-2 transition-all ${isSold ? 'border-green-400' : 'border-transparent'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🏦</span>
                  <span className="font-semibold text-gray-700 text-base">{stock.stockName}</span>
                  {isSold ? (
                    <span className="ml-2 px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-semibold">Sold</span>
                  ) : (
                    <span className="ml-2 px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-semibold">Holding</span>
                  )}
                </div>
                <div className="text-xs text-gray-600 mb-1"><span className="mr-1">🔢</span>Quantity: <span className="font-semibold">{stock.quantity}</span></div>
                <div className="text-xs text-gray-600 mb-1"><span className="mr-1">💸</span>Buy Price: <span className="font-semibold text-blue-700">₹{stock.buyPrice.toLocaleString()}</span></div>
                <div className="text-xs text-gray-600 mb-1"><span className="mr-1">💹</span>Current Price: <span className="font-semibold text-blue-700">₹{stock.currentPrice.toLocaleString()}</span></div>
                <div className="text-xs text-gray-600 mb-1"><span className="mr-1">📅</span>Buy Date: <span className="font-semibold">{stock.buyDate ? (stock.buyDate.seconds ? new Date(stock.buyDate.seconds * 1000).toLocaleDateString() : new Date(stock.buyDate).toLocaleDateString()) : 'N/A'}</span></div>
                <div className="text-xs text-gray-600 mb-1"><span className="mr-1">💰</span>Total Invested: <span className="font-semibold text-blue-700">₹{totalInvested.toFixed(2)}</span></div>
                <div className="text-xs text-gray-600 mb-1"><span className="mr-1">💵</span>Current Value: <span className="font-semibold text-blue-700">₹{currentValue.toFixed(2)}</span></div>
                <div className="text-xs text-gray-600 mb-1">
                  <span className="mr-1">{isProfit ? '📈' : '📉'}</span>Gain/Loss: <span className={`font-semibold ${isProfit ? 'text-green-700' : 'text-red-700'}`}>₹{gainLoss.toFixed(2)} ({gainLossPercentage.toFixed(2)}%)</span>
                </div>
                {isSold && stock.sellQuantity && (
                  <div className="text-xs text-gray-600 mb-1"><span className="mr-1">💸</span>Sold: <span className="font-semibold">{stock.sellQuantity}</span> @ ₹{stock.sellPrice} on {stock.sellDate ? (stock.sellDate.seconds ? new Date(stock.sellDate.seconds * 1000).toLocaleDateString() : new Date(stock.sellDate).toLocaleDateString()) : 'N/A'}</div>
                )}
                <div className="flex gap-2 mt-2">
                  {!isSold && (
                    sellForm.id === stock.id ? (
                      <>
                        <input type="number" name="quantity" value={sellForm.quantity} onChange={handleSellChange} min="1" max={stock.quantity} className="border p-1 rounded w-20 text-xs" placeholder="Qty" />
                        <input type="number" name="price" value={sellForm.price} onChange={handleSellChange} min="0" className="border p-1 rounded w-24 text-xs" placeholder="Sell Price" />
                        <input type="date" name="date" value={sellForm.date} onChange={handleSellChange} className="border p-1 rounded w-32 text-xs" />
                        <button onClick={() => handleSellSubmit(stock)} className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs" title="Confirm Sell">✅ Confirm</button>
                        <button onClick={() => setSellForm({id: null, quantity: '', price: '', date: ''})} className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs" title="Cancel">❌ Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => handleSellClick(stock)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs" title="Sell Stock">💰 Sell</button>
                    )
                  )}
                  <button onClick={() => deleteStock(stock.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs" title="Delete Stock">🗑️ Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StockList;
