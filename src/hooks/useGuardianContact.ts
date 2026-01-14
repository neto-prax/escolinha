import { supabase } from '@/integrations/supabase/client';

/**
 * Normalizes phone number for comparison (removes non-digits and ensures 55 prefix)
 */
function normalizePhone(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '');
  // Add 55 prefix if not present (Brazilian country code)
  if (digitsOnly.length >= 10 && digitsOnly.length <= 11 && !digitsOnly.startsWith('55')) {
    return '55' + digitsOnly;
  }
  return digitsOnly;
}

/**
 * Creates or updates a contact for a guardian, linking students.
 * This ensures guardians have a contact record for messaging.
 * If a contact with the same phone already exists, it updates that contact
 * to be linked to the guardian instead of creating a new one.
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

  const normalizedPhone = normalizePhone(guardianData.phone);

  try {
    // First, check if contact already exists for this guardian by guardian_id
    const { data: guardianContact, error: guardianFindError } = await supabase
      .from('contacts')
      .select('id, linked_student_ids')
      .eq('guardian_id', guardianId)
      .eq('school_id', schoolId)
      .maybeSingle();

    if (guardianFindError) {
      console.error('Error finding existing guardian contact:', guardianFindError);
      throw guardianFindError;
    }

    if (guardianContact) {
      // Update existing contact with new student links
      const currentStudentIds = guardianContact.linked_student_ids || [];
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
        .eq('id', guardianContact.id);

      if (updateError) throw updateError;
      return guardianContact.id;
    }

    // Check if there's an existing contact with the same phone number
    // that can be converted to a guardian contact
    const { data: existingContacts, error: phoneFindError } = await supabase
      .from('contacts')
      .select('id, linked_student_ids, guardian_id')
      .eq('school_id', schoolId)
      .is('guardian_id', null); // Only get contacts not already linked to a guardian

    if (phoneFindError) {
      console.error('Error finding contacts by phone:', phoneFindError);
      throw phoneFindError;
    }

    // Find a contact with matching phone
    const matchingContact = existingContacts?.find(contact => {
      // We need to fetch the phone for comparison
      return true; // Will filter below
    });

    // Get contacts with their phones
    const { data: contactsWithPhone, error: phoneError } = await supabase
      .from('contacts')
      .select('id, phone, linked_student_ids, guardian_id')
      .eq('school_id', schoolId)
      .is('guardian_id', null);

    if (phoneError) {
      console.error('Error fetching contacts with phone:', phoneError);
      throw phoneError;
    }

    // Find contact with matching normalized phone
    const existingPhoneContact = contactsWithPhone?.find(contact => {
      if (!contact.phone) return false;
      return normalizePhone(contact.phone) === normalizedPhone;
    });

    if (existingPhoneContact) {
      // Update existing contact to be linked to this guardian
      const currentStudentIds = existingPhoneContact.linked_student_ids || [];
      const mergedStudentIds = [...new Set([...currentStudentIds, ...studentIds])];

      const { error: updateError } = await supabase
        .from('contacts')
        .update({
          guardian_id: guardianId,
          full_name: guardianData.full_name,
          email: guardianData.email,
          contact_type: 'guardian',
          linked_student_ids: mergedStudentIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPhoneContact.id);

      if (updateError) throw updateError;
      
      console.log(`Contact ${existingPhoneContact.id} converted to guardian contact for guardian ${guardianId}`);
      return existingPhoneContact.id;
    }

    // No existing contact found, create new one
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
