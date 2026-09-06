import React from 'react';
import { useSingleClassForm } from '../../../hooks/forms/useSingleClassForm.ts';
import { useClassFormSuggestions } from '../../../hooks/forms/fields/useClassFormSuggestions.ts';
import FormInput from '../../ui/forms/fields/FormInput.tsx';
import FormSelect from '../../ui/forms/fields/FormSelect.tsx';
import FormAutocomplete from '../../ui/forms/fields/FormAutocomplete.tsx';
import FormContainer from '../../ui/forms/FormContainer.tsx';
import containerStyles from '../../ui/forms/FormContainer.module.css';
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
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 7, label: 'Sunday' },
  ];

  return (
    <>
      {status && (
        <p
          className={containerStyles.formStatus}
          style={{ color: status.startsWith('Error') ? '#d32f2f' : '#4caf50' }}
        >
          {status}
        </p>
      )}
      <FormContainer onSubmit={handleSubmit}>
        <h3 className={containerStyles.formTitle}>
          {classIdToEdit ? 'Edit Class' : 'Add New Class'}
        </h3>

        <FormInput
          label="Shorthand"
          value={form.shorthand}
          onChange={e => handleChange('shorthand', e.target.value)}
          placeholder="e.g. OOP"
          required
          isChanged={Boolean(form.shorthand && form.shorthand !== (initialClassData?.shorthand || ''))}
        />

        <FormAutocomplete
          label="Class Name"
          value={form.name}
          onChange={val => handleChange('name', val)}
          fetchSuggestions={fetchClassSuggestions}
          onSelectSuggestion={val => handleChange('name', val)}
          placeholder="Class Name"
          isChanged={Boolean(form.name && form.name !== (initialClassData?.name || ''))}
        />

        <FormSelect
          label="Class Type"
          value={form.classType}
          onChange={val => handleChange('classType', val as ClassType)}
          options={[
            { id: 'Course', label: 'Course' },
            { id: 'Lab', label: 'Lab' },
            { id: 'Seminar', label: 'Seminar' }
          ]}
          placeholder="Select Type"
          isChanged={Boolean(form.classType && form.classType !== (initialClassData?.class_type || ''))}
        />

        <FormSelect
          label="Day of Week"
          value={form.dayOfWeek ? String(form.dayOfWeek) : ''}
          onChange={val => handleChange('dayOfWeek', val)}
          options={daysOfWeekOptions.map(day => ({ id: String(day.value), label: day.label }))}
          placeholder="Select Day"
          isChanged={Boolean(form.dayOfWeek && form.dayOfWeek !== (initialClassData?.day_of_week || ''))}
        />

        <FormInput
          label="Start Time"
          type="time"
          value={form.startTime}
          onChange={e => handleChange('startTime', e.target.value)}
          required
          isChanged={Boolean(form.startTime && form.startTime !== (initialClassData?.start_time?.substring(0, 5) || '08:00'))}
        />

        <FormInput
          label="End Time"
          type="time"
          value={form.endTime}
          onChange={() => {}}
          readOnly
          isChanged={Boolean(form.endTime && form.endTime !== (initialClassData?.end_time?.substring(0, 5) || '10:00'))}
        />

        <FormSelect
          label="Frequency"
          value={form.frequency}
          onChange={val => handleChange('frequency', val as Frequency)}
          options={[
            { id: 'weekly', label: 'Weekly' },
            { id: 'odd', label: 'Odd only' },
            { id: 'even', label: 'Even only' }
          ]}
          placeholder="Select Frequency"
          isChanged={Boolean(form.frequency && form.frequency !== (initialClassData?.frequency || 'weekly'))}
        />

        <FormAutocomplete
          label="Teacher Name"
          value={form.teacherName}
          onChange={val => handleChange('teacherName', val)}
          fetchSuggestions={fetchTeacherSuggestions}
          onSelectSuggestion={val => handleChange('teacherName', val)}
          placeholder="Teacher Name"
          isChanged={Boolean(form.teacherName && form.teacherName !== (initialClassData?.teacher_name || ''))}
        />

        <FormAutocomplete
          label="Location"
          value={form.location}
          onChange={val => handleChange('location', val)}
          fetchSuggestions={fetchLocationSuggestions}
          onSelectSuggestion={val => handleChange('location', val)}
          placeholder="e.g. AN034"
          isChanged={Boolean(form.location && form.location !== (`${initialClassData?.building_shorthand || ''}${initialClassData?.room_index || ''}`))}
        />

        <FormInput
          label="Hierarchy"
          value={form.hierarchy}
          onChange={e => handleChange('hierarchy', e.target.value)}
          placeholder="e.g. ACS-CTI-1CA-313a"
          isChanged={Boolean(form.hierarchy)}
        />

        <div className={containerStyles.formActions}>
          {classIdToEdit ? (
            <>
              <button
                type="button"
                onClick={onCancelEdit}
                className="gray-button"
                style={{
                  backgroundColor: '#2c2c2e',
                  color: '#ffffff',
                  border: '1px solid #444',
                  borderRadius: '20px',
                  height: '42px',
                  padding: '0 20px',
                  fontWeight: '500',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="gray-button"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  border: '1px solid #ffffff',
                  borderRadius: '20px',
                  height: '42px',
                  padding: '0 20px',
                  fontWeight: '600',
                }}
              >
                {loading ? 'Updating...' : 'Update Class'}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="gray-button"
                style={{
                  backgroundColor: '#d32f2f',
                  color: '#ffffff',
                  border: '1px solid #d32f2f',
                  borderRadius: '20px',
                  height: '42px',
                  padding: '0 20px',
                  fontWeight: '500',
                }}
              >
                Delete
              </button>
            </>
          ) : (
            <button
              type="submit"
              disabled={loading || !isFormValid()}
              className="gray-button"
              style={{
                backgroundColor: loading || !isFormValid() ? '#1c1c1e' : '#ffffff',
                color: loading || !isFormValid() ? '#555555' : '#000000',
                border: `1px solid ${loading || !isFormValid() ? '#2c2c2e' : '#ffffff'}`,
                borderRadius: '20px',
                height: '42px',
                padding: '0 24px',
                fontWeight: '600',
                cursor: loading || !isFormValid() ? 'default' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {loading ? 'Adding...' : '+ Add Class'}
            </button>
          )}
        </div>
      </FormContainer>
    </>
  );
};

export default SingleClassForm;
