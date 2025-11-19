import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {db} from '../firebase';
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  where,
  Timestamp
} from 'firebase/firestore';

const BudgetPage = ({user}) => {
  const [budget, setBudget] = useState('');
  const [currentBudget, setCurrentBudget] = useState(null);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Memoize current month to prevent recalculation
  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);

  // Memoize expensive calculations
  const budgetStats = useMemo(() => {
    const remaining = currentBudget !== null ? (currentBudget - totalExpenses) : 0;
    const isOverBudget = remaining < 0;
    const budgetPercentage = currentBudget ? (totalExpenses / currentBudget) * 100 : 0;
    
    return {
      remaining: remaining.toFixed(2),
      isOverBudget,
      budgetPercentage: budgetPercentage.toFixed(1),
      formattedBudget: currentBudget !== null ? currentBudget.toFixed(2) : '0.00',
      formattedExpenses: totalExpenses.toFixed(2)
    };
  }, [currentBudget, totalExpenses]);

  // Debounced budget input handler
  const handleBudgetChange = useCallback((e) => {
    const value = e.target.value;
    // Only allow positive numbers with up to 2 decimal places
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setBudget(value);
    }
  }, []);

  // Optimized submit handler with useCallback
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    
    if (!budget.trim()) {
      setError('Budget amount is required.');
      return;
    }
    
    const budgetAmount = parseFloat(budget);
    if (isNaN(budgetAmount) || budgetAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    setSaving(true);
    try {
      const userId = user.uid;
      await setDoc(doc(db, `users/${userId}/budget/${currentMonth}`), {
        amount: budgetAmount,
        createdAt: Timestamp.now()
      });
      setBudget('');
      setMessage('Budget set successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error setting budget:', error);
      setMessage('Error setting budget. Please try again.');
      setTimeout(() => setMessage(''), 3000);
    }
    setSaving(false);
  }, [budget, user, currentMonth]);

  // Optimized effect with better error handling
  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    const userId = user.uid;

    // Listen to budget doc for current month
    const budgetRef = doc(db, `users/${userId}/budget/${currentMonth}`);
    const unsubscribeBudget = onSnapshot(budgetRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCurrentBudget(data.amount);
      } else {
        setCurrentBudget(null);
      }
    }, (error) => {
      console.error('Error listening to budget:', error);
      setError('Failed to load budget data.');
    });

    // Listen to expenses of current month with optimized query
    const startOfMonth = new Date(`${currentMonth}-01T00:00:00`);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const expensesRef = collection(db, `users/${userId}/expenses`);
    const expensesQuery = query(
      expensesRef,
      where('date', '>=', Timestamp.fromDate(startOfMonth)),
      where('date', '<', Timestamp.fromDate(endOfMonth))
    );

    const unsubscribeExpenses = onSnapshot(expensesQuery, (querySnapshot) => {
      let total = 0;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.amount && !isNaN(data.amount)) {
          total += parseFloat(data.amount);
        }
      });
      setTotalExpenses(total);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to expenses:', error);
      setError('Failed to load expense data.');
      setLoading(false);
    });

    return () => {
      unsubscribeBudget();
      unsubscribeExpenses();
    };
  }, [user, currentMonth]);

  // Memoized Summary component with better performance
  const Summary = useMemo(() => React.memo(({currentMonth, budgetStats}) => {
    const {remaining, isOverBudget, budgetPercentage, formattedBudget, formattedExpenses} = budgetStats;
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="text-gray-600 text-xs">Month</div>
            <div className="font-semibold">{currentMonth}</div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="text-gray-600 text-xs">Budget</div>
            <div className="font-semibold text-blue-600">₹{formattedBudget}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="text-gray-600 text-xs">Expenses</div>
            <div className="font-semibold text-orange-600">₹{formattedExpenses}</div>
          </div>
          <div className={`bg-white p-3 rounded-lg shadow-sm ${isOverBudget ? 'border-2 border-red-300' : ''}`}>
            <div className="text-gray-600 text-xs">Remaining</div>
            <div className={`font-bold ${isOverBudget ? 'text-red-600 animate-pulse' : 'text-green-600'}`}>
              ₹{remaining}
            </div>
          </div>
        </div>
        {budgetStats.formattedBudget !== '0.00' && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-gray-600 text-xs mb-1">Budget Usage</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  budgetPercentage > 100 ? 'bg-red-500' : 
                  budgetPercentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{width: `${Math.min(budgetPercentage, 100)}%`}}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">{budgetPercentage}% used</div>
          </div>
        )}
      </div>
    );
  }), []);

  // Memoized BudgetForm component
  const BudgetForm = useMemo(() => React.memo(({budget, handleBudgetChange, handleSubmit, saving, error, message}) => (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <input
          value={budget}
          onChange={handleBudgetChange}
          placeholder="Set Budget Amount"
          type="text"
          className="flex-1 border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
          min="0"
          step="0.01"
          disabled={saving}
        />
        <button 
          type="submit" 
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            saving 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
          } text-white shadow-sm`}
          disabled={saving}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Saving...
            </span>
          ) : (
            'Set Budget'
          )}
        </button>
      </div>
      {message && (
        <div className="p-2 bg-green-100 border border-green-300 text-green-700 rounded-lg text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="p-2 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
    </form>
  )), []);

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">
          💰 Monthly Budget
        </h2>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600">Loading budget data...</span>
          </div>
        ) : (
          <div className="space-y-6">
            <Summary currentMonth={currentMonth} budgetStats={budgetStats} />
            <BudgetForm 
              budget={budget}
              handleBudgetChange={handleBudgetChange}
              handleSubmit={handleSubmit}
              saving={saving}
              error={error}
              message={message}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetPage;
