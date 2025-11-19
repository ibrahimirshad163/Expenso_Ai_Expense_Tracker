// src/pages/DebtsOwedToMePage.js
import React, {useState, useEffect, useRef} from 'react';
import {db} from '../firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  Timestamp
} from 'firebase/firestore';

const DebtsOwedToMePage = ({user}) => {
  const [debts, setDebts] = useState([]);
  const [formData, setFormData] = useState({amount: '', debtorName: '', dueDate: '', note: ''});
  const [editId, setEditId] = useState(null);
  const [message, setMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const messageRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'debtsOwedToMe'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      const data = [];
      snapshot.forEach(doc => data.push({id: doc.id, ...doc.data()}));
      setDebts(data);
    }, error => console.error('Error fetching debts owed to me:', error));

    return () => unsubscribe();
  }, [user]);

  const showMessage = (msg) => {
    setMessage(msg);
    if (messageRef.current) clearTimeout(messageRef.current);
    messageRef.current = setTimeout(() => setMessage(''), 4000);
  };

  const handleInputChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  const handleAddDebt = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'users', user.uid, 'debtsOwedToMe'), {
        amount: parseFloat(formData.amount),
        debtorName: formData.debtorName,
        dueDate: formData.dueDate,
        note: formData.note,
        status: 'pending',
        createdAt: Timestamp.now()
      });
      setFormData({amount: '', debtorName: '', dueDate: '', note: ''});
      setShowAddForm(false);
      showMessage('Debt added successfully!');
    } catch (error) {
      console.error('Error adding debt:', error);
      showMessage('Error adding debt.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this debt?')) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'debtsOwedToMe', id));
        showMessage('Debt deleted successfully!');
      } catch (error) {
        console.error('Error deleting debt:', error);
      }
    }
  };

  const startEditing = (debt) => {
    setEditId(debt.id);
    setShowAddForm(true);
    setFormData({
      amount: debt.amount,
      debtorName: debt.debtorName || '',
      dueDate: debt.dueDate || '',
      note: debt.note || ''
    });
  };

  const saveEdit = async () => {
    try {
      await updateDoc(doc(db, 'users', user.uid, 'debtsOwedToMe', editId), {
        amount: parseFloat(formData.amount),
        debtorName: formData.debtorName,
        dueDate: formData.dueDate,
        note: formData.note
      });
      setEditId(null);
      setFormData({amount: '', debtorName: '', dueDate: '', note: ''});
      setShowAddForm(false);
      showMessage('Debt updated successfully!');
    } catch (error) {
      console.error('Error updating debt:', error);
    }
  };

  const cancelEdit = () => {
    setEditId(null);
    setFormData({amount: '', debtorName: '', dueDate: '', note: ''});
    setShowAddForm(false);
  };

  const markAsCleared = async (id) => {
    try {
      await updateDoc(doc(db, 'users', user.uid, 'debtsOwedToMe', id), {
        status: 'cleared',
        clearedAt: Timestamp.now()
      });
      showMessage('Marked as cleared!');
    } catch (error) {
      console.error('Error marking as cleared:', error);
    }
  };

  const getTotalDebt = () => {
    return debts.filter(debt => debt.status !== 'cleared').reduce((total, debt) => total + debt.amount, 0);
  };

  const getClearedDebt = () => {
    return debts.filter(debt => debt.status === 'cleared').reduce((total, debt) => total + debt.amount, 0);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Debts Owed To Me</h1>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            Add New Debt
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            {message}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-sm font-medium text-gray-500">Total Outstanding</h3>
            <p className="text-2xl font-bold text-green-600">₹{getTotalDebt().toLocaleString()}</p>
            <p className="text-sm text-gray-400">{debts.filter(d => d.status !== 'cleared').length} debts</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-sm font-medium text-gray-500">Total Cleared</h3>
            <p className="text-2xl font-bold text-blue-600">₹{getClearedDebt().toLocaleString()}</p>
            <p className="text-sm text-gray-400">{debts.filter(d => d.status === 'cleared').length} debts</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-sm font-medium text-gray-500">Total Debts</h3>
            <p className="text-2xl font-bold text-purple-600">{debts.length}</p>
            <p className="text-sm text-gray-400">All time</p>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {editId ? 'Edit Debt' : 'Add New Debt Owed To You'}
            </h2>
            <form onSubmit={editId ? (e) => { e.preventDefault(); saveEdit(); } : handleAddDebt}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹)</label>
                  <input
                    type="number"
                    name="amount"
                    placeholder="Enter amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Debtor's Name</label>
                  <input
                    type="text"
                    name="debtorName"
                    placeholder="Who owes you money?"
                    value={formData.debtorName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <input
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Note (Optional)</label>
                  <input
                    type="text"
                    name="note"
                    placeholder="Add a note"
                    value={formData.note}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  {editId ? 'Update Debt' : 'Add Debt'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Debts List */}
        <div className="bg-white rounded-xl shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Money Owed To You</h2>
          </div>
          <div className="p-6">
            {debts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-6xl mb-4">💰</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No debts recorded</h3>
                <p className="text-gray-500 mb-4">Start by adding money that someone owes you.</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Add Your First Debt
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {debts.map(debt => (
                  <div
                    key={debt.id}
                    className={`p-4 border rounded-lg ${
                      debt.status === 'cleared' ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            ₹{debt.amount.toLocaleString()}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              debt.status === 'cleared'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {debt.status === 'cleared' ? 'Cleared' : 'Pending'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Debtor:</span> {debt.debtorName || 'Unknown'}
                          </div>
                          <div>
                            <span className="font-medium">Due:</span> {debt.dueDate || 'N/A'}
                          </div>
                          {debt.note && (
                            <div>
                              <span className="font-medium">Note:</span> {debt.note}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        {debt.status !== 'cleared' && (
                          <button
                            onClick={() => markAsCleared(debt.id)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Mark Cleared
                          </button>
                        )}
                        <button
                          onClick={() => startEditing(debt)}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(debt.id)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebtsOwedToMePage;
