import React from 'react';
import AddSIP from '../AddSIP';
import SIPList from '../SIPList';

const SIPPage = ({user}) => {
  return (
    <div>
      <AddSIP user={user} />
      <SIPList user={user} />
    </div>
  );
};

export default SIPPage;
