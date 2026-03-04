import React, { useState } from 'react';
import AddClassForm from '../components/features/forms/AddClassForm.tsx';
import Navbar from '../components/features/generics/Navbar';
import Footer from '../components/features/generics/Footer';

type EntryType = 'Class' | 'Teacher' | 'Building' | 'Room';

const AddEntryPage: React.FC = () => {
    const [selectedFormType, setSelectedFormType] = useState<EntryType>('Class');

    const handleClassUpdated = () => {
        console.log("AddEntryPage: Class data has been updated.");
    };

    const handleCancelEdit = () => {
        console.log("AddEntryPage: Edit cancelled.");
    };

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
                flexDirection: 'column',
                alignItems: 'center',
                padding: '20px',
            }}>
                <h2 style={{ fontSize: '1.5em', marginBottom: '20px', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    Add new
                    <select
                        id="entryType"
                        value={selectedFormType}
                        onChange={(e) => setSelectedFormType(e.target.value as EntryType)}
                        className="form-group-select"
                        style={{
                            fontSize: '0.8em',
                            fontWeight: 'normal',
                            color: 'var(--text-dark)',
                            backgroundColor: 'white',
                            padding: '4px 8px'
                        }}
                    >
                        <option value="Class">Class</option>
                    </select>
                    entry
                </h2>

                <div style={{ width: '100%', maxWidth: '1200px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {selectedFormType === 'Class' && (
                        <AddClassForm
                            initialClassData={null}
                            onClassUpdated={handleClassUpdated}
                            onCancelEdit={handleCancelEdit}
                        />
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default AddEntryPage;
