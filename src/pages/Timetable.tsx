import React from 'react';
import DayCardGrid from '../components/features/timetable/DayCardGrid';
import Navbar from '../components/features/generics/Navbar';
import Footer from '../components/features/generics/Footer';

const Timetable: React.FC = () => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
        }}>
            <Navbar />
            <main style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
            }}>
                <DayCardGrid />
            </main>
            <Footer />
        </div>
    );
};

export default Timetable;
