import React, {useState, useEffect} from 'react';
import {db} from './firebase';
import {collection, onSnapshot, doc, updateDoc, deleteDoc, arrayUnion, getDoc, serverTimestamp} from 'firebase/firestore';

const LoanList = ({user}) => {
  const [loans, setLoans] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'users', user.uid, 'loans'),
      (snapshot) => {
        const loanData = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));
        setLoans(loanData);
      }
    );
    return () => unsub();
  }, [user]);

  const markAsPaid = async (id) => {
    await updateDoc(doc(db, 'users', user.uid, 'loans', id), {status: 'Paid'});
  };

  const deleteLoan = async (id) => {
    if (window.confirm('Delete this loan?')) {
      await deleteDoc(doc(db, 'users', user.uid, 'loans', id));
    }
  };

  const payMonthlyInterest = async (loan) => {
    const payment = { date: serverTimestamp(), amount: loan.loanAmount * (loan.annualInterest / 12 / 100) };
    const loanRef = doc(db, 'users', user.uid, 'loans', loan.id);
    const loanSnap = await getDoc(loanRef);
    if (!loanSnap.exists()) return;
    await updateDoc(loanRef, {
      interestPayments: arrayUnion(payment),
      lastInterestPaid: serverTimestamp()
    });
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
        <span role="img" aria-label="loan">💳</span> Loans You Owe
      </h2>
      {loans.length === 0 ? (
        <div className="bg-white rounded shadow p-4 text-center text-gray-500">No loans added yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loans.map((loan) => {
            const monthlyInterestRate = loan.annualInterest / 12 / 100;
            const monthlyInterestAmount = loan.loanAmount * monthlyInterestRate;
            const isOverdue = loan.dueDate && new Date(loan.dueDate.seconds ? loan.dueDate.seconds * 1000 : loan.dueDate) < new Date() && loan.status !== 'Paid';
            const lastPaid = loan.lastInterestPaid ? (loan.lastInterestPaid.seconds ? new Date(loan.lastInterestPaid.seconds * 1000) : new Date(loan.lastInterestPaid)) : null;
            const now = new Date();
            let nextDue = null;
            if (lastPaid) {
              nextDue = new Date(lastPaid);
              nextDue.setMonth(nextDue.getMonth() + 1);
            } else {
              nextDue = loan.dueDate && loan.dueDate.seconds ? new Date(loan.dueDate.seconds * 1000) : new Date(loan.dueDate);
            }
            const isInterestDue = nextDue && now >= nextDue && loan.status !== 'Paid';
            const interestPayments = loan.interestPayments || [];
            return (
              <div key={loan.id} className={`bg-white rounded-xl shadow-lg p-5 flex flex-col border-2 transition-all ${isOverdue ? 'border-red-400 animate-pulse' : 'border-transparent'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🏦</span>
                  <span className="font-semibold text-gray-700 text-base">{loan.loanOrganizationName}</span>
                  {loan.status === 'Paid' ? (
                    <span className="ml-2 px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-semibold">Paid</span>
                  ) : (
                    <span className="ml-2 px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 text-xs font-semibold">Pending</span>
                  )}
                  {isOverdue && (
                    <span className="ml-2 px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-semibold animate-pulse">Overdue</span>
                  )}
                  {isInterestDue && (
                    <span className="ml-2 px-2 py-0.5 rounded bg-purple-100 text-purple-700 text-xs font-semibold animate-pulse">Interest Due</span>
                  )}
                </div>
                {loan.reason && <div className="text-xs text-gray-500 mb-1"><span className="mr-1">📝</span>Reason: {loan.reason}</div>}
                <div className="text-xs text-gray-600 mb-1"><span className="mr-1">📅</span>Due: <span className={isOverdue ? 'text-red-600 font-bold' : ''}>{loan.dueDate ? (loan.dueDate.seconds ? new Date(loan.dueDate.seconds * 1000).toLocaleDateString() : new Date(loan.dueDate).toLocaleDateString()) : 'N/A'}</span></div>
                <div className="text-xs text-gray-600 mb-1"><span className="mr-1">💰</span>Amount: <span className="font-semibold text-blue-700">₹{loan.loanAmount?.toLocaleString()}</span></div>
                <div className="text-xs text-gray-600 mb-1"><span className="mr-1">📈</span>Interest: <span className="font-semibold">{loan.annualInterest}%</span> (Monthly: ₹{monthlyInterestAmount.toFixed(2)})</div>
                {lastPaid && <div className="text-xs text-gray-600 mb-1"><span className="mr-1">✅</span>Last Interest Paid: <span className="font-semibold text-green-700">{lastPaid.toLocaleDateString()}</span></div>}
                {nextDue && <div className="text-xs text-gray-600 mb-1"><span className="mr-1">⏰</span>Next Interest Due: <span className={isInterestDue ? 'text-red-600 font-bold' : 'font-semibold'}>{nextDue.toLocaleDateString()}</span></div>}
                {interestPayments.length > 0 && (
                  <div className="text-xs text-gray-600 mb-1"><span className="mr-1">📜</span>Interest Payment History:
                    <ul className="list-disc ml-6">
                      {interestPayments.map((p, idx) => (
                        <li key={idx} className="text-xs">{p.date && p.date.seconds ? new Date(p.date.seconds * 1000).toLocaleDateString() : 'N/A'} - ₹{p.amount?.toFixed(2)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  {isInterestDue && loan.status !== 'Paid' && (
                    <button onClick={() => payMonthlyInterest(loan)} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs" title="Pay Monthly Interest">💸 Pay Interest</button>
                  )}
                  {loan.status === 'Pending' && (
                    <button onClick={() => markAsPaid(loan.id)} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs">Mark as Paid</button>
                  )}
                  <button onClick={() => deleteLoan(loan.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs">Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LoanList;
