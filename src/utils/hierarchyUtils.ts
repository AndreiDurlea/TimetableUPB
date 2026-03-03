import { supabase } from '../lib/supabase';

export const resolveHierarchy = async (hierarchyString: string) => {
    let facultyId: string | null = null;
    let domainId: string | null = null;
    let seriesId: string | null = null;
    let groupId: string | null = null;
    let subgroupId: string | null = null;

    const parts = hierarchyString.split('-');
    if (parts.length > 0 && parts[0].trim()) {
      const facultyShorthand = parts[0].trim();
      const { data: facultyData, error: facultyError } = await supabase.from('faculties').select('id').eq('shorthand', facultyShorthand).single();
      if (facultyError && facultyError.code !== 'PGRST116') throw facultyError;
      if (facultyData) {
        facultyId = facultyData.id;
      } else {
        const { data: newFaculty, error: insertFacultyError } = await supabase.from('faculties').insert([{ shorthand: facultyShorthand, full_name: facultyShorthand }]).select('id').single();
        if (insertFacultyError) throw insertFacultyError;
        if (newFaculty) facultyId = newFaculty.id;
      }
    }

    if (parts.length > 1 && parts[1].trim() && facultyId) {
      const domainName = parts[1].trim();
      const { data: domainData, error: domainError } = await supabase.from('domains').select('id').eq('name', domainName).eq('faculty_id', facultyId).single();
      if (domainError && domainError.code !== 'PGRST116') throw domainError;
      if (domainData) {
        domainId = domainData.id;
      } else {
        const { data: newDomain, error: insertDomainError } = await supabase.from('domains').insert([{ name: domainName, faculty_id: facultyId }]).select('id').single();
        if (insertDomainError) throw insertDomainError;
        if (newDomain) domainId = newDomain.id;
      }
    }

    if (parts.length > 2 && parts[2].trim() && domainId) {
      const seriesName = parts[2].trim();
      const { data: seriesData, error: seriesError } = await supabase.from('series').select('id').eq('name', seriesName).eq('domain_id', domainId).single();
      if (seriesError && seriesError.code !== 'PGRST116') throw seriesError;
      if (seriesData) {
        seriesId = seriesData.id;
      } else {
        const { data: newSeries, error: insertSeriesError } = await supabase.from('series').insert([{ name: seriesName, domain_id: domainId }]).select('id').single();
        if (insertSeriesError) throw insertSeriesError;
        if (newSeries) seriesId = newSeries.id;
      }
    }

    if (parts.length > 3 && parts[3].trim() && seriesId) {
      const groupAndSubgroup = parts[3].trim();
      const groupMatch = groupAndSubgroup.match(/^(\d+)([a-zA-Z]?)$/);
      if (!groupMatch) throw new Error(`Invalid group/subgroup format: ${groupAndSubgroup}. Expected e.g., 313a`);

      const groupName = groupMatch[1];
      const subgroupName = groupMatch[2] || null;

      const { data: groupData, error: groupError } = await supabase.from('groups').select('id').eq('name', groupName).eq('series_id', seriesId).single();
      if (groupError && groupError.code !== 'PGRST116') throw groupError;
      if (groupData) {
        groupId = groupData.id;
      } else {
        const { data: newGroup, error: insertGroupError } = await supabase.from('groups').insert([{ name: groupName, series_id: seriesId }]).select('id').single();
        if (insertGroupError) throw insertGroupError;
        if (newGroup) groupId = newGroup.id;
      }

      if (subgroupName && groupId) {
        const { data: subgroupData, error: subgroupError } = await supabase.from('subgroups').select('id').eq('name', subgroupName).eq('group_id', groupId).single();
        if (subgroupError && subgroupError.code !== 'PGRST116') throw subgroupError;
        if (subgroupData) {
          subgroupId = subgroupData.id;
        } else {
          const { data: newSubgroup, error: insertSubgroupError } = await supabase.from('subgroups').insert([{ name: subgroupName, group_id: groupId }]).select('id').single();
          if (insertSubgroupError) throw insertSubgroupError;
          if (newSubgroup) subgroupId = newSubgroup.id;
        }
      }
    }

    return { facultyId, domainId, seriesId, groupId, subgroupId };
};
