import React, {useEffect, useState} from 'react';
import {PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer} from 'recharts';
import {collection, query, onSnapshot} from 'firebase/firestore';
import {db} from './firebase';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7f50', '#00bfff', '#ff69b4'];

const ExpenseChart = ({user}) => {
    const [data, setData] = useState([]);

    useEffect(() => {
        if (!user) return;

        const q = query(collection(db, 'users', user.uid, 'expenses'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const expenses = {};
            querySnapshot.forEach(doc => {
                const {category, amount} = doc.data();
                if (category) {
                    if (!expenses[category]) expenses[category] = 0;
                    expenses[category] += amount;
                }
            });
            const chartData = Object.keys(expenses).map(key => ({
                name: key,
                value: expenses[key]
            }));
            setData(chartData);
        });

        return () => unsubscribe();
    }, [user]);

    if (data.length === 0) return <p className="text-center">No expenses to display in chart.</p>;

    return (
        <div className="max-w-md mx-auto p-4">
            <h2 className="text-xl font-semibold mb-4">Expenses by Category</h2>
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        dataKey="value"
                        data={data}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        label
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ExpenseChart;
