import React, {useState, useEffect} from 'react';
import './App.css';
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import Login from './Login';
import Logout from './Logout';
import Navbar from './components/Navbar';
import ExpensesPage from './pages/ExpensesPage';
import DebtsOwedByMePage from './pages/DebtsOwedByMePage';
import DebtsOwedToMePage from './pages/DebtsOwedToMePage';
import BudgetPage from './pages/BudgetPage';
import LoanPendingPage from './pages/LoanPendingPage';
import SIPPage from './pages/SIPPage';
import StocksPage from './pages/StocksPage';
import TaxPage from './pages/TaxPage';
import ViolationPage from './pages/ViolationPage';
import EnhancedDashboard from './components/EnhancedDashboard';
import AdvancedAnalytics from './components/AdvancedAnalytics';
import ReportGenerator from './components/ReportGenerator';
import {auth} from './firebase';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="App">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="App">
        <Login />
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Logout />
        <Navbar />
        <Routes>
          <Route path="/" element={<EnhancedDashboard user={user} />} />
          <Route path="/enhanced-dashboard" element={<EnhancedDashboard user={user} />} />
          <Route path="/analytics" element={<AdvancedAnalytics user={user} />} />
          <Route path="/reports" element={<ReportGenerator user={user} />} />
          <Route path="/expenses" element={<ExpensesPage user={user} />} />
          <Route path="/debts-owed-by-me" element={<DebtsOwedByMePage user={user} />} />
          <Route path="/debts-owed-to-me" element={<DebtsOwedToMePage user={user} />} />
          <Route path="/budget" element={<BudgetPage user={user} />} />
          <Route path="/loan-pending" element={<LoanPendingPage user={user} />} />
          <Route path="/sip" element={<SIPPage user={user} />} />
          <Route path="/stocks" element={<StocksPage user={user} />} />
          <Route path="/tax" element={<TaxPage user={user} />} />
          <Route path="/violations" element={<ViolationPage user={user} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;