# Architecture Rules

- Centralize WhatsApp inbox state in `WhatsAppInboxProvider` so one page creates only one realtime subscription and one query set.
- Keep Uazapi webhook setup explicit; status checks must remain read-only to avoid repeated provider calls.
- Persist each provider message id once and resolve inbound messages only through a configured school instance to preserve tenant isolation.