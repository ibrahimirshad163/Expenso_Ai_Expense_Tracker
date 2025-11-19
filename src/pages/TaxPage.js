import React from 'react';
import AddTax from '../AddTax';
import TaxList from '../TaxList';

const TaxPage = ({user}) => {
  return (
    <div>
      <AddTax user={user} />
      <TaxList user={user} />
    </div>
  );
};

export default TaxPage;
