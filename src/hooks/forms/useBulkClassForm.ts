import { useState } from 'react';
import { supabase } from '../../lib/supabase.ts';
import { processClassData } from '../../utils/classDataUtils.ts';
import type { FormState } from '../../lib/types.ts';
import type { Database } from '../../lib/database.types.ts';

type ClassInsert = Database['public']['Tables']['classes']['Insert'];

export const useBulkClassForm = (onClassUpdated: () => void) => {
  const [jsonInput, setJsonInput] = useState<string>('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleBulkAdd = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const classesToInsert: FormState[] = JSON.parse(jsonInput);
      if (!Array.isArray(classesToInsert)) {
        setStatus("JSON input must be an array of class objects.");
        return;
      }
      for (const classItem of classesToInsert) {
        const processedData = await processClassData(classItem);
        const insertData: ClassInsert = processedData as unknown as ClassInsert;
        
        const { error } = await supabase.from('classes').insert(insertData);
        if (error) {
          setStatus(`Error inserting class: ${error.message}`);
          return;
        }
      }
      setStatus(`Successfully added ${classesToInsert.length} classes!`);
      setJsonInput('');
      onClassUpdated();
    } catch (error) {
      if (error instanceof Error) {
        setStatus(`Error processing JSON: ${error.message}`);
      } else {
        setStatus(`An unknown error occurred`);
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    jsonInput,
    status,
    loading,
    setJsonInput,
    handleBulkAdd,
  };
};
