import React from 'react';
import AddStock from '../AddStock';
import StockList from '../StockList';

const StocksPage = ({user}) => {
  return (
    <div>
      <AddStock user={user} />
      <StockList user={user} />
    </div>
  );
};

export default StocksPage;
