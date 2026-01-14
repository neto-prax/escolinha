import { supabase } from '@/integrations/supabase/client';

/**
 * Ensures a contact exists for a conversation.
 * If a matching guardian is found by phone, syncs data from guardian.
 */
export async function ensureConversationContact(
  conversation: {
    id: string;
    phone: string;
    contact_name: string | null;
    contact_id: string | null;
    guardian_id?: string | null;
  },
  schoolId: string
): Promise<string | null> {
  // If already has a contact_id, check if guardian link needs sync
  if (conversation.contact_id) {
    await syncContactWithGuardian(conversation.contact_id, conversation.phone, schoolId);
    return conversation.contact_id;
  }

  try {
    // First, check if a guardian exists with this phone number
    const { data: guardian, error: guardianError } = await supabase
      .from('guardians')
      .select('id, full_name, phone, email')
      .eq('school_id', schoolId)
      .eq('phone', conversation.phone)
      .maybeSingle();

    if (guardianError) {
      console.error('Error finding guardian:', guardianError);
    }

    // Check if a contact already exists with this phone
    const { data: existingContact, error: findError } = await supabase
      .from('contacts')
      .select('id, guardian_id, contact_type')
      .eq('school_id', schoolId)
      .eq('phone', conversation.phone)
      .maybeSingle();

    if (findError) {
      console.error('Error finding existing contact:', findError);
      throw findError;
    }

    if (existingContact) {
      // Link conversation to existing contact
      await supabase
        .from('whatsapp_conversations')
        .update({ contact_id: existingContact.id })
        .eq('id', conversation.id);

      // If guardian exists but contact isn't linked to it, update
      if (guardian && !existingContact.guardian_id) {
        await syncContactWithGuardian(existingContact.id, conversation.phone, schoolId);
      }

      return existingContact.id;
    }

    // Create new contact
    let linkedStudentIds: string[] = [];

    // If guardian exists, get their linked students
    if (guardian) {
      const { data: studentGuardians } = await supabase
        .from('student_guardians')
        .select('student_id')
        .eq('guardian_id', guardian.id);

      if (studentGuardians && studentGuardians.length > 0) {
        linkedStudentIds = studentGuardians.map(sg => sg.student_id);
      }
    }

    const { data: newContact, error: createError } = await supabase
      .from('contacts')
      .insert({
        school_id: schoolId,
        phone: conversation.phone,
        full_name: guardian?.full_name || conversation.contact_name || conversation.phone,
        contact_type: guardian ? 'guardian' : 'other',
        guardian_id: guardian?.id || null,
        email: guardian?.email || null,
        linked_student_ids: linkedStudentIds.length > 0 ? linkedStudentIds : null,
      })
      .select('id')
      .single();

    if (createError) throw createError;

    // Update conversation with new contact_id
    await supabase
      .from('whatsapp_conversations')
      .update({ contact_id: newContact.id })
      .eq('id', conversation.id);

    return newContact.id;
  } catch (error) {
    console.error('Error ensuring conversation contact:', error);
    return null;
  }
}

/**
 * Syncs contact data with guardian data if a matching guardian exists.
 * Updates name, email, and linked students from guardian.
 */
export async function syncContactWithGuardian(
  contactId: string,
  phone: string,
  schoolId: string
): Promise<void> {
  try {
    // Find guardian with matching phone
    const { data: guardian, error: guardianError } = await supabase
      .from('guardians')
      .select('id, full_name, phone, email')
      .eq('school_id', schoolId)
      .eq('phone', phone)
      .maybeSingle();

    if (guardianError || !guardian) return;

    // Get current contact data
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, guardian_id, linked_student_ids')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) return;

    // Already linked to this guardian, check if data is in sync
    // Get students linked to this guardian
    const { data: studentGuardians } = await supabase
      .from('student_guardians')
      .select('student_id')
      .eq('guardian_id', guardian.id);

    const guardianStudentIds = studentGuardians?.map(sg => sg.student_id) || [];
    const currentStudentIds = contact.linked_student_ids || [];
    const mergedStudentIds = [...new Set([...currentStudentIds, ...guardianStudentIds])];

    // Update contact with guardian data
    await supabase
      .from('contacts')
      .update({
        guardian_id: guardian.id,
        full_name: guardian.full_name,
        email: guardian.email,
        contact_type: 'guardian',
        linked_student_ids: mergedStudentIds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId);

    console.log(`Contact ${contactId} synced with guardian ${guardian.id}`);
  } catch (error) {
    console.error('Error syncing contact with guardian:', error);
  }
}

/**
 * Batch sync all conversations without contacts
 */
export async function syncAllConversationContacts(schoolId: string): Promise<number> {
  try {
    // Get all conversations without contact_id
    const { data: conversations, error } = await supabase
      .from('whatsapp_conversations')
      .select('id, phone, contact_name, contact_id')
      .eq('school_id', schoolId)
      .is('contact_id', null);

    if (error) throw error;

    let synced = 0;
    for (const conv of conversations || []) {
      const contactId = await ensureConversationContact(conv, schoolId);
      if (contactId) synced++;
    }

    return synced;
  } catch (error) {
    console.error('Error syncing all conversation contacts:', error);
    return 0;
  }
}
