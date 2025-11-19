import React, {useState} from 'react';
import {auth, googleProvider, signInWithPopup, signInAnonymously} from './firebase';

// Simple Expenso SVG icon (replace with your own if available)
const ExpensoIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="14" fill="#2563eb"/>
    <path d="M24 13v22M15 24h18" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="24" cy="24" r="9" stroke="#fff" strokeWidth="3"/>
  </svg>
);

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setLoading(true); setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      setError('Google login failed.');
    }
    setLoading(false);
  };

  const handleAnonymousSignIn = async () => {
    setLoading(true); setError('');
    try {
      await signInAnonymously(auth);
    } catch (error) {
      setError('Anonymous login failed.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 to-blue-500 relative overflow-hidden">
      {/* Subtle animated background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-blue-300 opacity-30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-blue-700 opacity-20 rounded-full blur-2xl animate-pulse"></div>
      </div>
      <div className="relative z-10 bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-10 max-w-md w-full flex flex-col items-center border border-white/40 transition-all duration-300">
        <div className="mb-4 flex flex-col items-center">
          <ExpensoIcon />
          <div className="text-3xl font-extrabold text-blue-700 mt-2 mb-1 tracking-tight font-display drop-shadow">Expenso</div>
          <div className="text-base text-gray-600 font-medium mb-1 tracking-wide">Your Smart Expense Manager</div>
        </div>
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Sign in to continue</h2>
        {error && <div className="mb-3 w-full p-2 bg-red-100 text-red-700 rounded text-center text-sm shadow">{error}</div>}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow mb-3 transition-all disabled:opacity-60"
        >
          <span className="text-lg">🔎</span> Sign in with Google
        </button>
        <button
          onClick={handleAnonymousSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow mb-3 transition-all disabled:opacity-60"
        >
          <span className="text-lg">👤</span> Continue as Guest
        </button>
        {loading && <div className="mt-2 text-blue-600 text-sm flex items-center gap-2"><div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>Signing in...</div>}
        <div className="mt-6 text-xs text-gray-400 text-center">By signing in, you agree to Expenso's Terms of Service and Privacy Policy.</div>
      </div>
    </div>
  );
};

export default Login;
