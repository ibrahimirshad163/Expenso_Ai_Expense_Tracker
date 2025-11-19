import React, {useEffect, useState, useCallback} from 'react';
import {db} from '../firebase';
import {collection, getDocs} from 'firebase/firestore';
import dayjs from 'dayjs';
import {
  ComposedChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, BarChart
} from 'recharts';

const AdvancedAnalytics = ({user}) => {
  const [analyticsData, setAnalyticsData] = useState({
    expenseVsIncome: [],
    categoryTrends: [],
    weeklyPatterns: [],
    monthlyComparison: [],
    debtToIncomeRatio: [],
    savingsRate: [],
    expenseDistribution: [],
    cashFlow: [],
    budgetPerformance: []
  });

  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [timeFrame, setTimeFrame] = useState('12months');
  const [loading, setLoading] = useState(true);

  const calculateAdvancedMetrics = useCallback((expenses, debts, sips, stocks, timeFrame) => {
    const now = dayjs();
    const months = timeFrame === '12months' ? 12 : timeFrame === '6months' ? 6 : 3;
    
    // Monthly analysis for the specified period
    const monthlyData = [];
    for (let i = months - 1; i >= 0; i--) {
      const month = now.subtract(i, 'month');
      const monthKey = month.format('YYYY-MM');
      
      const monthExpenses = expenses.filter(exp => 
        dayjs(exp.date).format('YYYY-MM') === monthKey
      );
      
      const totalExpenses = monthExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const totalInvestments = (sips.reduce((sum, sip) => sum + (sip.monthlyAmount || 0), 0) + 
                               stocks.reduce((sum, stock) => sum + (stock.investedAmount || 0), 0)) / months;
      
      // Calculate category breakdown for this month
      const categories = {};
      monthExpenses.forEach(exp => {
        const cat = exp.category || 'Other';
        categories[cat] = (categories[cat] || 0) + exp.amount;
      });

      monthlyData.push({
        month: month.format('MMM YYYY'),
        monthShort: month.format('MMM'),
        expenses: totalExpenses,
        investments: totalInvestments,
        savings: Math.max(0, totalInvestments - totalExpenses * 0.1), // Estimated savings
        netCashFlow: totalInvestments - totalExpenses,
        categories: Object.entries(categories).map(([name, value]) => ({name, value})),
        expenseCount: monthExpenses.length
      });
    }

    // Weekly patterns analysis
    const weeklyPatterns = Array.from({length: 7}, (_, i) => {
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i];
      const dayExpenses = expenses.filter(exp => dayjs(exp.date).day() === i);
      const avgAmount = dayExpenses.length > 0 ? 
        dayExpenses.reduce((sum, exp) => sum + exp.amount, 0) / dayExpenses.length : 0;
      
      return {
        day: dayName,
        dayShort: dayName.slice(0, 3),
        avgAmount: avgAmount,
        transactionCount: dayExpenses.length,
        totalAmount: dayExpenses.reduce((sum, exp) => sum + exp.amount, 0)
      };
    });

    // Category trends over time
    const allCategories = [...new Set(expenses.map(exp => exp.category || 'Other'))];
    const categoryTrends = allCategories.map(category => {
      const categoryData = monthlyData.map(month => {
        const categoryAmount = month.categories.find(cat => cat.name === category)?.value || 0;
        return {
          month: month.monthShort,
          amount: categoryAmount
        };
      });
      
      return {
        category,
        data: categoryData,
        total: categoryData.reduce((sum, item) => sum + item.amount, 0),
        trend: calculateTrend(categoryData.map(item => item.amount))
      };
    }).sort((a, b) => b.total - a.total).slice(0, 6);

    // Expense distribution analysis
    const expenseDistribution = expenses.reduce((acc, exp) => {
      const amount = exp.amount || 0;
      let range;
      if (amount < 100) range = '₹0-100';
      else if (amount < 500) range = '₹100-500';
      else if (amount < 1000) range = '₹500-1K';
      else if (amount < 5000) range = '₹1K-5K';
      else if (amount < 10000) range = '₹5K-10K';
      else range = '₹10K+';
      
      acc[range] = (acc[range] || 0) + 1;
      return acc;
    }, {});

    const distributionData = Object.entries(expenseDistribution).map(([range, count]) => ({
      range,
      count,
      percentage: ((count / expenses.length) * 100).toFixed(1)
    }));

    // Budget performance (assuming monthly budget of average spending)
    const avgMonthlySpending = monthlyData.reduce((sum, month) => sum + month.expenses, 0) / monthlyData.length;
    const budgetPerformance = monthlyData.map(month => ({
      month: month.monthShort,
      budget: avgMonthlySpending,
      actual: month.expenses,
      variance: month.expenses - avgMonthlySpending,
      performance: ((avgMonthlySpending - month.expenses) / avgMonthlySpending * 100).toFixed(1)
    }));

    return {
      expenseVsIncome: monthlyData,
      categoryTrends,
      weeklyPatterns,
      monthlyComparison: monthlyData,
      expenseDistribution: distributionData,
      cashFlow: monthlyData.map(m => ({
        month: m.monthShort,
        inflow: m.investments,
        outflow: m.expenses,
        net: m.netCashFlow
      })),
      budgetPerformance
    };
  }, []);

  const calculateTrend = (data) => {
    if (data.length < 2) return 'stable';
    const recent = data.slice(-3).reduce((sum, val) => sum + val, 0) / 3;
    const earlier = data.slice(0, 3).reduce((sum, val) => sum + val, 0) / 3;
    
    if (recent > earlier * 1.1) return 'increasing';
    if (recent < earlier * 0.9) return 'decreasing';
    return 'stable';
  };

  useEffect(() => {
    const fetchAdvancedAnalytics = async () => {
      if (!user?.uid) return;
      setLoading(true);

      try {
        // Fetch all financial data
        const [expenses, debts, sips, stocks] = await Promise.all([
          getDocs(collection(db, 'users', user.uid, 'expenses')),
          getDocs(collection(db, 'users', user.uid, 'debtsOwedByMe')),
          getDocs(collection(db, 'users', user.uid, 'sips')),
          getDocs(collection(db, 'users', user.uid, 'stocks'))
        ]);

        const expenseData = expenses.docs.map(doc => ({
          ...doc.data(),
          date: doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date)
        }));

        const debtData = debts.docs.map(doc => doc.data());
        const sipData = sips.docs.map(doc => doc.data());
        const stockData = stocks.docs.map(doc => doc.data());

        // Calculate time-based analytics
        const analytics = calculateAdvancedMetrics(expenseData, debtData, sipData, stockData, timeFrame);
        setAnalyticsData(analytics);

      } catch (error) {
        console.error('Error fetching advanced analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdvancedAnalytics();
  }, [user, timeFrame, calculateAdvancedMetrics]);

  const exportAdvancedReport = () => {
    const reportData = {
      summary: {
        totalExpenses: analyticsData.expenseVsIncome.reduce((sum, m) => sum + m.expenses, 0),
        totalInvestments: analyticsData.expenseVsIncome.reduce((sum, m) => sum + m.investments, 0),
        avgMonthlyCashFlow: analyticsData.cashFlow.reduce((sum, m) => sum + m.net, 0) / analyticsData.cashFlow.length,
        topSpendingDay: analyticsData.weeklyPatterns.reduce((max, day) => day.avgAmount > max.avgAmount ? day : max, {avgAmount: 0})
      },
      monthlyBreakdown: analyticsData.expenseVsIncome,
      categoryAnalysis: analyticsData.categoryTrends,
      weeklyPatterns: analyticsData.weeklyPatterns,
      budgetPerformance: analyticsData.budgetPerformance
    };

    const jsonContent = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `advanced_financial_report_${dayjs().format('YYYY-MM-DD')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Generating advanced analytics...</div>
      </div>
    );
  }

  const renderMetricView = () => {
    switch(selectedMetric) {
      case 'cashflow':
        return (
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Cash Flow Analysis</h2>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={analyticsData.cashFlow}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']} />
                <Legend />
                <Bar dataKey="inflow" fill="#82ca9d" name="Investments (Inflow)" />
                <Bar dataKey="outflow" fill="#ff7f50" name="Expenses (Outflow)" />
                <Line type="monotone" dataKey="net" stroke="#8884d8" strokeWidth={3} name="Net Cash Flow" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        );

      case 'trends':
        return (
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Category Spending Trends</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {analyticsData.categoryTrends.slice(0, 4).map((category, index) => (
                <div key={category.category} className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2 flex items-center justify-between">
                    {category.category}
                    <span className={`text-xs px-2 py-1 rounded ${
                      category.trend === 'increasing' ? 'bg-red-100 text-red-800' :
                      category.trend === 'decreasing' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {category.trend}
                    </span>
                  </h3>
                  <ResponsiveContainer width="100%" height={150}>
                    <AreaChart data={category.data}>
                      <Area type="monotone" dataKey="amount" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                      <XAxis dataKey="month" />
                      <YAxis hide />
                      <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          </div>
        );

      case 'patterns':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Weekly Spending Patterns</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.weeklyPatterns}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dayShort" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Average Amount']} />
                  <Bar dataKey="avgAmount" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Expense Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.expenseDistribution} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="range" type="category" width={80} />
                  <Tooltip formatter={(value) => [`${value} transactions`, 'Count']} />
                  <Bar dataKey="count" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case 'budget':
        return (
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Budget vs Actual Performance</h2>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={analyticsData.budgetPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value, name) => {
                  if (name === 'Performance') return [`${value}%`, 'Performance'];
                  return [`₹${value.toLocaleString()}`, name];
                }} />
                <Legend />
                <Bar dataKey="budget" fill="#82ca9d" name="Budget" />
                <Bar dataKey="actual" fill="#ff7f50" name="Actual Spending" />
                <Line type="monotone" dataKey="performance" stroke="#8884d8" strokeWidth={2} name="Performance %" />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {analyticsData.budgetPerformance.slice(-3).map((month, index) => (
                <div key={month.month} className={`p-3 rounded-lg ${
                  parseFloat(month.performance) > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <h4 className="font-medium">{month.month}</h4>
                  <p className="text-sm text-gray-600">
                    {parseFloat(month.performance) > 0 ? 'Under budget by' : 'Over budget by'} {Math.abs(month.performance)}%
                  </p>
                  <p className="text-xs text-gray-500">₹{Math.abs(month.variance).toLocaleString()} variance</p>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Expenses vs Investments</h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analyticsData.expenseVsIncome}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthShort" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']} />
                  <Legend />
                  <Area type="monotone" dataKey="expenses" stackId="1" stroke="#ff7f50" fill="#ff7f50" fillOpacity={0.6} name="Expenses" />
                  <Area type="monotone" dataKey="investments" stackId="2" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} name="Investments" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Monthly Financial Overview</h2>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={analyticsData.monthlyComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthShort" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']} />
                  <Legend />
                  <Bar dataKey="expenses" fill="#ff7f50" name="Expenses" />
                  <Line type="monotone" dataKey="netCashFlow" stroke="#8884d8" strokeWidth={3} name="Net Cash Flow" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Advanced Financial Analytics</h1>
          <div className="flex flex-wrap gap-4">
            <select 
              value={timeFrame} 
              onChange={(e) => setTimeFrame(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="12months">Last 12 Months</option>
            </select>
            <button 
              onClick={exportAdvancedReport}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Export Advanced Report
            </button>
          </div>
        </div>

        {/* Metric Selection */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            {key: 'overview', label: 'Overview'},
            {key: 'cashflow', label: 'Cash Flow'},
            {key: 'trends', label: 'Category Trends'},
            {key: 'patterns', label: 'Spending Patterns'},
            {key: 'budget', label: 'Budget Analysis'}
          ].map(metric => (
            <button
              key={metric.key}
              onClick={() => setSelectedMetric(metric.key)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedMetric === metric.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              {metric.label}
            </button>
          ))}
        </div>

        {/* Analytics Content */}
        {renderMetricView()}

        {/* Quick Insights */}
        <div className="mt-8 bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Quick Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900">Highest Spending Day</h3>
              <p className="text-lg font-bold text-blue-700">
                {analyticsData.weeklyPatterns.reduce((max, day) => 
                  day.avgAmount > max.avgAmount ? day : max, {day: 'N/A', avgAmount: 0}
                ).day}
              </p>
              <p className="text-sm text-blue-600">
                Avg: ₹{analyticsData.weeklyPatterns.reduce((max, day) => 
                  day.avgAmount > max.avgAmount ? day : max, {avgAmount: 0}
                ).avgAmount.toLocaleString()}
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-900">Best Savings Month</h3>
              <p className="text-lg font-bold text-green-700">
                {analyticsData.expenseVsIncome.reduce((max, month) => 
                  month.savings > max.savings ? month : max, {monthShort: 'N/A', savings: 0}
                ).monthShort}
              </p>
              <p className="text-sm text-green-600">
                Saved: ₹{analyticsData.expenseVsIncome.reduce((max, month) => 
                  month.savings > max.savings ? month : max, {savings: 0}
                ).savings.toLocaleString()}
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-medium text-purple-900">Most Common Expense</h3>
              <p className="text-lg font-bold text-purple-700">
                {analyticsData.expenseDistribution.reduce((max, range) => 
                  range.count > max.count ? range : max, {range: 'N/A', count: 0}
                ).range}
              </p>
              <p className="text-sm text-purple-600">
                {analyticsData.expenseDistribution.reduce((max, range) => 
                  range.count > max.count ? range : max, {percentage: 0}
                ).percentage}% of transactions
              </p>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-lg">
              <h3 className="font-medium text-orange-900">Avg Monthly Variance</h3>
              <p className="text-lg font-bold text-orange-700">
                ₹{analyticsData.budgetPerformance.length > 0 ? 
                  Math.abs(analyticsData.budgetPerformance.reduce((sum, month) => 
                    sum + Math.abs(month.variance), 0) / analyticsData.budgetPerformance.length
                  ).toLocaleString() : '0'}
              </p>
              <p className="text-sm text-orange-600">From budget target</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalytics;