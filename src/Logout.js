import React from 'react';
import {auth, signOut} from './firebase';

const Logout = () => {
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="bg-red-500 text-white p-2 rounded mt-4"
    >
      Logout
    </button>
  );
};

export default Logout;
