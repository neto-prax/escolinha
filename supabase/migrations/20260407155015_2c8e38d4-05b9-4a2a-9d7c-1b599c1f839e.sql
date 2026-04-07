CREATE POLICY "Guardians can view occurrences for their students"
ON public.psychology_records FOR SELECT TO authenticated
USING (
  record_type = 'ocorrencia' AND
  student_id IN (SELECT get_guardian_student_ids(get_guardian_id_for_user(auth.uid())))
);