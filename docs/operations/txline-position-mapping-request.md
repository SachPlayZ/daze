# TxLINE soccer position mapping request

Send this to TxODDS support or the hackathon support channel. Do not ask them to grant access to private keys, JWTs, or API tokens.

```text
Subject: World Cup soccer lineup positionId mapping needed for TxLINE fantasy integration

We have an activated TxLINE devnet World Cup subscription and captured a real `Action = lineups` score record for fixture 18175981.

The captured players use `positionId` values 34, 35, 36, and 37 (with `unitId = 0`). Please provide the authoritative soccer mapping for each value to GK, DEF, MID, or FWD, including any version/source reference and whether mappings can vary by competition or gender.

We will store the response as versioned mapping evidence and fail closed for IDs not explicitly covered. We also verified that action `Data.PlayerId`, `PlayerInId`, and `PlayerOutId` join `lineups[].player.normativeId` in this fixture.

Could you also confirm whether `starter = true` is authoritative before kickoff and whether it can be amended later?
```

## Promotion checklist

After a reply arrives:

1. Save the response reference and exact mapping values in `docs/txline/provider-notes.md`.
2. Add a versioned mapping record with capture fixture `18175981`.
3. Add mapping and readiness tests for IDs `34` through `37`.
4. Re-run readiness against the captured lineup; unknown IDs must remain ineligible.
5. Promote `PLAYER_POSITION` only after those tests pass.
6. Re-evaluate every open contest before enabling the builder.
