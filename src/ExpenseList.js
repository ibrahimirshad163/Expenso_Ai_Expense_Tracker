import React, {useState, useEffect, useRef} from 'react';
import {db} from './firebase';
import {collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc} from 'firebase/firestore';
import {Timestamp} from 'firebase/firestore';

const ExpenseList = ({user}) => {
  const [expenses, setExpenses] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({amount: '', category: '', date: '', note: ''});
  const [message, setMessage] = useState('');
  const messageRef = useRef(null);

  useEffect(() => {
    if (!user) {
      setExpenses([]);
      return;
    }

    const q = query(
      collection(db, 'users', user.uid, 'expenses'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const expensesArr = [];
        querySnapshot.forEach(doc => {
          const data = doc.data();
          expensesArr.push({
            id: doc.id,
            ...data,
            // Convert Firestore Timestamp to ISO date string for input fields and display
            date: data.date && data.date.toDate ? data.date.toDate().toISOString().slice(0, 10) : ''
          });
        });
        setExpenses(expensesArr);
      },
      (error) => {
        console.error('Error fetching expenses:', error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'expenses', id));
      showMessage('Expense deleted successfully!');
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const startEditing = (expense) => {
    setEditId(expense.id);
    setEditData({
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      note: expense.note || ''
    });
  };

  const handleEditChange = (e) => {
    setEditData({...editData, [e.target.name]: e.target.value});
  };

  const saveEdit = async () => {
    try {
      // Convert date string back to Firestore Timestamp
      const updatedDate = editData.date ? Timestamp.fromDate(new Date(editData.date)) : null;

      await updateDoc(doc(db, 'users', user.uid, 'expenses', editId), {
        amount: parseFloat(editData.amount),
        category: editData.category,
        date: updatedDate,
        note: editData.note
      });
      setEditId(null);
      setEditData({amount: '', category: '', date: '', note: ''});
      showMessage('Expense updated successfully!');
    } catch (error) {
      console.error('Error updating expense:', error);
    }
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditData({amount: '', category: '', date: '', note: ''});
  };

  const showMessage = (msg) => {
    setMessage(msg);
    if (messageRef.current) clearTimeout(messageRef.current);
    messageRef.current = setTimeout(() => setMessage(''), 6000);
  };

  if (expenses.length === 0) return <p>No expenses found.</p>;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
        <span role="img" aria-label="expense">💸</span> Your Expenses
      </h2>
      {message && <p className="text-green-600 mb-2 transition-opacity duration-500">{message}</p>}
      {expenses.length === 0 ? (
        <div className="bg-white rounded shadow p-4 text-center text-gray-500">No expenses found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {expenses.map((expense) => (
            <div key={expense.id} className="bg-white rounded-xl shadow-lg p-5 flex flex-col border-2 transition-all border-transparent">
              {editId === expense.id ? (
                <>
                  <div className="flex flex-col gap-2 mb-2">
                    <input type="number" name="amount" value={editData.amount} onChange={handleEditChange} className="border p-2 rounded w-28 focus:ring-2 focus:ring-blue-400 transition" />
                    <input type="text" name="category" value={editData.category} onChange={handleEditChange} className="border p-2 rounded w-32 focus:ring-2 focus:ring-blue-400 transition" />
                    <input type="date" name="date" value={editData.date} onChange={handleEditChange} className="border p-2 rounded w-36 focus:ring-2 focus:ring-blue-400 transition" />
                    <input type="text" name="note" value={editData.note} onChange={handleEditChange} className="border p-2 rounded w-40 focus:ring-2 focus:ring-blue-400 transition" />
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button onClick={saveEdit} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs" title="Save">💾 Save</button>
                    <button onClick={cancelEdit} className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs" title="Cancel">❌ Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">💰</span>
                    <span className="font-semibold text-gray-700 text-base">₹{expense.amount}</span>
                    <span className="ml-2 px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-semibold">{expense.category}</span>
                  </div>
                  <div className="text-xs text-gray-600 mb-1"><span className="mr-1">📅</span>Date: <span className="font-semibold">{expense.date}</span></div>
                  {expense.note && <div className="text-xs text-gray-600 mb-1"><span className="mr-1">📝</span>Note: <span className="font-semibold">{expense.note}</span></div>}
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => startEditing(expense)} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs" title="Edit">✏️ Edit</button>
                    <button onClick={() => handleDelete(expense.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs" title="Delete">🗑️ Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExpenseList;
