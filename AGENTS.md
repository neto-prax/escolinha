# Architecture Rules

- Centralize WhatsApp inbox state in `WhatsAppInboxProvider` so one page creates only one realtime subscription and one query set.
- Keep Uazapi webhook setup explicit; status checks must remain read-only to avoid repeated provider calls.
- Persist each provider message id once and resolve inbound messages only through a configured school instance to preserve tenant isolation.
- Copy inbound WhatsApp media into `message-media` under school/conversation paths before rendering, because provider URLs are temporary.
- Keep pedagogical media exclusively in each school's Google Drive using resumable browser uploads; keep OAuth credentials server-only and authorize all school operations on the server to prevent cross-tenant access.
- Handle school Drive consent on a public same-origin callback with one-use server-held state and encrypted refresh tokens; this keeps authorization independent of sign-in and prevents replay.