import React, {useState, useEffect, useCallback} from 'react';
import {db} from '../firebase';
import {collection, getDocs} from 'firebase/firestore';
import dayjs from 'dayjs';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const ReportGenerator = ({user}) => {
  const [reportData, setReportData] = useState(null);
  const [reportType, setReportType] = useState('monthly');
  const [dateRange, setDateRange] = useState({
    start: dayjs().subtract(1, 'month').format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD')
  });
  const [loading, setLoading] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]);

  const fetchCategories = useCallback(async () => {
    try {
      const expensesRef = collection(db, 'users', user.uid, 'expenses');
      const snapshot = await getDocs(expensesRef);
      const categories = [...new Set(snapshot.docs.map(doc => doc.data().category).filter(Boolean))];
      setAllCategories(categories);
      setSelectedCategories(categories); // Select all by default
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [user, fetchCategories]);

  const generateReport = async () => {
    if (!user?.uid) return;
    setLoading(true);

    try {
      const startDate = dayjs(dateRange.start);
      const endDate = dayjs(dateRange.end);

      // Fetch all financial data
      const [expenses, debts, sips, stocks, loans, violations, taxes] = await Promise.all([
        getDocs(collection(db, 'users', user.uid, 'expenses')),
        getDocs(collection(db, 'users', user.uid, 'debtsOwedByMe')),
        getDocs(collection(db, 'users', user.uid, 'sips')),
        getDocs(collection(db, 'users', user.uid, 'stocks')),
        getDocs(collection(db, 'users', user.uid, 'loans')),
        getDocs(collection(db, 'users', user.uid, 'violations')),
        getDocs(collection(db, 'users', user.uid, 'taxes'))
      ]);

      // Process expenses
      const expenseData = expenses.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date)
      })).filter(exp => {
        const expDate = dayjs(exp.date);
        const inDateRange = expDate.isAfter(startDate.subtract(1, 'day')) && expDate.isBefore(endDate.add(1, 'day'));
        const inSelectedCategories = selectedCategories.includes(exp.category);
        return inDateRange && inSelectedCategories;
      });

      // Generate report based on type
      let report = {};
      switch(reportType) {
        case 'monthly':
          report = generateMonthlyReport(expenseData, debts.docs, sips.docs, stocks.docs, startDate, endDate);
          break;
        case 'category':
          report = generateCategoryReport(expenseData, startDate, endDate);
          break;
        case 'comprehensive':
          report = generateComprehensiveReport(
            expenseData, debts.docs, sips.docs, stocks.docs, 
            loans.docs, violations.docs, taxes.docs, startDate, endDate
          );
          break;
        case 'comparison':
          report = generateComparisonReport(expenseData, startDate, endDate);
          break;
        default:
          report = generateMonthlyReport(expenseData, debts.docs, sips.docs, stocks.docs, startDate, endDate);
      }

      setReportData(report);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyReport = (expenses, debts, sips, stocks, startDate, endDate) => {
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const totalDebts = debts.reduce((sum, debt) => sum + (debt.data().amount || 0), 0);
    const totalSIPs = sips.reduce((sum, sip) => sum + (sip.data().monthlyAmount || 0), 0);
    const totalStocks = stocks.reduce((sum, stock) => sum + (stock.data().investedAmount || 0), 0);

    // Category breakdown
    const categoryBreakdown = {};
    expenses.forEach(exp => {
      const category = exp.category || 'Uncategorized';
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + exp.amount;
    });

    const categoryData = Object.entries(categoryBreakdown).map(([name, value]) => ({
      name,
      value,
      percentage: totalExpenses > 0 ? ((value / totalExpenses) * 100).toFixed(1) : 0
    })).sort((a, b) => b.value - a.value);

    // Daily spending trend
    const dailySpending = {};
    expenses.forEach(exp => {
      const day = dayjs(exp.date).format('YYYY-MM-DD');
      dailySpending[day] = (dailySpending[day] || 0) + exp.amount;
    });

    const dailyData = Object.entries(dailySpending).map(([date, amount]) => ({
      date,
      amount,
      day: dayjs(date).format('DD MMM')
    })).sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));

    return {
      type: 'Monthly Report',
      period: `${startDate.format('DD MMM YYYY')} - ${endDate.format('DD MMM YYYY')}`,
      summary: {
        totalExpenses,
        totalDebts,
        totalInvestments: totalSIPs + totalStocks,
        transactionCount: expenses.length,
        avgDailySpending: totalExpenses / Math.max(1, endDate.diff(startDate, 'days')),
        netWorth: (totalSIPs + totalStocks) - totalDebts
      },
      categoryBreakdown: categoryData,
      dailySpending: dailyData,
      topExpenses: expenses.sort((a, b) => b.amount - a.amount).slice(0, 10),
      insights: generateInsights(expenses, categoryData, dailyData)
    };
  };

  const generateCategoryReport = (expenses, startDate, endDate) => {
    const categoryAnalysis = {};
    
    expenses.forEach(exp => {
      const category = exp.category || 'Uncategorized';
      if (!categoryAnalysis[category]) {
        categoryAnalysis[category] = {
          total: 0,
          count: 0,
          transactions: [],
          avgAmount: 0,
          maxAmount: 0,
          minAmount: Infinity
        };
      }
      
      categoryAnalysis[category].total += exp.amount;
      categoryAnalysis[category].count += 1;
      categoryAnalysis[category].transactions.push(exp);
      categoryAnalysis[category].maxAmount = Math.max(categoryAnalysis[category].maxAmount, exp.amount);
      categoryAnalysis[category].minAmount = Math.min(categoryAnalysis[category].minAmount, exp.amount);
    });

    // Calculate averages and percentages
    const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    Object.keys(categoryAnalysis).forEach(category => {
      const data = categoryAnalysis[category];
      data.avgAmount = data.total / data.count;
      data.percentage = totalSpent > 0 ? ((data.total / totalSpent) * 100).toFixed(1) : 0;
      data.minAmount = data.minAmount === Infinity ? 0 : data.minAmount;
    });

    const categoryData = Object.entries(categoryAnalysis).map(([name, data]) => ({
      name,
      ...data
    })).sort((a, b) => b.total - a.total);

    return {
      type: 'Category Analysis Report',
      period: `${startDate.format('DD MMM YYYY')} - ${endDate.format('DD MMM YYYY')}`,
      summary: {
        totalCategories: Object.keys(categoryAnalysis).length,
        totalExpenses: totalSpent,
        avgPerCategory: totalSpent / Object.keys(categoryAnalysis).length
      },
      categories: categoryData,
      insights: generateCategoryInsights(categoryData)
    };
  };

  const generateComprehensiveReport = (expenses, debts, sips, stocks, loans, violations, taxes, startDate, endDate) => {
    const monthlyReport = generateMonthlyReport(expenses, debts, sips, stocks, startDate, endDate);
    
    // Additional comprehensive data
    const sipData = sips.map(doc => doc.data());
    const stockData = stocks.map(doc => doc.data());
    const loanData = loans.map(doc => doc.data());
    const violationData = violations.map(doc => doc.data());
    const taxData = taxes.map(doc => doc.data());

    // Financial health metrics
    const totalAssets = monthlyReport.summary.totalInvestments;
    const totalLiabilities = monthlyReport.summary.totalDebts + 
                            loanData.reduce((sum, loan) => sum + (loan.loanAmount || 0), 0);
    const netWorth = totalAssets - totalLiabilities;
    
    const monthlyIncome = sipData.reduce((sum, sip) => sum + (sip.monthlyAmount || 0), 0) * 12; // Estimated annual
    const expenseToIncomeRatio = monthlyIncome > 0 ? (monthlyReport.summary.totalExpenses * 12) / monthlyIncome : 0;

    return {
      ...monthlyReport,
      type: 'Comprehensive Financial Report',
      financialHealth: {
        netWorth,
        totalAssets,
        totalLiabilities,
        expenseToIncomeRatio: (expenseToIncomeRatio * 100).toFixed(1),
        debtToAssetRatio: totalAssets > 0 ? ((totalLiabilities / totalAssets) * 100).toFixed(1) : 0,
        liquidityRatio: 'N/A' // Would need cash/savings data
      },
      investments: {
        sips: sipData.length,
        stocks: stockData.length,
        totalSIPValue: sipData.reduce((sum, sip) => sum + (sip.monthlyAmount || 0), 0),
        totalStockValue: stockData.reduce((sum, stock) => sum + (stock.investedAmount || 0), 0)
      },
      obligations: {
        loans: loanData.length,
        violations: violationData.length,
        taxes: taxData.length,
        totalLoanAmount: loanData.reduce((sum, loan) => sum + (loan.loanAmount || 0), 0),
        totalFines: violationData.reduce((sum, violation) => sum + (violation.fineAmount || 0), 0),
        totalTaxes: taxData.reduce((sum, tax) => sum + (tax.amount || 0), 0)
      },
      recommendations: generateRecommendations(monthlyReport, {
        netWorth, expenseToIncomeRatio, totalLiabilities, totalAssets
      })
    };
  };

  const generateComparisonReport = (expenses, startDate, endDate) => {
    const currentPeriodDays = endDate.diff(startDate, 'days');
    const previousStart = startDate.subtract(currentPeriodDays, 'days');
    const previousEnd = startDate.subtract(1, 'day');

    const currentExpenses = expenses.filter(exp => {
      const expDate = dayjs(exp.date);
      return expDate.isAfter(startDate.subtract(1, 'day')) && expDate.isBefore(endDate.add(1, 'day'));
    });

    // For comparison, we'd need to fetch previous period data
    // This is a simplified version showing the structure
    const currentTotal = currentExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    return {
      type: 'Period Comparison Report',
      currentPeriod: {
        start: startDate.format('DD MMM YYYY'),
        end: endDate.format('DD MMM YYYY'),
        total: currentTotal,
        count: currentExpenses.length
      },
      previousPeriod: {
        start: previousStart.format('DD MMM YYYY'),
        end: previousEnd.format('DD MMM YYYY'),
        total: 0, // Would calculate from previous period data
        count: 0
      },
      comparison: {
        totalChange: 0,
        percentageChange: 0,
        countChange: 0
      }
    };
  };

  const generateInsights = (expenses, categoryData, dailyData) => {
    const insights = [];
    
    if (categoryData.length > 0) {
      const topCategory = categoryData[0];
      insights.push(`Your highest spending category is ${topCategory.name} (${topCategory.percentage}% of total)`);
    }

    if (dailyData.length > 0) {
      const highestDay = dailyData.reduce((max, day) => day.amount > max.amount ? day : max);
      insights.push(`Your highest spending day was ${highestDay.day} with ₹${highestDay.amount.toLocaleString()}`);
    }

    const avgTransaction = expenses.length > 0 ? 
      expenses.reduce((sum, exp) => sum + exp.amount, 0) / expenses.length : 0;
    insights.push(`Your average transaction amount is ₹${avgTransaction.toFixed(2)}`);

    return insights;
  };

  const generateCategoryInsights = (categoryData) => {
    const insights = [];
    
    if (categoryData.length > 0) {
      const topCategory = categoryData[0];
      insights.push(`${topCategory.name} accounts for ${topCategory.percentage}% of your spending`);
      insights.push(`You made ${topCategory.count} transactions in ${topCategory.name}`);
      insights.push(`Average ${topCategory.name} expense: ₹${topCategory.avgAmount.toFixed(2)}`);
    }

    return insights;
  };

  const generateRecommendations = (monthlyReport, healthMetrics) => {
    const recommendations = [];

    if (healthMetrics.expenseToIncomeRatio > 0.8) {
      recommendations.push('Consider reducing expenses as they exceed 80% of estimated income');
    }

    if (monthlyReport.categoryBreakdown.length > 0) {
      const topCategory = monthlyReport.categoryBreakdown[0];
      if (parseFloat(topCategory.percentage) > 30) {
        recommendations.push(`Consider diversifying spending - ${topCategory.name} represents ${topCategory.percentage}% of expenses`);
      }
    }

    if (healthMetrics.netWorth < 0) {
      recommendations.push('Focus on debt reduction and increasing investments to improve net worth');
    }

    return recommendations;
  };

  const exportReport = (format) => {
    if (!reportData) return;

    const timestamp = dayjs().format('YYYY-MM-DD_HH-mm');
    
    if (format === 'json') {
      const jsonContent = JSON.stringify(reportData, null, 2);
      downloadFile(jsonContent, `financial_report_${timestamp}.json`, 'application/json');
    } else if (format === 'csv') {
      const csvContent = convertReportToCSV(reportData);
      downloadFile(csvContent, `financial_report_${timestamp}.csv`, 'text/csv');
    } else if (format === 'html') {
      const htmlContent = convertReportToHTML(reportData);
      downloadFile(htmlContent, `financial_report_${timestamp}.html`, 'text/html');
    }
  };

  const convertReportToCSV = (data) => {
    let csv = `Financial Report - ${data.type}\n`;
    csv += `Period: ${data.period}\n\n`;
    
    // Summary
    csv += 'Summary\n';
    Object.entries(data.summary).forEach(([key, value]) => {
      csv += `${key},${value}\n`;
    });
    
    // Category breakdown
    if (data.categoryBreakdown) {
      csv += '\nCategory Breakdown\n';
      csv += 'Category,Amount,Percentage\n';
      data.categoryBreakdown.forEach(cat => {
        csv += `${cat.name},${cat.value},${cat.percentage}%\n`;
      });
    }
    
    return csv;
  };

  const convertReportToHTML = (data) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <title>${data.type}</title>
          <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              .header { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
              .summary { background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px; }
              .category { margin: 10px 0; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
          </style>
      </head>
      <body>
          <h1 class="header">${data.type}</h1>
          <p><strong>Period:</strong> ${data.period}</p>
          
          <div class="summary">
              <h2>Summary</h2>
              ${Object.entries(data.summary).map(([key, value]) => 
                `<p><strong>${key}:</strong> ₹${typeof value === 'number' ? value.toLocaleString() : value}</p>`
              ).join('')}
          </div>
          
          ${data.categoryBreakdown ? `
              <h2>Category Breakdown</h2>
              <table>
                  <tr><th>Category</th><th>Amount</th><th>Percentage</th></tr>
                  ${data.categoryBreakdown.map(cat => 
                    `<tr><td>${cat.name}</td><td>₹${cat.value.toLocaleString()}</td><td>${cat.percentage}%</td></tr>`
                  ).join('')}
              </table>
          ` : ''}
          
          ${data.insights ? `
              <h2>Insights</h2>
              <ul>
                  ${data.insights.map(insight => `<li>${insight}</li>`).join('')}
              </ul>
          ` : ''}
          
          <p><em>Generated on ${dayjs().format('DD MMM YYYY HH:mm')}</em></p>
      </body>
      </html>
    `;
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7f50', '#00bfff', '#ff69b4'];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Financial Report Generator</h1>
        
        {/* Report Configuration */}
        <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Report Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
              <select 
                value={reportType} 
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="monthly">Monthly Summary</option>
                <option value="category">Category Analysis</option>
                <option value="comprehensive">Comprehensive</option>
                <option value="comparison">Period Comparison</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input 
                type="date" 
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input 
                type="date" 
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-end">
              <button 
                onClick={generateReport}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>
          
          {/* Category Filter */}
          {allCategories.length > 0 && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Include Categories</label>
              <div className="flex flex-wrap gap-2">
                {allCategories.map(category => (
                  <label key={category} className="flex items-center">
                    <input 
                      type="checkbox"
                      checked={selectedCategories.includes(category)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCategories([...selectedCategories, category]);
                        } else {
                          setSelectedCategories(selectedCategories.filter(c => c !== category));
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">{category}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Report Display */}
        {reportData && (
          <div className="space-y-6">
            {/* Export Options */}
            <div className="bg-white p-4 rounded-xl shadow-lg">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">{reportData.type}</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => exportReport('json')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Export JSON
                  </button>
                  <button 
                    onClick={() => exportReport('csv')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Export CSV
                  </button>
                  <button 
                    onClick={() => exportReport('html')}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Export HTML
                  </button>
                </div>
              </div>
              <p className="text-gray-600 mt-2">Period: {reportData.period}</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(reportData.summary).map(([key, value]) => (
                <div key={key} className="bg-white p-4 rounded-xl shadow-lg">
                  <h3 className="text-sm font-medium text-gray-500 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </h3>
                  <p className="text-2xl font-bold text-gray-900">
                    {typeof value === 'number' ? 
                      (key.toLowerCase().includes('count') ? value : `₹${value.toLocaleString()}`) : 
                      value
                    }
                  </p>
                </div>
              ))}
            </div>

            {/* Charts */}
            {reportData.categoryBreakdown && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-lg">
                  <h3 className="text-lg font-semibold mb-4">Category Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        dataKey="value"
                        data={reportData.categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({name, percentage}) => `${name}: ${percentage}%`}
                      >
                        {reportData.categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-lg">
                  <h3 className="text-lg font-semibold mb-4">Category Amounts</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.categoryBreakdown.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']} />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Daily Spending Trend */}
            {reportData.dailySpending && (
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold mb-4">Daily Spending Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={reportData.dailySpending}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']} />
                    <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Insights */}
            {reportData.insights && (
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold mb-4">Key Insights</h3>
                <ul className="space-y-2">
                  {reportData.insights.map((insight, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations (for comprehensive reports) */}
            {reportData.recommendations && (
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
                <ul className="space-y-2">
                  {reportData.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-500 mr-2">💡</span>
                      <span>{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportGenerator;