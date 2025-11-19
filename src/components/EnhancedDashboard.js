import React, {useEffect, useState} from 'react';
import {db} from '../firebase';
import {collection, getDocs} from 'firebase/firestore';
import dayjs from 'dayjs';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from 'recharts';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7f50', '#00bfff', '#ff69b4', '#32cd32', '#ff6347', '#9370db', '#20b2aa'];

const Dashboard = (props) => {
  const [dashboardData, setDashboardData] = useState({
    monthlyExpenses: [],
    categoryBreakdown: [],
    dailySpending: [],
    weeklyTrends: [],
    totalStats: {
      totalExpenses: 0,
      totalDebts: 0,
      totalInvestments: 0,
      monthlyAverage: 0
    },
    upcomingDues: [],
    topCategories: [],
    spendingTrends: []
  });

  const [timeRange, setTimeRange] = useState('month'); // month, quarter, year
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComprehensiveData = async () => {
      if (!props?.user?.uid) return;
      setLoading(true);

      try {
        // Get date range based on selection
        const now = dayjs();
        let startDate, endDate;
        
        switch(timeRange) {
          case 'month':
            startDate = now.startOf('month');
            endDate = now.endOf('month');
            break;
          case 'quarter':
            startDate = now.startOf('quarter');
            endDate = now.endOf('quarter');
            break;
          case 'year':
            startDate = now.startOf('year');
            endDate = now.endOf('year');
            break;
          default:
            startDate = now.startOf('month');
            endDate = now.endOf('month');
        }

        // Fetch expenses with proper collection path
        const expensesRef = collection(db, 'users', props.user.uid, 'expenses');
        const expensesSnapshot = await getDocs(expensesRef);
        const allExpenses = expensesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date)
        }));

        // Filter expenses by date range
        const filteredExpenses = allExpenses.filter(exp => {
          const expDate = dayjs(exp.date);
          return expDate.isAfter(startDate) && expDate.isBefore(endDate);
        });

        // Calculate category breakdown with percentages
        const categoryMap = {};
        const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        
        filteredExpenses.forEach(exp => {
          const category = exp.category || 'Uncategorized';
          if (!categoryMap[category]) categoryMap[category] = 0;
          categoryMap[category] += exp.amount || 0;
        });

        const categoryBreakdown = Object.entries(categoryMap).map(([category, amount]) => ({
          name: category,
          value: amount,
          percentage: totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : 0
        })).sort((a, b) => b.value - a.value);

        // Calculate daily spending for the current month
        const dailyMap = {};
        const monthExpenses = allExpenses.filter(exp => 
          dayjs(exp.date).format('YYYY-MM') === now.format('YYYY-MM')
        );
        
        monthExpenses.forEach(exp => {
          const day = dayjs(exp.date).format('DD');
          if (!dailyMap[day]) dailyMap[day] = 0;
          dailyMap[day] += exp.amount || 0;
        });

        const dailySpending = Object.entries(dailyMap)
          .map(([day, amount]) => ({
            day: parseInt(day),
            amount,
            date: `${now.format('YYYY-MM')}-${day.padStart(2, '0')}`
          }))
          .sort((a, b) => a.day - b.day);

        // Calculate monthly trends for the past 6 months
        const monthlyTrends = [];
        for (let i = 5; i >= 0; i--) {
          const month = now.subtract(i, 'month');
          const monthKey = month.format('YYYY-MM');
          const monthExpenses = allExpenses.filter(exp => 
            dayjs(exp.date).format('YYYY-MM') === monthKey
          );
          const monthTotal = monthExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
          
          monthlyTrends.push({
            month: month.format('MMM YYYY'),
            amount: monthTotal,
            count: monthExpenses.length
          });
        }

        // Fetch other financial data
        const debtsRef = collection(db, 'users', props.user.uid, 'debtsOwedByMe');
        const debtsSnapshot = await getDocs(debtsRef);
        const totalDebts = debtsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

        const sipsRef = collection(db, 'users', props.user.uid, 'sips');
        const sipsSnapshot = await getDocs(sipsRef);
        const totalSIPs = sipsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().monthlyAmount || 0), 0);

        const stocksRef = collection(db, 'users', props.user.uid, 'stocks');
        const stocksSnapshot = await getDocs(stocksRef);
        const totalStocks = stocksSnapshot.docs.reduce((sum, doc) => sum + (doc.data().investedAmount || 0), 0);

        // Calculate upcoming dues
        const upcomingDues = await calculateUpcomingDues(props.user.uid);

        setDashboardData({
          monthlyExpenses: monthlyTrends,
          categoryBreakdown,
          dailySpending,
          totalStats: {
            totalExpenses,
            totalDebts,
            totalInvestments: totalSIPs + totalStocks,
            monthlyAverage: monthlyTrends.length > 0 ? 
              monthlyTrends.reduce((sum, m) => sum + m.amount, 0) / monthlyTrends.length : 0
          },
          upcomingDues,
          topCategories: categoryBreakdown.slice(0, 5)
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchComprehensiveData();
  }, [props.user, timeRange]);

  const calculateUpcomingDues = async (userId) => {
    const upcomingDues = [];
    const today = dayjs();
    const next30Days = today.add(30, 'day');

    try {
      // Check violations
      const violationsRef = collection(db, 'users', userId, 'violations');
      const violationsSnapshot = await getDocs(violationsRef);
      violationsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const dueDate = data.dueDate?.toDate ? data.dueDate.toDate() : new Date(data.dueDate);
        if (dayjs(dueDate).isAfter(today) && dayjs(dueDate).isBefore(next30Days)) {
          upcomingDues.push({
            type: 'Violation',
            description: data.violationType || 'Traffic Violation',
            amount: data.fineAmount || 0,
            dueDate: dayjs(dueDate).format('DD MMM YYYY'),
            urgency: dayjs(dueDate).diff(today, 'days') <= 7 ? 'high' : 'medium'
          });
        }
      });

      // Check loans
      const loansRef = collection(db, 'users', userId, 'loans');
      const loansSnapshot = await getDocs(loansRef);
      loansSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const dueDate = data.dueDate?.toDate ? data.dueDate.toDate() : new Date(data.dueDate);
        if (dayjs(dueDate).isAfter(today) && dayjs(dueDate).isBefore(next30Days)) {
          upcomingDues.push({
            type: 'Loan',
            description: data.loanOrganizationName || 'Loan Payment',
            amount: data.loanAmount || 0,
            dueDate: dayjs(dueDate).format('DD MMM YYYY'),
            urgency: dayjs(dueDate).diff(today, 'days') <= 7 ? 'high' : 'medium'
          });
        }
      });

    } catch (error) {
      console.error('Error fetching upcoming dues:', error);
    }

    return upcomingDues.sort((a, b) => dayjs(a.dueDate).diff(dayjs(b.dueDate)));
  };

  const exportData = (type) => {
    let dataToExport = [];
    let filename = '';

    switch(type) {
      case 'expenses':
        dataToExport = dashboardData.categoryBreakdown.map(item => ({
          Category: item.name,
          Amount: item.value,
          Percentage: item.percentage + '%'
        }));
        filename = 'expense_breakdown.csv';
        break;
      case 'monthly':
        dataToExport = dashboardData.monthlyExpenses.map(item => ({
          Month: item.month,
          Amount: item.amount,
          'Number of Transactions': item.count
        }));
        filename = 'monthly_trends.csv';
        break;
      case 'summary':
        dataToExport = [{
          'Total Expenses': dashboardData.totalStats.totalExpenses,
          'Total Debts': dashboardData.totalStats.totalDebts,
          'Total Investments': dashboardData.totalStats.totalInvestments,
          'Monthly Average': dashboardData.totalStats.monthlyAverage.toFixed(2)
        }];
        filename = 'financial_summary.csv';
        break;
      default:
        console.warn(`No export logic defined for type: ${type}`);
        return;
    }

    const csvContent = convertToCSV(dataToExport);
    downloadCSV(csvContent, filename);
  };

  const convertToCSV = (data) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(header => row[header]).join(','))
    ];
    
    return csvRows.join('\n');
  };

  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex gap-4">
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
            <div className="flex gap-2">
              <button 
                onClick={() => exportData('expenses')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Export Expenses
              </button>
              <button 
                onClick={() => exportData('monthly')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Export Trends
              </button>
              <button 
                onClick={() => exportData('summary')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Export Summary
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-sm font-medium text-gray-500">Total Expenses</h3>
            <p className="text-2xl font-bold text-red-600">₹{dashboardData.totalStats.totalExpenses.toLocaleString()}</p>
            <p className="text-sm text-gray-400">Current period</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-sm font-medium text-gray-500">Total Debts</h3>
            <p className="text-2xl font-bold text-orange-600">₹{dashboardData.totalStats.totalDebts.toLocaleString()}</p>
            <p className="text-sm text-gray-400">Outstanding</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-sm font-medium text-gray-500">Investments</h3>
            <p className="text-2xl font-bold text-green-600">₹{dashboardData.totalStats.totalInvestments.toLocaleString()}</p>
            <p className="text-sm text-gray-400">SIPs + Stocks</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-sm font-medium text-gray-500">Monthly Average</h3>
            <p className="text-2xl font-bold text-blue-600">₹{dashboardData.totalStats.monthlyAverage.toLocaleString()}</p>
            <p className="text-sm text-gray-400">Last 6 months</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Category Breakdown Pie Chart */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Expense Breakdown by Category</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  dataKey="value"
                  data={dashboardData.categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({name, percentage}) => `${name}: ${percentage}%`}
                >
                  {dashboardData.categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Trends Line Chart */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Monthly Spending Trends</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dashboardData.monthlyExpenses}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']} />
                <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Spending and Top Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Daily Spending Bar Chart */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Daily Spending (Current Month)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData.dailySpending}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']} />
                <Bar dataKey="amount" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Categories Bar Chart */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Top 5 Spending Categories</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData.topCategories} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip formatter={(value, name) => [`₹${value.toLocaleString()}`, 'Amount']} />
                <Bar dataKey="value" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Dues */}
        {dashboardData.upcomingDues.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
            <h2 className="text-xl font-semibold mb-4">Upcoming Dues (Next 30 Days)</h2>
            <div className="space-y-3">
              {dashboardData.upcomingDues.map((due, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-lg border-l-4 ${
                    due.urgency === 'high' ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{due.type}: {due.description}</h3>
                      <p className="text-sm text-gray-600">Due: {due.dueDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">₹{due.amount.toLocaleString()}</p>
                      <span className={`text-xs px-2 py-1 rounded ${
                        due.urgency === 'high' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'
                      }`}>
                        {due.urgency === 'high' ? 'Urgent' : 'Upcoming'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financial Health Score */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Financial Health Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {dashboardData.totalStats.totalInvestments > dashboardData.totalStats.totalExpenses ? '🟢' : 
                 dashboardData.totalStats.totalInvestments > dashboardData.totalStats.totalExpenses * 0.5 ? '🟡' : '🔴'}
              </div>
              <h3 className="font-medium">Investment Ratio</h3>
              <p className="text-sm text-gray-600">
                {dashboardData.totalStats.totalExpenses > 0 ? 
                  ((dashboardData.totalStats.totalInvestments / dashboardData.totalStats.totalExpenses) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {dashboardData.totalStats.totalDebts < dashboardData.totalStats.totalExpenses * 0.3 ? '🟢' : 
                 dashboardData.totalStats.totalDebts < dashboardData.totalStats.totalExpenses * 0.6 ? '🟡' : '🔴'}
              </div>
              <h3 className="font-medium">Debt Level</h3>
              <p className="text-sm text-gray-600">
                {dashboardData.totalStats.totalExpenses > 0 ? 
                  ((dashboardData.totalStats.totalDebts / dashboardData.totalStats.totalExpenses) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {dashboardData.upcomingDues.length === 0 ? '🟢' : 
                 dashboardData.upcomingDues.length <= 3 ? '🟡' : '🔴'}
              </div>
              <h3 className="font-medium">Due Management</h3>
              <p className="text-sm text-gray-600">{dashboardData.upcomingDues.length} upcoming</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;