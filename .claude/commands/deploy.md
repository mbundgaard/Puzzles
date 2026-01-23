# Deploy Issue Fix

Complete the deployment process for issue #$ARGUMENTS.

## Steps to perform:

1. **Changelog** - Add entry to `app/src/lib/components/ChangelogModal.svelte`:
   - Format: `{ issue: $ARGUMENTS, closedAt: '<current ISO timestamp>', submitter: '<check GitHub issue>' }`
   - Add at the TOP of the `changelogEntries` array

2. **Translations** - Add changelog text to all three files:
   - `app/src/lib/i18n/da.json` - Danish text under `changelog.$ARGUMENTS`
   - `app/src/lib/i18n/en.json` - English text under `changelog.$ARGUMENTS`
   - `app/src/lib/i18n/fr.json` - French text under `changelog.$ARGUMENTS`

3. **Registry** (if game was changed) - Update `app/src/lib/games/registry.ts`:
   - Set `updated: 'YYYY-MM-DD'` (today's date) for the affected game

4. **README** (if game was changed) - Update the **Updated** column in `README.md`

5. **Version** - Update `app/src/lib/version.ts`:
   - Set `APP_VERSION` to current Unix timestamp (run `date +%s`)

6. **Commit & Push**:
   - `git add -A`
   - `git commit -m "descriptive message"`
   - `git push -u origin <current-branch>`

7. **Set Server Version** - Call the API:
   ```
   curl -X POST "https://puzzlesapi.azurewebsites.net/api/version/set?code=<key>" \
     -H "Content-Type: application/json" \
     -d '{"version": <same timestamp as APP_VERSION>}'
   ```

8. **Close Issue** - Call the API:
   ```
   curl -X POST "https://puzzlesapi.azurewebsites.net/api/issue/close?code=<key>" \
     -H "Content-Type: application/json" \
     -d '{"issueNumber": $ARGUMENTS, "comment": "**Fixed:** <description>"}'
   ```

**Function key derivation:** `echo -n "puzzles:<password>" | openssl dgst -sha256 -binary | base64`

Ask the user for the password if not already known in this session.
