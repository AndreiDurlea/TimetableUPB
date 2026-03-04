import { supabase } from '../lib/supabase';
import type { FormState } from '../lib/types';
import type { Database } from '../lib/database.types';
import { resolveHierarchy } from './hierarchyUtils';

type ClassesUpdate = Database['public']['Tables']['classes']['Update'];

interface AssignedIds {
  faculty_id: string | null;
  domain_id: string | null;
  series_id: string | null;
  group_id: string | null;
  subgroup_id: string | null;
}

export const processClassData = async (classData: FormState): Promise<ClassesUpdate> => {
    let teacherId: string | null = null;
    if (classData.teacherName) {
      const { data: existingTeacher } = await supabase.from('teachers').select('id').eq('name', classData.teacherName).single();
      if (existingTeacher) {
        teacherId = existingTeacher.id;
      } else {
        const { data: newTeacher, error: teacherError } = await supabase.from('teachers').insert([{ name: classData.teacherName }]).select('id').single();
        if (teacherError) throw teacherError;
        if (newTeacher) teacherId = newTeacher.id;
      }
    }

    let roomId: string | null = null;
    if (classData.location) {
      const match = classData.location.match(/^([A-Za-z]+)(\d+)$/);

      if (match) {
        const buildingShorthand = match[1].toUpperCase();
        const roomIndex = match[2];

        let buildingId: string | null = null;
        const { data: existingBuilding } = await supabase.from('buildings').select('id').eq('shorthand', buildingShorthand).single();
        if (existingBuilding) {
          buildingId = existingBuilding.id;
        } else {
          const { data: newBuilding, error: buildingError } = await supabase.from('buildings').insert([{ shorthand: buildingShorthand }]).select('id').single();
          if (buildingError) throw buildingError;
          if (newBuilding) buildingId = newBuilding.id;
        }

        const { data: existingRoom } = await supabase.from('rooms').select('id').eq('building_id', buildingId as string).eq('room_index', roomIndex).single();
        if (existingRoom) {
          roomId = existingRoom.id;
        } else {
          const { data: newRoom, error: roomError } = await supabase.from('rooms').insert([{ building_id: buildingId, room_index: roomIndex }]).select('id').single();
          if (roomError) throw roomError;
          if (newRoom) roomId = newRoom.id;
        }
      } else {
        const { data: existingRoom } = await supabase.from('rooms').select('id').eq('name', classData.location).single();
        if (existingRoom) {
          roomId = existingRoom.id;
        } else {
          const { data: newRoom, error: roomError } = await supabase.from('rooms').insert([{ name: classData.location }]).select('id').single();
          if (roomError) throw roomError;
          if (newRoom) roomId = newRoom.id;
        }
      }
    }

    const { facultyId, domainId, seriesId, groupId, subgroupId } = await resolveHierarchy(classData.hierarchy);

    const assignedIds: AssignedIds = { faculty_id: null, domain_id: null, series_id: null, group_id: null, subgroup_id: null };
    if (subgroupId) assignedIds.subgroup_id = subgroupId;
    else if (groupId) assignedIds.group_id = groupId;
    else if (seriesId) assignedIds.series_id = seriesId;
    else if (domainId) assignedIds.domain_id = domainId;
    else if (facultyId) assignedIds.faculty_id = facultyId;

    return {
      shorthand: classData.shorthand || undefined,
      name: classData.name,
      class_type: classData.classType,
      day_of_week: classData.dayOfWeek === '' ? undefined : classData.dayOfWeek,
      start_time: classData.startTime,
      end_time: classData.endTime,
      frequency: classData.frequency,
      teacher_id: teacherId,
      room_id: roomId,
      ...assignedIds,
    };
};
