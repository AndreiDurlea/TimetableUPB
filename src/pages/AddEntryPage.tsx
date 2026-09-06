import React, { useState } from 'react';
import AddClassForm from '../components/features/forms/AddClassForm.tsx';
import Navbar from '../components/features/generics/Navbar';
import Footer from '../components/features/generics/Footer';
import FormSelect from '../components/ui/forms/fields/FormSelect.tsx';

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
                <div style={{ textAlign: 'center', marginBottom: '24px', maxWidth: '600px' }}>
                    <h2 style={{ fontSize: '1.6em', marginBottom: '8px', color: 'var(--text-light)', fontWeight: 600 }}>
                        Add New Entry
                    </h2>
                    <p style={{ color: '#888', fontSize: '0.9em' }}>
                        Create or update timetable schedule entries in the database.
                    </p>
                </div>

                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                    <FormSelect
                        label="Entry Type"
                        value={selectedFormType}
                        onChange={(val) => setSelectedFormType(val as EntryType)}
                        options={[
                            { id: 'Class', label: 'Class' }
                        ]}
                        placeholder="Select Entry Type"
                    />
                </div>

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
