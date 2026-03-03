import React, { useRef } from 'react';
import { useProfileForm } from '../../../hooks/forms/useProfileForm.ts';
import FormSelect from '../../ui/forms/fields/FormSelect.tsx';
import FormContainer from '../../ui/forms/FormContainer.tsx';
import useOnScreen from '../../../hooks/misc/useOnScreen.ts';
import FloatingWarning from '../../ui/FloatingWarning.tsx';
import styles from './ProfileForm.module.css';
import type { Database } from '../../../lib/database.types.ts';

type Class = Database['public']['Tables']['classes']['Row'];

interface ProfileFormProps {
  isProfilePage?: boolean;
  children?: React.ReactNode;
}

const WarningIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '1em', height: '1em', marginRight: '5px' }}>
      <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
    </svg>
);

const ArrowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '1em', height: '1em', margin: '0 8px', verticalAlign: 'middle' }}>
    <path fillRule="evenodd" d="M16.72 7.72a.75.75 0 011.06 0l3.75 3.75a.75.75 0 010 1.06l-3.75 3.75a.75.75 0 11-1.06-1.06l2.47-2.47H3a.75.75 0 010-1.5h16.19l-2.47-2.47a.75.75 0 010-1.06z" clipRule="evenodd" />
  </svg>
);

const ProfileForm: React.FC<ProfileFormProps> = ({ isProfilePage = false, children }) => {
  const { 
    selection, 
    options, 
    status, 
    handleSelectChange, 
    save, 
    isDirty,
    defaultClassCount,
    originalDefaultClassCount,
    addedClassCount,
    removedClassCount,
    conflictingManualClasses,
    persistedManualCount,
    persistedRemovedCount,
    getFieldStatus
  } = useProfileForm(isProfilePage);
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isButtonOnScreen = useOnScreen(buttonRef);

  const isFormComplete = !!selection.subgroupId;
  const isDangerousSave = conflictingManualClasses.length > 0;

  const getClassText = (count: number) => `${count} class${count === 1 ? '' : 'es'}`;

  const formatWarningMessage = (conflicts: Class[]): string => {
    if (conflicts.length === 0) return "";
    const n = conflicts.length;
    const firstTwo = conflicts.slice(0, 2).map(c => `${c.shorthand}(${c.class_type})`).join(', ');
    let message = `Saving will unenroll you from: ${firstTwo}`;
    if (n > 2) {
      message += ` + ${n - 2} other${n - 2 > 1 ? 's' : ''}`;
    }
    return message;
  };

  const warningMessage = formatWarningMessage(conflictingManualClasses);

  const getIsChanged = (field: keyof typeof selection) => {
      if (isProfilePage) {
          return getFieldStatus(field).isChanged;
      }
      return !!selection[field];
  };

  return (
      <div className={styles.container}>
        {isProfilePage && (
            <div className={styles.header}>
              <h2 className={styles.title}>Profile Settings</h2>
              <p className={styles.description}>
                Your default set of classes. Editing this will overwrite any manual edits made below.
              </p>
            </div>
        )}

        <FormContainer onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <FormSelect
              label="Faculty"
              value={selection.facultyId}
              onChange={(val) => handleSelectChange('facultyId', val)}
              options={options.faculties.map(f => ({ id: f.id, label: f.shorthand }))}
              {...getFieldStatus('facultyId')}
              isChanged={getIsChanged('facultyId')}
          />

          <FormSelect
              label="Field of Study"
              value={selection.domainId}
              onChange={(val) => handleSelectChange('domainId', val)}
              options={options.domains.map(d => ({ id: d.id, label: d.name }))}
              disabled={!selection.facultyId}
              {...getFieldStatus('domainId')}
              isChanged={getIsChanged('domainId')}
          />

          <FormSelect
              label="Series"
              value={selection.seriesId}
              onChange={(val) => handleSelectChange('seriesId', val)}
              options={options.series.map(s => ({ id: s.id, label: s.name }))}
              disabled={!selection.domainId}
              {...getFieldStatus('seriesId')}
              isChanged={getIsChanged('seriesId')}
          />

          <FormSelect
              label="Group"
              value={selection.groupId}
              onChange={(val) => handleSelectChange('groupId', val)}
              options={options.groups.map(g => ({ id: g.id, label: g.name }))}
              disabled={!selection.seriesId}
              {...getFieldStatus('groupId')}
              isChanged={getIsChanged('groupId')}
          />

          <FormSelect
              label="Subgroup"
              value={selection.subgroupId}
              onChange={(val) => handleSelectChange('subgroupId', val)}
              options={options.subgroups.map(s => ({ id: s.id, label: s.name }))}
              disabled={!selection.groupId}
              {...getFieldStatus('subgroupId')}
              isChanged={getIsChanged('subgroupId')}
          />

          {isProfilePage && (
              <div className={styles.saveButtonContainer}>
                <button
                    ref={buttonRef}
                    type="submit"
                    disabled={!isDirty || !isFormComplete}
                    className={`gray-button ${styles.saveButton}`}
                    style={{
                      backgroundColor: isDangerousSave ? '#d32f2f' : ((isDirty && isFormComplete) ? 'white' : '#f0f0f0'),
                      color: isDangerousSave ? 'white' : ((isDirty && isFormComplete) ? 'black' : '#ccc'),
                      border: `1px solid ${isDangerousSave ? '#d32f2f' : ((isDirty && isFormComplete) ? 'black' : '#ccc')}`,
                      cursor: (isDirty && isFormComplete) ? 'pointer' : 'default',
                    }}
                >
                  <WarningIcon />
                  Save edits
                </button>
              </div>
          )}
          
          {children}
        </FormContainer>
        
        <div className={styles.status}>
            {status ? (
                <span>{status}</span>
            ) : (
                isProfilePage && selection.subgroupId && (
                    <span className={styles.statusContent}>
                        {getClassText(originalDefaultClassCount)}
                        {removedClassCount > 0 && (
                            <span className={styles.removed}>
                                -{removedClassCount} removed
                            </span>
                        )}
                        {addedClassCount > 0 && (
                            <span className={styles.added}>
                                +{addedClassCount} added
                            </span>
                        )}
                        {isDirty && (
                            <>
                                <ArrowIcon />
                                <span>{getClassText(defaultClassCount)}</span>
                                {persistedRemovedCount > 0 && (
                                    <span className={styles.removed}>
                                        -{persistedRemovedCount} removed
                                    </span>
                                )}
                                {persistedManualCount > 0 && (
                                    <span className={styles.added}>
                                        +{persistedManualCount} added
                                    </span>
                                )}
                            </>
                        )}
                    </span>
                )
            )}
        </div>
        <FloatingWarning show={isDangerousSave && isButtonOnScreen} message={warningMessage} />
      </div>
  );
};

export default ProfileForm;
