import React from 'react';
import { useBulkClassForm } from '../../../hooks/forms/useBulkClassForm.ts';

interface BulkClassFormProps {
  onClassUpdated: () => void;
}

const BulkClassForm: React.FC<BulkClassFormProps> = ({ onClassUpdated }) => {
  const { jsonInput, status, loading, setJsonInput, handleBulkAdd } = useBulkClassForm(onClassUpdated);

  return (
    <div style={{ padding: '20px', marginTop: '20px' }}>
      <h3 style={{ width: '100%', textAlign: 'center', marginBottom: '15px', color: 'var(--text-light)' }}>Bulk Add Classes (JSON)</h3>
      {status && <p style={{ color: status.startsWith('Error') ? 'red' : 'green', width: '100%', textAlign: 'center' }}>{status}</p>}
      <textarea
        className="no-scrollbar"
        value={jsonInput}
        onChange={(e) => setJsonInput(e.target.value)}
        placeholder={`[
{
  "shorthand": "OOP",
  "name": "Object Oriented Programming",
  "classType": "Course",
  "dayOfWeek": 1,
  "startTime": "10:00",
  "endTime": "12:00",
  "frequency": "weekly",
  "teacherName": "Dr. Smith",
  "location": "AN034",
  "hierarchy": "ACS-CTI-1CA-313a"
}
]`}
        rows={10}
        style={{
          width: '100%', padding: '10px', borderRadius: '4px', border: 'none',
          backgroundColor: 'var(--card-bg-default)', color: 'var(--text-light)',
          outline: 'none', resize: 'vertical'
        }}
      ></textarea>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '15px' }}>
        <button type="button" onClick={handleBulkAdd} disabled={loading || !jsonInput.trim()} className="gray-button">{loading ? 'Adding Bulk...' : '+ Load JSON'}</button>
      </div>
    </div>
  );
};

export default BulkClassForm;
