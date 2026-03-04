import React from 'react';
import { useSingleClassForm } from '../../../hooks/forms/useSingleClassForm.ts';
import { useClassFormSuggestions } from '../../../hooks/forms/fields/useClassFormSuggestions.ts';
import FormAutocomplete from '../../ui/forms/fields/FormAutocomplete.tsx';
import FormContainer from '../../ui/forms/FormContainer.tsx';
import containerStyles from '../../ui/forms/FormContainer.module.css';
import formStyles from '../../ui/forms/fields/FormField.module.css';
import type { Database } from '../../../lib/database.types.ts';
import type { ClassType, Frequency } from '../../../lib/types.ts';

type DetailedClass = Database['public']['Views']['detailed_classes']['Row'] & {
  shorthand: string | null;
  resolved_domain_id: string | null;
  faculty_shorthand: string | null;
  domain_name: string | null;
  series_name: string | null;
  group_name: string | null;
  subgroup_name: string | null;
};

interface SingleClassFormProps {
  initialClassData: DetailedClass | null;
  onClassUpdated: () => void;
  onCancelEdit: () => void;
}

const SingleClassForm: React.FC<SingleClassFormProps> = ({ initialClassData, onClassUpdated, onCancelEdit }) => {
  const {
    form, classIdToEdit, status, loading,
    handleChange, handleSubmit, handleDelete, isFormValid
  } = useSingleClassForm(initialClassData, onClassUpdated, onCancelEdit);

  const { fetchClassSuggestions, fetchTeacherSuggestions, fetchLocationSuggestions } = useClassFormSuggestions();

  const daysOfWeekOptions = [
    { value: 1, label: 'Monday' }, { value: 2, label: 'Tuesday' }, { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' }, { value: 5, label: 'Friday' }, { value: 6, 'label': 'Saturday' }, { value: 7, 'label': 'Sunday' },
  ];

  return (
    <>
      {status && <p className={containerStyles.formStatus} style={{ color: status.startsWith('Error') ? 'red' : 'green' }}>{status}</p>}
      <FormContainer onSubmit={handleSubmit}>
        <h3 className={containerStyles.formTitle}>{classIdToEdit ? 'Edit Class' : 'Add New Class'}</h3>
        <div className={formStyles.formGroup}>
          <label>Shorthand:</label>
          <input type="text" value={form.shorthand} onChange={e => handleChange('shorthand', e.target.value)} className={formStyles.formField} required />
        </div>
        <div className={formStyles.formGroup}>
          <label>Name:</label>
          <FormAutocomplete value={form.name} onChange={val => handleChange('name', val)} fetchSuggestions={fetchClassSuggestions} onSelectSuggestion={val => handleChange('name', val)} placeholder="Class Name" inputClassName={formStyles.formField} />
        </div>
        <div className={formStyles.formGroup}>
          <label>Class Type:</label>
          <select value={form.classType} onChange={e => handleChange('classType', e.target.value as ClassType)} className={formStyles.formField} required>
            <option value="">Select Type</option>
            <option value="Course">Course</option>
            <option value="Lab">Lab</option>
            <option value="Seminar">Seminar</option>
          </select>
        </div>
        <div className={formStyles.formGroup}>
          <label>Day of Week:</label>
          <select value={form.dayOfWeek} onChange={e => handleChange('dayOfWeek', Number(e.target.value))} className={formStyles.formField} required>
            <option value="">Select Day</option>
            {daysOfWeekOptions.map(day => (<option key={day.value} value={day.value}>{day.label}</option>))}
          </select>
        </div>
        <div className={formStyles.formGroup}>
          <label>Start Time:</label>
          <input type="time" value={form.startTime} onChange={e => handleChange('startTime', e.target.value)} className={formStyles.formField} required />
        </div>
        <div className={formStyles.formGroup}>
          <label>End Time:</label>
          <input type="time" value={form.endTime} readOnly className={formStyles.formField} />
        </div>
        <div className={formStyles.formGroup}>
          <label>Frequency:</label>
          <select value={form.frequency} onChange={e => handleChange('frequency', e.target.value as Frequency)} className={formStyles.formField} required>
            <option value="weekly">Weekly</option>
            <option value="odd">Odd only</option>
            <option value="even">Even only</option>
          </select>
        </div>
        <div className={formStyles.formGroup}>
          <label>Teacher Name:</label>
          <FormAutocomplete value={form.teacherName} onChange={val => handleChange('teacherName', val)} fetchSuggestions={fetchTeacherSuggestions} onSelectSuggestion={val => handleChange('teacherName', val)} placeholder="Teacher Name" inputClassName={formStyles.formField} />
        </div>
        <div className={formStyles.formGroup}>
          <label>Location (e.g., AN034):</label>
          <FormAutocomplete value={form.location} onChange={val => handleChange('location', val)} fetchSuggestions={fetchLocationSuggestions} onSelectSuggestion={val => handleChange('location', val)} placeholder="Location" inputClassName={formStyles.formField} />
        </div>
        <div className={formStyles.formGroup}>
          <label>Hierarchy (e.g., ACS-CTI-1CA-313a):</label>
          <input type="text" value={form.hierarchy} onChange={e => handleChange('hierarchy', e.target.value)} className={formStyles.formField} />
        </div>
        <div className={containerStyles.formActions}>
          {classIdToEdit ? (
            <>
              <button type="button" onClick={onCancelEdit} className="gray-button" style={{ backgroundColor: '#6c757d', color: 'white' }}>Cancel</button>
              <button type="submit" disabled={loading} className="gray-button" style={{ backgroundColor: '#007bff', color: 'white' }}>{loading ? 'Updating...' : 'Update Class'}</button>
              <button type="button" onClick={handleDelete} disabled={loading} className="gray-button" style={{ backgroundColor: '#d32f2f', color: 'white' }}>Delete</button>
            </>
          ) : (
            <button type="submit" disabled={loading || !isFormValid()} className="gray-button">{loading ? 'Adding...' : '+ Add Class'}</button>
          )}
        </div>
      </FormContainer>
    </>
  );
};

export default SingleClassForm;
