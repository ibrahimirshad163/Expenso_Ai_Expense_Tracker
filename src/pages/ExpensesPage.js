import React from 'react';
import AddExpense from '../AddExpense';
import ExpenseList from '../ExpenseList';
import ExpenseChart from '../ExpenseChart';

const ExpensesPage = ({user}) => {
  if (!user) return <p>User not logged in.</p>;

  return (
    <div>
      <AddExpense user={user} />
      <ExpenseList user={user} />
      <ExpenseChart user={user} />
    </div>
  );
};

export default ExpensesPage;
