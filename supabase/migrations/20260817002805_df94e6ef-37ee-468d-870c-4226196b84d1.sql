INSERT INTO public.daily_report_settings (school_id, recipients, send_hour, is_active)
VALUES ('1061e1ae-4f08-490e-83e9-2a9a11d42c2e', ARRAY['557583690441'], 21, true)
ON CONFLICT (school_id) DO UPDATE SET recipients = EXCLUDED.recipients, send_hour = EXCLUDED.send_hour, is_active = true;