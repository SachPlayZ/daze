# API boundary

Owns wallet sessions, draft commands, locks, entry transaction construction, contest reads, and Telegram linking. All user commands require wallet-backed authorization and idempotency keys. It must call `packages/domain` for team validation and never trust browser totals.

