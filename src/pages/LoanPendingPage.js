import React from 'react';
import AddLoan from '../AddLoan';
import LoanList from '../LoanList';
import {useAuthState} from 'react-firebase-hooks/auth';
import {auth} from '../firebase';

const LoanPendingPage = () => {
  const [user] = useAuthState(auth);

  if (!user) {
    return <p>Please login to view your loans.</p>;
  }

  return (
    <div>
      <AddLoan user={user} />
      <LoanList user={user} />
    </div>
  );
};

export default LoanPendingPage;
