-- 1. Remove a constraint de tipo único e converte para array
ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_contact_type_check;

-- 2. Adicionar nova coluna de tipos (array)
ALTER TABLE public.contacts ADD COLUMN contact_types TEXT[] DEFAULT ARRAY['other'];

-- 3. Migrar dados existentes para o novo formato
UPDATE public.contacts SET contact_types = ARRAY[contact_type] WHERE contact_types IS NULL OR contact_types = '{}';

-- 4. Criar função para validar tipos permitidos
CREATE OR REPLACE FUNCTION public.validate_contact_types()
RETURNS TRIGGER AS $$
DECLARE
  allowed_types TEXT[] := ARRAY['lead', 'guardian', 'student', 'staff', 'other'];
  t TEXT;
BEGIN
  IF NEW.contact_types IS NULL OR array_length(NEW.contact_types, 1) IS NULL THEN
    NEW.contact_types := ARRAY['other'];
  END IF;
  
  FOREACH t IN ARRAY NEW.contact_types
  LOOP
    IF NOT (t = ANY(allowed_types)) THEN
      RAISE EXCEPTION 'Invalid contact type: %. Allowed types: lead, guardian, student, staff, other', t;
    END IF;
  END LOOP;
  
  -- Manter contact_type sincronizado com o primeiro tipo do array para retrocompatibilidade
  NEW.contact_type := NEW.contact_types[1];
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar trigger para validação
DROP TRIGGER IF EXISTS validate_contact_types_trigger ON public.contacts;
CREATE TRIGGER validate_contact_types_trigger
  BEFORE INSERT OR UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_contact_types();

-- 6. Criar índice GIN para busca eficiente por tipos
CREATE INDEX IF NOT EXISTS idx_contacts_types ON public.contacts USING GIN(contact_types);