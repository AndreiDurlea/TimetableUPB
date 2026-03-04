import React from 'react';
import { useSingleClassForm } from '../../../hooks/forms/useSingleClassForm.ts';
import { useClassFormSuggestions } from '../../../hooks/forms/fields/useClassFormSuggestions.ts';
import FormContainer from '../../ui/forms/FormContainer.tsx';
import FormInput from '../../ui/forms/fields/FormInput.tsx';
import FormSelect from '../../ui/forms/fields/FormSelect.tsx';
import FormAutocomplete from '../../ui/forms/fields/FormAutocomplete.tsx';
import type { Database } from '../../../lib/database.types.ts';

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
    form,
    classIdToEdit,
    loading,
    handleChange,
    handleSubmit,
    handleDelete,
    isFormValid,
    getFieldStatus,
  } = useSingleClassForm(initialClassData, onClassUpdated, onCancelEdit);

  const { fetchClassSuggestions, fetchTeacherSuggestions, fetchLocationSuggestions } = useClassFormSuggestions();

  const daysOfWeekOptions = [
    { value: 1, label: 'Monday' }, { value: 2, label: 'Tuesday' }, { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' }, { value: 5, label: 'Friday' }, { value: 6, 'label': 'Saturday' }, { value: 7, 'label': 'Sunday' },
  ];

  return (
    <FormContainer onSubmit={handleSubmit}>
      <h3 style={{ width: '100%', textAlign: 'center', marginBottom: '15px', color: 'var(--text-light)' }}>{classIdToEdit ? 'Edit Class' : 'Add New Class'}</h3>
      
      <FormAutocomplete
        label="Name"
        value={form.name}
        onChange={(val) => handleChange('name', val)}
        fetchSuggestions={fetchClassSuggestions}
        onSelectSuggestion={(val) => handleChange('name', val)}
        placeholder="Class Name"
        {...getFieldStatus('name')}
      />
      <FormSelect
        label="Class Type"
        value={form.classType}
        onChange={(val) => handleChange('classType', val)}
        options={[{id: 'Course', label: 'Course'}, {id: 'Lab', label: 'Lab'}, {id: 'Seminar', label: 'Seminar'}]}
        placeholder="Select Type"
        disabled={!form.name}
        {...getFieldStatus('classType')}
      />
      <FormSelect
        label="Day of Week"
        value={String(form.dayOfWeek)}
        onChange={(val) => handleChange('dayOfWeek', Number(val))}
        options={daysOfWeekOptions.map(d => ({ id: String(d.value), label: d.label }))}
        placeholder="Select Day"
        disabled={!form.classType}
        {...getFieldStatus('dayOfWeek')}
      />
      <FormInput
        label="Start Time"
        type="time"
        value={form.startTime}
        onChange={(e) => handleChange('startTime', e.target.value)}
        disabled={!form.dayOfWeek}
        {...getFieldStatus('startTime')}
      />
      <FormInput
        label="End Time"
        type="time"
        value={form.endTime}
        onChange={(e) => handleChange('endTime', e.target.value)}
        readOnly
        disabled
        {...getFieldStatus('endTime')}
      />
      <FormSelect
        label="Frequency"
        value={form.frequency}
        onChange={(val) => handleChange('frequency', val)}
        options={[{id: 'weekly', label: 'Weekly'}, {id: 'odd', label: 'Odd only'}, {id: 'even', label: 'Even only'}]}
        disabled={!form.startTime}
        {...getFieldStatus('frequency')}
      />

      <h4 style={{ width: '100%', textAlign: 'center', margin: '20px 0 10px', color: 'var(--text-light)' }}>Optional Details</h4>

      <FormInput
        label="Shorthand"
        value={form.shorthand}
        onChange={(e) => handleChange('shorthand', e.target.value)}
        placeholder="e.g. OOP"
        {...getFieldStatus('shorthand')}
      />
      <FormAutocomplete
        label="Teacher Name"
        value={form.teacherName}
        onChange={(val) => handleChange('teacherName', val)}
        fetchSuggestions={fetchTeacherSuggestions}
        onSelectSuggestion={(val) => handleChange('teacherName', val)}
        placeholder="Teacher Name"
        {...getFieldStatus('teacherName')}
      />
      <FormAutocomplete
        label="Location"
        value={form.location}
        onChange={(val) => handleChange('location', val)}
        fetchSuggestions={fetchLocationSuggestions}
        onSelectSuggestion={(val) => handleChange('location', val)}
        placeholder="e.g. AN034"
        {...getFieldStatus('location')}
      />
      <FormInput
        label="Hierarchy"
        value={form.hierarchy}
        onChange={(e) => handleChange('hierarchy', e.target.value)}
        placeholder="e.g. ACS-CTI-1CA-313a"
        {...getFieldStatus('hierarchy')}
      />

      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '20px' }}>
        {classIdToEdit ? (
          <>
            <button type="button" onClick={onCancelEdit} className="gray-button" style={{ backgroundColor: '#6c757d', color: 'white' }}>Cancel</button>
            <button type="submit" disabled={loading || !isFormValid()} className="gray-button" style={{ backgroundColor: '#007bff', color: 'white' }}>{loading ? 'Updating...' : 'Update Class'}</button>
            <button type="button" onClick={handleDelete} disabled={loading} className="gray-button" style={{ backgroundColor: '#d32f2f', color: 'white' }}>Delete</button>
          </>
        ) : (
          <button type="submit" disabled={loading || !isFormValid()} className="gray-button">{loading ? 'Adding...' : '+ Add Class'}</button>
        )}
      </div>
    </FormContainer>
  );
};

export default SingleClassForm;
