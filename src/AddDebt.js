// src/AddDebt.js
import React, {useState} from 'react';
import {db} from './firebase';
import {collection, addDoc, serverTimestamp} from 'firebase/firestore';

const AddDebt = ({user}) => {
    const [person, setPerson] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [notes, setNotes] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            setMessage('Please log in to add debts.');
            return;
        }
        if (!person || !amount || !dueDate) {
            setMessage('Person, Amount, and Due Date are required.');
            return;
        }

        try {
            await addDoc(collection(db, 'users', user.uid, 'debtsOwedByMe'), {
                person,
                amount: parseFloat(amount),
                dueDate: new Date(dueDate),
                notes,
                status: 'unpaid',
                createdAt: serverTimestamp()
            });

            setPerson('');
            setAmount('');
            setDueDate('');
            setNotes('');
            setMessage('Debt added successfully!');
        } catch (err) {
            console.error('Error adding debt:', err);
            setMessage('Failed to add debt. Please try again.');
        }
    };

    return (
        <div className="max-w-md mx-auto p-4">
            <h2 className="text-xl font-semibold mb-4">Add Debt</h2>
            {message && <p className="mb-2 text-green-600">{message}</p>}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input 
                    type="text" 
                    placeholder="Person" 
                    value={person} 
                    onChange={(e) => setPerson(e.target.value)} 
                    required 
                    className="border p-2 rounded"
                />
                <input 
                    type="number" 
                    placeholder="Amount" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    required 
                    className="border p-2 rounded"
                    min="0.01"
                    step="0.01"
                />
                <input 
                    type="date" 
                    value={dueDate} 
                    onChange={(e) => setDueDate(e.target.value)} 
                    required 
                    className="border p-2 rounded"
                />
                <input 
                    type="text" 
                    placeholder="Notes (optional)" 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    className="border p-2 rounded"
                />
                <button type="submit" className="bg-blue-500 text-white p-2 rounded">
                    Add Debt
                </button>
            </form>
        </div>
    );
};

export default AddDebt;
