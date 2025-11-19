import React from 'react';
import {Link} from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="bg-gray-800 text-white p-4 shadow-lg">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between">
          <Link to="/" className="flex flex-col leading-tight text-blue-400 hover:text-blue-300">
            <span className="text-2xl font-extrabold">Expenso</span>
            <span className="text-base font-medium">tracker</span>
          </Link>
          <div className="flex flex-wrap gap-6 text-sm">
            <Link to="/enhanced-dashboard" className="hover:text-blue-400 transition-colors">Enhanced Dashboard</Link>
            <Link to="/analytics" className="hover:text-blue-400 transition-colors">Analytics</Link>
            <Link to="/reports" className="hover:text-blue-400 transition-colors">Reports</Link>
            <Link to="/expenses" className="hover:text-blue-400 transition-colors">Expenses</Link>
            <Link to="/debts-owed-by-me" className="hover:text-blue-400 transition-colors">Debts Owed</Link>
            <Link to="/debts-owed-to-me" className="hover:text-blue-400 transition-colors">Debts Owed To Me</Link>
            <Link to="/budget" className="hover:text-blue-400 transition-colors">Budget</Link>
            <Link to="/loan-pending" className="hover:text-blue-400 transition-colors">Loans</Link>
            <Link to="/sip" className="hover:text-blue-400 transition-colors">SIPs</Link>
            <Link to="/stocks" className="hover:text-blue-400 transition-colors">Stocks</Link>
            <Link to="/tax" className="hover:text-blue-400 transition-colors">Tax</Link>
            <Link to="/violations" className="hover:text-blue-400 transition-colors">Violations</Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
