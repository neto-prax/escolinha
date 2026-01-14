import { supabase } from '@/integrations/supabase/client';

/**
 * Creates or updates a contact for a guardian, linking students.
 * This ensures guardians have a contact record for messaging.
 */
export async function ensureGuardianContact(
  guardianId: string,
  guardianData: {
    full_name: string;
    phone: string | null;
    email: string | null;
  },
  schoolId: string,
  studentIds: string[] = []
): Promise<string | null> {
  if (!guardianData.phone) {
    console.log('Guardian has no phone, skipping contact creation');
    return null;
  }

  try {
    // Check if contact already exists for this guardian
    const { data: existingContact, error: findError } = await supabase
      .from('contacts')
      .select('id, linked_student_ids')
      .eq('guardian_id', guardianId)
      .eq('school_id', schoolId)
      .maybeSingle();

    if (findError) {
      console.error('Error finding existing contact:', findError);
      throw findError;
    }

    if (existingContact) {
      // Update existing contact with new student links
      const currentStudentIds = existingContact.linked_student_ids || [];
      const mergedStudentIds = [...new Set([...currentStudentIds, ...studentIds])];

      const { error: updateError } = await supabase
        .from('contacts')
        .update({
          full_name: guardianData.full_name,
          phone: guardianData.phone,
          email: guardianData.email,
          linked_student_ids: mergedStudentIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingContact.id);

      if (updateError) throw updateError;
      return existingContact.id;
    }

    // Create new contact
    const { data: newContact, error: createError } = await supabase
      .from('contacts')
      .insert({
        school_id: schoolId,
        guardian_id: guardianId,
        full_name: guardianData.full_name,
        phone: guardianData.phone,
        email: guardianData.email,
        contact_type: 'guardian',
        linked_student_ids: studentIds,
      })
      .select('id')
      .single();

    if (createError) throw createError;
    return newContact.id;
  } catch (error) {
    console.error('Error ensuring guardian contact:', error);
    return null;
  }
}

/**
 * Adds a student to an existing guardian's contact
 */
export async function addStudentToGuardianContact(
  guardianId: string,
  studentId: string,
  schoolId: string
): Promise<void> {
  try {
    const { data: contact, error: findError } = await supabase
      .from('contacts')
      .select('id, linked_student_ids')
      .eq('guardian_id', guardianId)
      .eq('school_id', schoolId)
      .maybeSingle();

    if (findError) throw findError;

    if (contact) {
      const currentStudentIds = contact.linked_student_ids || [];
      if (!currentStudentIds.includes(studentId)) {
        const { error: updateError } = await supabase
          .from('contacts')
          .update({
            linked_student_ids: [...currentStudentIds, studentId],
            updated_at: new Date().toISOString(),
          })
          .eq('id', contact.id);

        if (updateError) throw updateError;
      }
    }
  } catch (error) {
    console.error('Error adding student to guardian contact:', error);
  }
}

/**
 * Gets billing status for students (adimplente/inadimplente)
 */
export async function getStudentsBillingStatus(
  studentIds: string[]
): Promise<Record<string, 'adimplente' | 'inadimplente' | 'desconhecido'>> {
  if (studentIds.length === 0) return {};

  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get all pending bills that are overdue
    const { data: overdueBills, error } = await supabase
      .from('billing')
      .select('student_id')
      .in('student_id', studentIds)
      .eq('status', 'pending')
      .lt('due_date', today);

    if (error) throw error;

    const overdueStudentIds = new Set(overdueBills?.map(b => b.student_id) || []);
    
    const result: Record<string, 'adimplente' | 'inadimplente' | 'desconhecido'> = {};
    for (const studentId of studentIds) {
      result[studentId] = overdueStudentIds.has(studentId) ? 'inadimplente' : 'adimplente';
    }
    
    return result;
  } catch (error) {
    console.error('Error getting billing status:', error);
    return studentIds.reduce((acc, id) => ({ ...acc, [id]: 'desconhecido' }), {});
  }
}
