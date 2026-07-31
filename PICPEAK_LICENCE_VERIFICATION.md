<!--
---
file: PICPEAK_LICENCE_VERIFICATION.md
project: earthandhoney
purpose: AC-15.1 — record the evidence that the PicPeak upstream repository
         actually exists and is obtainable, and that its licence was
         confirmed by reading the LICENSE file in the repository directly
         (not by trusting documentation or a hosting platform's inferred
         licence badge). Documents the stop condition (non-MIT licence ->
         scrum-master/po-requests.md) and states that it was not triggered.
created-by: dev-team
related-story: US-15
related-ac: 15.1
---
-->

# PicPeak Upstream — Existence and Licence Verification (AC-15.1)

## 1. Repository exists and is obtainable

- **Upstream URL:** `https://github.com/PicPeak/picpeak`
- **Verification method:** `git ls-remote https://github.com/PicPeak/picpeak.git HEAD`
- **Result:** the remote resolved and returned a live `HEAD` commit, confirming the
  repository exists and is clonable over HTTPS without authentication:

  ```
  3bcded78a448f5b099e87a73c7f1e44e859882aa	HEAD
  ```

- **Note on repository location:** the repository was previously hosted at
  `github.com/the-luap/picpeak` and now redirects (HTTP 301) to
  `github.com/PicPeak/picpeak`, its current canonical location, indicating a
  repository transfer rather than a fork or unrelated project. The GitHub API
  confirms `full_name: "PicPeak/picpeak"`, `fork: false`, `archived: false`,
  `default_branch: "main"`.
- **Description (repository metadata, informational only — not relied on for
  the licence determination below):** "Self-hosted photo sharing platform for
  photographers & events... Built with React + Node.js" — consistent with the
  PRD's assumption about what PicPeak is.

## 2. Licence confirmed by reading the LICENSE file directly

The PRD assumes an MIT licence. Per AC-15.1, this was **not** taken on trust
from documentation or from GitHub's automatically inferred licence badge —
the actual `LICENSE` file at the repository root was fetched and its raw
content read.

- **File:** `LICENSE` at the repository root, default branch (`main`), blob
  sha `5960b00fc95a4ef6c6623ce438a2900e7fae1f1d`.
- **Retrieval method:** GitHub Contents API
  (`GET /repos/PicPeak/picpeak/contents/LICENSE`), response `content` field
  base64-decoded to plain text.
- **Full text read:**

  ```
  MIT License

  Copyright (c) 2025 paul

  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
  ```

- **Classification:** this text matches the standard MIT License heading and
  permission grant (see `classifyLicenceText` in
  `src/lib/licenceVerification.ts`, which encodes this same check as
  unit-tested, reusable logic).

## 3. Conclusion and stop-condition status

**Licence confirmed: MIT.** This matches the PRD's assumption.

Per AC-15.1's stop condition — "If the licence is not MIT as the PRD assumes,
work stops and the Product Owner is notified through
`scrum-master/po-requests.md`" — that condition is **not** triggered. No
Product Owner notification was raised for this AC, and the pivot may proceed
to AC-15.2 (pinned-commit capability audit) on the basis that the upstream
repository exists, is obtainable, and is MIT-licensed.

- **Verified:** 2026-07-31
- **Verified by:** dev-team (US-15, AC-15.1)
