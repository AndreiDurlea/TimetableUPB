import React from 'react';
import SingleClassForm from './SingleClassForm.tsx';
import BulkClassForm from './BulkClassForm.tsx';
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

interface AddClassFormProps {
  initialClassData: DetailedClass | null;
  onClassUpdated: () => void;
  onCancelEdit: () => void;
}

const AddClassForm: React.FC<AddClassFormProps> = ({ initialClassData, onClassUpdated, onCancelEdit }) => {
  return (
    <div style={{ maxWidth: '1200px', margin: '20px auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <SingleClassForm
        initialClassData={initialClassData}
        onClassUpdated={onClassUpdated}
        onCancelEdit={onCancelEdit}
      />
      <BulkClassForm onClassUpdated={onClassUpdated} />
    </div>
  );
};

export default AddClassForm;
