<!--
---
file: THIRD_PARTY_NOTICES.md
project: earthandhoney
purpose: AC-15.4 — reproduce the PicPeak upstream licence text and
         copyright notice in full, alongside notices for any other
         third-party code already copied into this repository, so
         redistribution obligations are recorded in one place rather than
         scattered across audit documents.
created-by: dev-team
related-story: US-15
related-ac: 15.4
---
-->

# Third-Party Notices

This file reproduces, in full, the licence text and copyright notice of
every piece of third-party code copied into this repository. It exists so
that redistribution obligations are satisfied in one authoritative place,
separate from the audit trail in `PICPEAK_LICENCE_VERIFICATION.md` and
`PIVOT_AUDIT.md`, which explain *how* each licence was verified rather than
reproduce it.

Completeness of each entry below (non-empty component, copyright, and full
licence text — not just a licence name) is checked by
`checkNoticeCompleteness` in `src/lib/thirdPartyNotices.ts`.

---

## 1. PicPeak

- **Component:** PicPeak (upstream repository forked under US-15/US-16)
- **Source:** `https://github.com/PicPeak/picpeak`, pinned commit
  `eb263137b98935754155824de2a03848121304b6` (see `PICPEAK_UPSTREAM.md`)
- **Licence:** MIT License, verified by reading the upstream `LICENSE` file
  directly (see `PICPEAK_LICENCE_VERIFICATION.md` for the verification
  method and evidence)

```
MIT License

Copyright (c) 2025 paul

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

---

## 2. Other code copied into this repository

The design template at `public/photobuddy/` (referenced in `CLAUDE.md` as
the visual reference the Gallery Engine and site must match) bundles several
third-party front-end libraries whose source files are copied verbatim into
this repository. Each carries its own notice, reproduced below from the
header comment of the copied file.

### 2.1 jQuery

- **Component:** jQuery v3.1.1
- **Copied at:** `public/photobuddy/js/jquery.js`
- **Copyright / licence notice (verbatim from the file header):**

```
jQuery v3.1.1 | (c) jQuery Foundation | jquery.org/license
```

- **Licence:** MIT License (jQuery Foundation's standard licence, referenced
  at `jquery.org/license`, as stated in the file header above).

### 2.2 FlexSlider

- **Component:** jQuery FlexSlider v2.6.2 (CSS) / v2.6.3 (JS)
- **Copied at:** `public/photobuddy/css/flexslider.css`,
  `public/photobuddy/js/flexslider.js`
- **Copyright / licence notice (verbatim from the CSS file header):**

```
jQuery FlexSlider v2.6.2
http://www.woothemes.com/flexslider/

Copyright 2012 WooThemes
Free to use under the GPLv2 and later license.
http://www.gnu.org/licenses/gpl-2.0.html

Contributing author: Tyler Smith (@mbmufffin)
```

- **Copyright / licence notice (verbatim from the JS file header):**

```
jQuery FlexSlider v2.6.3
Copyright 2012 WooThemes
Contributing Author: Tyler Smith
```

- **Licence:** GNU General Public License v2.0 or later, as stated above.

### 2.3 Theia Sticky Sidebar

- **Component:** Theia Sticky Sidebar v1.6.0
- **Copied at:** `public/photobuddy/js/sticky-sidebar.js`
- **Copyright / licence notice (verbatim from the file header):**

```
Theia Sticky Sidebar v1.6.0
https://github.com/WeCodePixels/theia-sticky-sidebar

Glues your website's sidebars, making them permanently visible while scrolling.

Copyright 2013-2016 WeCodePixels and other contributors
Released under the MIT license
```

- **Licence:** MIT License, as stated above.

### 2.4 Skeleton grid system (Themedo)

- **Component:** Responsive grid pixel system v1.1
- **Copied at:** `public/photobuddy/css/skeleton.css`
- **Copyright / licence notice (verbatim from the file header):**

```
Responsive grid pixel system - v1.1
Copyright 2015, Themedo
Author: Themedo
Created Date : 06-02-2015
```

- **Licence:** **Not stated in the file.** The header carries a copyright
  notice but no licence grant or reference. This is recorded here as-is
  rather than assumed; no redistribution rights beyond the copyright holder's
  are claimed for this file. Flagged for Product Owner awareness in
  `scrum-master/po-requests.md` if this file is ever redistributed outside
  this repository rather than used as an internal design reference.

### 2.5 The PhotoBuddy template itself

- **Component:** PhotoBuddy — HTML/CSS/JS design template
- **Copied at:** `public/photobuddy/` (all files not separately notice above)
- **Copyright / licence notice (verbatim, from `public/photobuddy/index.html`):**

```
© Copyright 2017.
Designed by FriendLab (https://themeforest.net/user/friendslaboratory)
```

- **Licence:** Commercial ThemeForest template licence (not an open-source
  licence). Per `CLAUDE.md`, this template is used **as a visual design
  reference** for the Gallery Engine and site pages — its own pictures are
  replaced with this project's gallery concept — not redistributed or resold
  as a standalone template. No further redistribution rights are claimed
  here beyond that internal reference use.

### 2.6 Fraunces and Inter (self-hosted webfonts)

- **Component:** Fraunces (display serif) and Inter (body/UI sans) — the
  two typefaces confirmed in `scrum-master/po-requests.md` item 9 (US-23
  AC-23.2), self-hosted from this repository rather than requested from
  `fonts.googleapis.com`/`fonts.gstatic.com`.
- **Copied at:** `public/fonts/fraunces/fraunces-latin-{300,400,600}-normal.woff2`
  and `public/fonts/inter/inter-latin-{400,500}-normal.woff2`, declared in
  `src/styles/fonts.css`.
- **Copyright notices (verbatim, from each family's OFL licence file):**

```
Copyright 2020 The Fraunces Project Authors (github.com/undercasetype/Fraunces)
```

```
Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter)
```

- **Licence text (SIL Open Font License, Version 1.1 — identical text ships
  with both families):**

```
-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.
```

- **Source of the vendored files:** the `@fontsource/fraunces` and
  `@fontsource/inter` npm packages (themselves OFL-licensed redistributions
  of the upstream Fraunces/Inter project files), used only to obtain
  correctly-subsetted `.woff2` binaries — the packages are not a runtime
  dependency of this project; only the specific weight files needed by
  `src/styles/tokens.css`'s approved font combinations were copied into
  `public/fonts/`.

---

*Last updated: 2026-07-31, alongside `PICPEAK_UPSTREAM.md` (AC-15.3).*
