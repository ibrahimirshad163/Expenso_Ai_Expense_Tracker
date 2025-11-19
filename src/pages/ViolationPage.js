import React from 'react';
import AddViolation from '../AddViolation';
import ViolationList from '../ViolationList';

const ViolationPage = ({user}) => {
  return (
    <div>
      <AddViolation user={user} />
      <ViolationList user={user} />
    </div>
  );
};

export default ViolationPage;
