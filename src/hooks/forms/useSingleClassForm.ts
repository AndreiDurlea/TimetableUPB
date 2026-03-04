import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.ts';
import { processClassData } from '../../utils/classDataUtils.ts';
import type { Database } from '../../lib/database.types.ts';
import type { FormState, ClassType, Frequency } from '../../lib/types.ts';

type DetailedClass = Database['public']['Views']['detailed_classes']['Row'] & {
  shorthand: string | null;
  resolved_domain_id: string | null;
  faculty_shorthand: string | null;
  domain_name: string | null;
  series_name: string | null;
  group_name: string | null;
  subgroup_name: string | null;
};

const EMPTY_FORM: FormState = {
  shorthand: '', name: '', classType: '', dayOfWeek: '', startTime: '08:00', endTime: '10:00',
  frequency: 'weekly', teacherName: '', location: '', hierarchy: '',
};

export const useSingleClassForm = (initialClassData: DetailedClass | null, onClassUpdated: () => void, onCancelEdit: () => void) => {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [originalForm, setOriginalForm] = useState<FormState>(EMPTY_FORM);
  const [classIdToEdit, setClassIdToEdit] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialClassData) {
      setClassIdToEdit(initialClassData.id);
      const hierarchyParts = [
        initialClassData.faculty_shorthand,
        initialClassData.domain_name,
        initialClassData.series_name,
        initialClassData.group_name ? `${initialClassData.group_name}${initialClassData.subgroup_name || ''}` : null
      ].filter(Boolean);
      const hierarchyString = hierarchyParts.join('-');

      const parsedDay = initialClassData.day_of_week ? parseInt(String(initialClassData.day_of_week), 10) : NaN;
      const dayOfWeekValue = isNaN(parsedDay) ? '' : parsedDay;

      const formData: FormState = {
        shorthand: initialClassData.shorthand || '',
        name: initialClassData.name || '',
        classType: (initialClassData.class_type as ClassType) || '',
        dayOfWeek: dayOfWeekValue,
        startTime: initialClassData.start_time?.substring(0, 5) || '08:00',
        endTime: initialClassData.end_time?.substring(0, 5) || '10:00',
        frequency: (initialClassData.frequency as Frequency) || 'weekly',
        teacherName: initialClassData.teacher_name || '',
        location: `${initialClassData.building_shorthand || ''}${initialClassData.room_index || ''}`,
        hierarchy: hierarchyString,
      };
      setForm(formData);
      setOriginalForm(formData);
    } else {
      setClassIdToEdit(null);
      setForm(EMPTY_FORM);
      setOriginalForm(EMPTY_FORM);
    }
  }, [initialClassData]);

  useEffect(() => {
    if (form.startTime) {
      const [hours, minutes] = form.startTime.split(':').map(Number);
      const endDate = new Date();
      endDate.setHours(hours + 2, minutes, 0, 0);
      const newEndTime = endDate.toTimeString().substring(0, 5);
      setForm(prev => ({ ...prev, endTime: newEndTime }));
    }
  }, [form.startTime]);

  const handleChange = (field: keyof FormState, value: string | number) => {
    let processedValue: string | number = value;
    if (field === 'dayOfWeek') {
      const parsed = parseInt(String(value), 10);
      processedValue = isNaN(parsed) ? '' : parsed;
    }
    setForm(prev => ({ ...prev, [field]: processedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const processedData = await processClassData(form);
      const { error } = classIdToEdit
        ? await supabase.from('classes').update(processedData).eq('id', classIdToEdit)
        : await supabase.from('classes').insert([processedData as Database['public']['Tables']['classes']['Insert']]);
      if (error) throw error;
      setStatus(classIdToEdit ? 'Class updated successfully!' : 'Class added successfully!');
      onClassUpdated();
      setForm(EMPTY_FORM);
      setOriginalForm(EMPTY_FORM);
      setClassIdToEdit(null);
    } catch (error) {
      if (error instanceof Error) {
        setStatus(`Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!classIdToEdit || !window.confirm('Are you sure you want to delete this class?')) return;
    setLoading(true);
    setStatus(null);
    try {
      const { error } = await supabase.from('classes').delete().eq('id', classIdToEdit);
      if (error) throw error;
      setStatus('Class deleted successfully!');
      onClassUpdated();
      onCancelEdit();
    } catch (error) {
      if (error instanceof Error) {
        setStatus(`Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return form.name.trim() !== '' && form.classType !== '' && form.dayOfWeek !== '' && form.startTime.trim() !== '' && form.endTime.trim() !== '' && form.frequency !== '';
  };

  const getFieldStatus = (field: keyof FormState) => {
    const isChanged = form[field] !== originalForm[field];
    return { isChanged, isPending: false }; // No pending logic for this form
  };

  return {
    form,
    classIdToEdit,
    status,
    loading,
    handleChange,
    handleSubmit,
    handleDelete,
    isFormValid,
    getFieldStatus,
  };
};
