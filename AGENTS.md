# SALON NOTE: Excel uploads through ChatGPT

When the user uploads Excel files and asks to update SALON NOTE, complete the following workflow. Do not promise an attachment-triggered background service. It is an agent-driven workflow requiring the connected GitHub write capability.

## Never publish confidential inputs

- Never commit Excel files, decrypted JSON, raw values in logs or PR descriptions, private keys, private backups, or test-generated recipient keys.
- Do not use GitHub Actions artifacts, public Issues, comments, or repository files as plaintext transport.
- Only code, documentation, synthetic tests, user-approved public encryption keys, encrypted envelopes and public manifests belong in GitHub.
- Work with source Excel and intermediate files outside this checkout. `scripts/prepare-sync.cjs` enforces an external output folder.

## One-time recipient setup

1. Have the user use SALON NOTE's initial setup on their iPhone and send ONLY the public JWK. Never request a private key.
2. Validate `kty`, modulus size and absence of `d`, `p`, `q`, `dp`, `dq`, `qi`. Compute the recipient ID with `SalonCrypto.keyId`.
3. Store the public JWK (only `SalonCrypto.publicOnly` fields) and the explicitly chosen store ID in `sync-recipient.json`: `{ "version": 2, "store": "funabori", "publicKey": { ... } }`. Use the user's actual provided key, never a temporary or generated key.
4. The owner has authorized the same store and all staff actuals for enrolled staff devices. Maintain `sync-recipients.json` version 1 with `{keyId, store, scope:"store-all", enabled:true, publicKey}` entries. Keep the owner entry and existing histories. Register only actual public keys supplied for this purpose via the owner; never guess recipients. Never share private keys. No staff device is enrolled merely by opening the URL.
5. On enrollment, send the available historical workbooks to the new device with `--scope store-all`; this migrates its personal view only after successful delivery and preserves its records. Conflicting existing values still require review. Do not delete local data to bypass conflicts.

## Each upload

1. Fetch current main, AGENTS.md, `sync-recipient.json`, and `sync/<keyId>/manifest.json` from GitHub. A missing recipient means setup is required; no plaintext fallback. A genuinely absent manifest is the first update, not a reason to overwrite an existing history.
2. Materialize the user-supplied workbook bytes privately. Confirm store identity: these templates do not reliably identify their store, so use the established recipient/store association. Ask if the user supplied files from another store or identity is ambiguous.
3. Run `scripts/prepare-sync.cjs` with the public key, store ID, latest manifest (unless truly absent), and ALL supplied workbooks. The script uses the same parser as manual imports. It merges the workbooks, refuses intra-batch conflicts, hashes sources, and encrypts the complete patch. It never prints raw sales.
4. Inspect validation results and record counts. Do not alter values or infer missing metrics. Fix a recognized parser defect and test before proceeding; otherwise report the specific unsupported layout.
5. Ensure the output contains only encrypted envelopes and the public manifest. Publish both files in ONE Git tree/commit rooted at the fetched main commit, preserving all existing history and unrelated paths. Update the branch with `expected_sha` and no force. Do not put plaintext in commit messages.
6. If the branch lease fails, fetch the new head and manifest and regenerate the update. Never force-push over concurrent work. If identical source hashes are sent again, the receiver treats already-applied sources as duplicates.
7. Report the committed revision and link, and distinguish publication from confirmed iPhone receipt. The iPhone syncs when open/foregrounded; no second file selection is required. Existing-value conflicts require the phone user to review; do not claim they were silently overwritten.

## Testing

Run `node --test tests/sync.test.cjs` and `node tests/dashboard-smoke.cjs` for synchronization changes. For parser changes also run `node tests/real-workbooks.cjs` against the actual private files when available. This last test expects the two 2026 source templates used for initial development; update assertions for later periods instead of modifying their real data. Never commit those fixtures. The simulated DOM test is NOT a real browser/iPhone test.

## Team delivery (use for every future Excel upload)

Fetch the latest `sync-recipients.json` and the manifest for EVERY enabled recipient of the requested store. Save a private manifests JSON map keyed by keyId: the actual manifest or explicit null ONLY for a confirmed 404. Missing responses/errors are not null. Run `scripts/prepare-team.cjs --registry /private/registry.json --manifests /private/manifests.json --store funabori --out /private/new-output <workbooks>`. Publish the entire resulting sync directory in ONE commit only after the command succeeds for every device. Retain all prior envelope files and use expected_sha. Never publish partial failed output. The script excludes disabled devices. Disabling prevents future delivery, but cannot revoke already downloaded records. `sync-recipient.json` is legacy owner metadata; it is no longer the full delivery list.
