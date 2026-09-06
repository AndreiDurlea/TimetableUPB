import React from 'react';
import { useBulkClassForm } from '../../../hooks/forms/useBulkClassForm.ts';
import containerStyles from '../../ui/forms/FormContainer.module.css';

interface BulkClassFormProps {
  onClassUpdated: () => void;
}

const BulkClassForm: React.FC<BulkClassFormProps> = ({ onClassUpdated }) => {
  const { jsonInput, status, loading, setJsonInput, handleBulkAdd } = useBulkClassForm(onClassUpdated);

  return (
    <div style={{ padding: '20px', marginTop: '20px', width: '100%', maxWidth: '800px', boxSizing: 'border-box' }}>
      <h3 className={containerStyles.formTitle}>Bulk Add Classes (JSON)</h3>
      {status && (
        <p
          className={containerStyles.formStatus}
          style={{ color: status.startsWith('Error') ? '#d32f2f' : '#4caf50' }}
        >
          {status}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '0.8em', color: jsonInput ? 'white' : '#888', transition: 'color 0.3s ease' }}>
          JSON Data {jsonInput ? '*' : ''}
        </label>
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
            width: '100%',
            padding: '14px 16px',
            borderRadius: '16px',
            border: '1px solid #333',
            backgroundColor: '#1c1c1e',
            color: 'white',
            outline: 'none',
            resize: 'vertical',
            fontFamily: 'monospace, Safiro, sans-serif',
            fontSize: '0.9em',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div className={containerStyles.formActions}>
        <button
          type="button"
          onClick={handleBulkAdd}
          disabled={loading || !jsonInput.trim()}
          className="gray-button"
          style={{
            backgroundColor: loading || !jsonInput.trim() ? '#1c1c1e' : '#ffffff',
            color: loading || !jsonInput.trim() ? '#555555' : '#000000',
            border: `1px solid ${loading || !jsonInput.trim() ? '#2c2c2e' : '#ffffff'}`,
            borderRadius: '20px',
            height: '42px',
            padding: '0 24px',
            fontWeight: '600',
            cursor: loading || !jsonInput.trim() ? 'default' : 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          {loading ? 'Adding Bulk...' : '+ Load JSON'}
        </button>
      </div>
    </div>
  );
};

export default BulkClassForm;
