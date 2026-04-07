import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useGuardianPortalAccess = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['guardian-portal-access', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('guardian_portal_access')
        .select('*, guardians(*)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};

export const useGuardianStudents = (guardianId: string | undefined) => {
  return useQuery({
    queryKey: ['guardian-students', guardianId],
    queryFn: async () => {
      if (!guardianId) return [];
      const { data: links, error: linksError } = await supabase
        .from('student_guardians')
        .select('student_id')
        .eq('guardian_id', guardianId);
      if (linksError) throw linksError;
      if (!links?.length) return [];

      const studentIds = links.map(l => l.student_id);
      const { data: students, error } = await supabase
        .from('students')
        .select('*, student_classes(*, classes(*))')
        .in('id', studentIds);
      if (error) throw error;
      return students || [];
    },
    enabled: !!guardianId,
  });
};

export const useStudentAttendance = (studentId: string | undefined) => {
  return useQuery({
    queryKey: ['guardian-student-attendance', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from('attendance')
        .select('*, classes(name)')
        .eq('student_id', studentId)
        .order('date', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId,
  });
};

export const useStudentGrades = (studentId: string | undefined) => {
  return useQuery({
    queryKey: ['guardian-student-grades', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from('grades')
        .select('*, classes(name)')
        .eq('student_id', studentId)
        .order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId,
  });
};

export const useStudentBilling = (studentId: string | undefined, guardianId: string | undefined) => {
  return useQuery({
    queryKey: ['guardian-student-billing', studentId, guardianId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from('billing')
        .select('*')
        .or(`student_id.eq.${studentId},guardian_id.eq.${guardianId}`)
        .order('due_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId,
  });
};

export const useSchoolCalendarPortal = (schoolId: string | undefined) => {
  return useQuery({
    queryKey: ['guardian-school-calendar', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from('school_calendar')
        .select('*')
        .eq('school_id', schoolId)
        .order('start_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });
};
