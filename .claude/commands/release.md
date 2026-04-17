Release a new version of the github-toc Obsidian plugin to GitHub.

Follow these steps in order:

1. Read `manifest.json` to find the current version. Suggest the next patch version (e.g. 0.1.1 → 0.1.2) unless the user specifies otherwise. Confirm the new version with the user before proceeding.

2. Ask the user for a brief summary of what changed in this release (used for the GitHub release notes). If they say "you know" or similar, summarise based on recent code changes visible in git log.

3. Update `manifest.json` — bump the `version` field to the new version.

4. Update `versions.json` — add a new entry `"<new-version>": "0.15.0"` (minAppVersion stays 0.15.0 unless told otherwise).

5. Run `npm run build` and confirm it completes with no errors.

6. Commit only `manifest.json` and `versions.json`:
   ```
   git add manifest.json versions.json
   git commit -m "Bump version to <new-version>"
   ```

7. Push to GitHub:
   ```
   git push
   ```

8. Create the GitHub release with all three required asset files:
   ```
   gh release create <new-version> main.js manifest.json styles.css \
     --repo PittBie/github-toc \
     --title "<new-version>" \
     --notes "<release notes from step 2>"
   ```

9. Report the release URL to the user.

Important rules:
- The release tag must match `manifest.json` version exactly — no `v` prefix.
- Always attach `main.js`, `manifest.json`, and `styles.css` as individual assets (not zipped).
- Do not push `main.js` to git — it is gitignored intentionally and delivered only via the release.
- The obsidian-releases PR does NOT need to be updated for new versions — it already points to the repo.
