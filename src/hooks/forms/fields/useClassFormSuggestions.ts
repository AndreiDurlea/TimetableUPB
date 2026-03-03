import { useCallback } from 'react';
import { supabase } from '../../../lib/supabase.ts';

export const useClassFormSuggestions = () => {
  const fetchClassSuggestions = useCallback(async (query: string) => {
    const { data } = await supabase.from('classes').select('name').ilike('name', `%${query}%`).limit(5);
    return data?.map(d => d.name || '') || [];
  }, []);

  const fetchTeacherSuggestions = useCallback(async (query: string) => {
    const { data } = await supabase.from('teachers').select('name').ilike('name', `%${query}%`).limit(5);
    return data?.map(d => d.name || '') || [];
  }, []);

  const fetchLocationSuggestions = useCallback(async (query: string) => {
    const match = query.match(/^([A-Za-z]+)(\d*)$/);
    if (!match) return [];
    const buildingShorthand = match[1].toUpperCase();
    const roomIndex = match[2];
    const { data } = await supabase.from('buildings').select(`shorthand, rooms(room_index)`).ilike('shorthand', `%${buildingShorthand}%`).limit(5);
    const suggestions: string[] = [];
    data?.forEach(b => {
      if (b.shorthand) {
        if (b.rooms && b.rooms.length > 0) {
          b.rooms.forEach(r => {
            if (r.room_index && r.room_index.startsWith(roomIndex)) {
              suggestions.push(`${b.shorthand}${r.room_index}`);
            }
          });
        } else if (!roomIndex) {
          suggestions.push(b.shorthand);
        }
      }
    });
    return suggestions;
  }, []);

  return {
    fetchClassSuggestions,
    fetchTeacherSuggestions,
    fetchLocationSuggestions,
  };
};
