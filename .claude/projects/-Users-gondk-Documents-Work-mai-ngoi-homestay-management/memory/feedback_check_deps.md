---
name: feedback-check-deps-before-install
description: Always verify package versions and vulnerabilities before installing npm dependencies
type: feedback
---

Always check latest stable versions and known CVEs/vulnerabilities before installing any npm packages. Never blindly install without version verification.

**Why:** User explicitly warned about this — they want zero vulnerability risk in their dependencies.

**How to apply:** Before any `npm install`, run `npm view <pkg> version` to confirm latest stable, check for known CVEs, and present findings to the user before proceeding. Run `npm audit` after install.
