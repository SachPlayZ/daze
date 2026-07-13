# Lessons

## Pattern

- Mistake: Shipped a Telegram preview when the requested demo flow needed actual delivery.
- Rule: Treat “show Telegram updates” as requiring the committed outbox + worker path unless the user explicitly asks for a preview.

## Pattern

- Mistake: Exposed operational settings as verbose command syntax instead of using Telegram's native controls.
- Rule: For a consumer bot, make common actions one-tap inline buttons; keep text commands as a fallback only.
