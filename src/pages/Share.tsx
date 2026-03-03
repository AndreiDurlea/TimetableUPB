import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import styles from './Share.module.css';

const SELECTION_STORAGE_KEY = 'profile_selection';

const SharePage = () => {
  const { hierarchy } = useParams<{ hierarchy: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processHierarchy = async () => {
      if (!hierarchy) {
        navigate('/404');
        return;
      }

      const parts = hierarchy.split('-');
      if (parts.length !== 4) {
        navigate('/404');
        return;
      }

      const [faculty, domain, series, groupSubgroup] = parts;
      
      const groupMatch = groupSubgroup.match(/^(\d+)([a-zA-Z]+)$/);
      if (!groupMatch) {
        navigate('/404');
        return;
      }
      const group = groupMatch[1];
      const subgroup = groupMatch[2];

      const { data, error: rpcError } = await supabase.rpc('get_subgroup_id_from_hierarchy', {
        p_faculty_shorthand: faculty,
        p_domain_name: domain,
        p_series_name: series,
        p_group_name: group,
        p_subgroup_name: subgroup
      });

      if (rpcError || !data || data.length === 0 || !data[0].subgroup_id) {
        console.error('Error validating hierarchy:', rpcError);
        navigate('/404');
        return;
      }

      const { subgroup_id, faculty_id, domain_id, series_id, group_id } = data[0];

      const selection = {
        subgroupId: subgroup_id,
        facultyId: faculty_id,
        domainId: domain_id,
        seriesId: series_id,
        groupId: group_id,
      };
      localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(selection));
      sessionStorage.setItem('fromShare', 'true');

      navigate('/');
    };

    processHierarchy();
  }, [hierarchy, navigate]);

  if (error) {
    return (
      <div className={styles.container}>
        <p className={styles.errorText}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <LoadingIndicator />
      <p className={styles.loadingText}>Loading shared timetable...</p>
    </div>
  );
};

export default SharePage;
