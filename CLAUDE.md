# CLAUDE.md

Guidance for Claude Code, and for any other coding assistant working in this repository.
`AGENTS.md` in this same directory is the short version and points here.

---

## What this repository is

This repo **is** the live site for `ironcellresearch.com`.

- Branch `main` publishes straight to GitHub Pages. There is no bundler, no framework and no
  compile stage, so **the commit is the publish**. Whatever lands in `main` is what the public
  sees a minute or two later.
- `index.html` is a single self-contained file of about 1.8 MB and roughly 5,000 lines. It holds
  the storefront, the cart, checkout, the promotion logic, the age gate, the structured data and
  the analytics, all in one document.
- There is no staging environment. Verification happens against the live domain.

None of that is a problem on its own. It just means a careless write here is visible to customers
immediately, so the habits below are worth the thirty seconds they cost.

---

## 1. The habit that prevents almost every incident here

**Before that, one standing rule that outranks everything else in this file: Jimmy's order
pipeline is not ours to change.** His Google Sheet, his order emails to `orders@`, and the order
numbers in them are how he tracks, confirms, fulfils and ships physical product to real
customers. Do not add a writer to the sheet, a second sender on the Web3Forms key, a second
order-number format, or a renamed parameter - and do not edit or delete rows. See 2.1b. If
something there looks broken or missing, say so and hand the decision to Julien; a well-meant fix
in a live fulfilment queue can double-ship an order or stop his notifications entirely, and both
have already happened once.


**Pull the current `main`, edit that exact content in place, and commit only the lines you meant
to change.**

The failure mode this avoids is a whole-file write-back. If you generate `index.html` from a copy
you took earlier in the session, or from a local copy on disk, the write does not merge - it
replaces. Everything added to that file since your copy was taken is deleted silently. No error is
raised, nothing on the page looks different, and the loss is usually found weeks later when a
report comes back empty.

This is measured, not theoretical. A publish on 2026-08-23 changed 146 lines out of 5,025, a
deliberate and correct edit to the `<head>` and the footer, and it still removed the Google Ads
tag, a structured-data block and the admin link along the way, because it was written from an
older copy of the whole file. Google Ads then spent for 26 hours against a conversion signal that
had gone quiet.

So, concretely:

1. `git pull` (or fetch the current file) before you start. If you are working from HTML that was
   pasted into the conversation, confirm it matches `main` right now, or re-fetch it.
2. Find the specific block you need and change that block. Do not regenerate, reformat, prettify,
   minify or re-emit the whole document. Formatters in particular will rewrite all 5,000 lines and
   bury your real change.
3. `git diff` before you commit. If the diff touches anything outside what you set out to change,
   that is the write-back happening. Fix the diff first rather than committing and cleaning up
   afterwards.

---

## 2. The four regions that must survive every edit

If a change would remove or alter any of these, stop and put it back before committing.

### 2.1 Measurement, in `index.html`

The easiest thing on this list to lose without noticing, because nothing on the page changes when
it goes.

- The Google tag in the `<head>`: `googletagmanager.com/gtag/js?id=AW-18389709216` and the
  `gtag('config', 'AW-18389709216')` block under it.
- The **purchase** conversion, `AW-18389709216/BVXmCJiwnuIcEKDj8sBE`, inside `proceedWithOrder()`.
- The **newsletter signup** conversion, `AW-18389709216/jCpBCKnUsOIcEKDj8sBE`. It appears
  **twice**, and both are load-bearing: once in `subscribeNewsletter()` for the footer form, and
  once in the first-visit popup's own private `submit()`. These are two independent signup
  journeys with separate inputs and separate buttons - the popup never calls
  `subscribeNewsletter()`. Two occurrences is correct; one means a signup path lost its
  conversion. The same is true of `fbq('track','Lead')` and `ttq.track('SubmitForm')`.
- All three `<script type="application/ld+json">` blocks: `Organization`, `WebSite`, and the
  `ItemList` named `Research Peptides and Compounds` carrying 45 products. That third block is what
  makes the products eligible for rich results in search.
- The subscriber capture `ironcell-ingest?t=sub` on every page that has a sign-up form: `index.html`,
  `mvp.html`, `truetransformation.html`, and `amber/`, `billy/`, `carlos/`, `chel/`, `davu/`,
  `dupree/`, `merv/`, `ray/`.
- `research-supplies/index.html` carries its own copy of the Google tag. It is a separate file, so
  an edit to the homepage should never touch it.

Both conversions are wrapped in `try { if (typeof gtag === 'function') { ... } } catch (e) {}` on
purpose, so that a blocked or missing tag can never break checkout. Keep that shape if you ever
move them. The cost of that safety is that when the tag disappears, checkout keeps working
perfectly and throws no error - purchases simply stop being reported.

### 2.1b Jimmy's order pipeline. Do not change it.

**HARD RULE, from Julien, 2026-09-09, after this was got wrong:**

> "all of his systems should never be touched... you weren't supposed to change any of the
> systems in place for how he tracks confirms fulfils and ships orders."

Jimmy tracks, confirms, fulfils and ships from **his Google Sheet** and **the order emails to
`orders@ironcellresearch.com`**. Those two, plus the order numbers in them, are HIS operational
system. They are not ours to improve.

**Never, without Julien relaying Jimmy's explicit go-ahead:**

- add a new writer to his sheet, from any page
- introduce a second order-number FORMAT into it
- add a second sender on the Web3Forms key, or change a subject line
- rename, add or reorder the sheet parameters
- edit, reorder or delete rows in the sheet

This is not a style preference. It is a live fulfilment queue for physical product going to real
customers. A duplicate row can mean a double shipment; a changed subject line can silently break
a filter he forwards on; a second numbering scheme breaks the lookups he does by hand.

**What happened, so it is not repeated.** On 2026-09-08 the `/research-supplies/` page was found
to mirror only to the admin dashboard - it had never written his sheet row or sent his order
email, in any revision. Both paid campaigns land on that page, so ad-driven orders were the ones
missing (four of them: Aug 16, Aug 17, Aug 28 and Sep 6 2026, all invisible to his fulfilment).
The first fix, on 2026-09-08, got two things wrong and was reverted on 2026-09-09:

- It minted `IC-########` order numbers while the storefront mints six digits (plus a rep
  prefix on the clones). Two numbering schemes in one fulfilment sheet broke the lookups he
  does by hand against his order emails.
- Its sheet beacon referenced a const from another closure and silently never fired (see "the
  closure trap" below), so it looked connected and was not.
- The missing orders were then backfilled TWICE into a sheet nobody here could read back, which
  put duplicate, misaligned rows into his live queue. **Never write to a system you cannot read
  back.** The sheet CAN be read now - see "Reading his sheet" below.

The earlier note that a second sender on the shared Web3Forms key "starved" his order emails
was a theory, not a finding: that block fired once per order (four orders in a month) and the
eleven storefront files already send on that key. Whether his order emails actually stopped,
and why, is still unconfirmed; the check is whether the email for his own test order
136230 (2026-09-09 7:56 PM) arrived at `orders@`.

**Current, intended state (Julien, 2026-09-09 evening: "ensure orders from his website always
get tracked as he originally developed the site"):** `/research-supplies/` now sends the SAME
two calls the storefront sends, copied from `proceedWithOrder()` in `index.html` - the Web3Forms
order email (same key, recipient, subject line and body layout) and the Apps Script beacon (same
parameter names, date format, payment-method casing, items format) - and mints the main site's
six-digit order number. A row from the supplies page is indistinguishable from a main-site row,
which is the point: nothing in his process changes. Live since commit `eea0dea`.

| Destination | How | Storefront + clones | `/research-supplies/` |
|---|---|---|---|
| **Jimmy's Google Sheet** | `Image` GET to the Apps Script `/exec` | yes - do not touch | yes, identical - do not touch |
| **Order email** | `fetch` POST to web3forms -> `orders@` | yes - do not touch | yes, identical - do not touch |
| **Admin dashboard** | `Image` to `ironcell-ingest?t=order` | yes | yes |

**Reading his sheet.** From a docs.google.com tab signed in as him, the gviz endpoint returns any
tab as CSV with no download and no Drive scope:
`/spreadsheets/d/<id>/gviz/tq?tqx=out:csv&headers=0&authuser=<n>&gid=0&tq=select A,B,C limit 700`.
It drops fully empty rows, so its index is not the sheet row number. His Sheet1 layout is header
in row 1 and A=Order #, B=Date, C=Customer Name, D=Address, E=Email, F=Payment Method, G=Product
Price (the grand total), H=Tax, I=Shipping, J=Tracking Number, K=Status, L=Notes (the items
string), N=Tracking Sent, O=Inv Processed, P=Subtotal (ARRAYFORMULA G-H-I). Raw rows from the
Apps Script are white; rows he has worked are green with K="paid". The sheet ends at its last
data row because the script uses appendRow - add rows before typing below it. Rows added by MM
by hand are highlighted YELLOW with an "ADDED BY MM <date>" note in L so he can audit them.

Only the third column is ours. `ironcell-ingest` is MM's mirror on Supabase, so parameters may be
added there freely - that is where `&src=` (ad attribution) goes, and it never reaches his
Apps Script.

**If an order is genuinely missing from his sheet**, backfill it through the same Apps Script
with the SAME parameter names, and put a marker in `notes` so he can see what happened and audit
it - e.g. `BACKFILLED BY MM <date> - placed on <page>, which was not connected to this sheet.
Please confirm status before actioning.` **Never state or imply whether it shipped**: we do not
know, and guessing either way costs him money. Say what we know and hand him the decision.

**The sheet parameter names are the column mapping** and must stay byte-identical wherever they
are sent: `orderNumber, date, customerName, email, phone, paymentMethod, productPrice, tax,
shipping, coupon, address, notes`. A renamed parameter starts a second row shape rather than
erroring. Leave a value BLANK when it is unknown - never invent a payment method or a tax figure
to fill a column.

**Two order-taking paths, separate code.** An edit to one does not reach the other:

- `index.html` and the rep clones - `proceedWithOrder(method, name, email, ...)`. The payment
  method is the FIRST ARGUMENT, not read from the DOM.
- `research-supplies/index.html` - its own `window.placeOrder(method)`. Different file, closure
  and variable names.

**The closure trap.** `research-supplies/index.html` declares `SHEET` inside the newsletter
popup's IIFE near the bottom of the file. `placeOrder` is in a DIFFERENT closure and cannot see
it; referencing it throws a ReferenceError the surrounding `try/catch` swallows, so a beacon
silently does nothing while the code beside it works. Check which IIFE declares anything that
looks global before reusing it.

**How to verify an order path without sending anything.** Do not place a test order - it puts a
real row in his live sheet and emails `orders@`. On the live page, replace `Image` and `fetch`
with capturing stubs, stub `gtag`/`fbq`/`ttq`, call the order function, and read back which URLs
would have fired. Two traps:

- `proceedWithOrder` needs its arguments. Calling it bare throws on
  `method.charAt(0).toUpperCase()`, which looks like a production crash and is not one.
- Both paths latch against duplicates - `window._submittedOrders[orderNum]` on the storefront
  (keyed off the DOM order number, so run `openCheckout()` first) and `window._icOrderPlaced` on
  the supplies page. A second run returns early and fires nothing, which reads as a dead beacon.

### 2.2 The newsletter admin, and the way into it

- `admin/index.html` - the whole file. It is a self-contained newsletter composer and sender. It is
  not generated from `index.html` and nothing references it, so it looks orphaned. It is not.
- `email-icon-instagram.png`, `email-icon-tiktok.png`, `email-icon-facebook.png` and
  `email-logo-trans.png`, all four at the repository root rather than in `img/`. They look like
  stray top-level files. They are hotlinked by the emails that have already gone out to the
  subscriber list, so renaming or moving them breaks images in mail that was sent months ago.
- In `index.html`, inside `<div class="footer-legal">`, this exact anchor:
  `<a href="/admin/" rel="nofollow noopener">Admin</a>`. It is the only link to the admin tool
  anywhere on the site.

### 2.3 The crawl fence

`robots.txt` must keep `Disallow: /admin/`, otherwise the admin login gets crawled and indexed.

**It is not a four-line file, and it must not be reduced to one.** An earlier version of this
section said it was, because it was written on 2026-08-24 while the file was in a stripped state -
three publishes on 2026-08-23 and 2026-08-24 had removed 96 lines from it (`c2c91ed`, `f0b3c97`,
`bda9dd0`, all pure deletions). That was the write-back in section 1, not a decision. Restored in
`5beb48f`.

The file carries **fourteen** `User-agent` groups: the `*` group plus thirteen named crawlers
(GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-User, Claude-SearchBot, anthropic-ai,
PerplexityBot, Perplexity-User, Google-Extended, Applebot, Applebot-Extended, CCBot). Each repeats
the same four directives. They exist because **a named agent does not inherit the `*` group** - if
`GPTBot` has its own block anywhere in the file, it obeys only that block, so the fence has to be
restated per agent or it does not apply to them at all.

Each group is `Allow: /` plus `Disallow:` for `/admin/`, `/IRONCELL/`, `/Peptide%20Guides/` and
`/Peptide Guides/`. This is **not** a ban on AI crawlers - every one of them is explicitly allowed
the public site, Applebot included, which matters for Siri and Spotlight. It fences four paths.

The two `Peptide Guides` lines are load-bearing and are the reason this matters. Thirty-four
`.docx` briefs are tracked in the repo and serve live (verified 2026-08-25: `200`,
`application/vnd.openxmlformats-officedocument.wordprocessingml.document`). They contain human
dosing information. This is a research-use-only supplier, so letting a search or AI crawler ingest
and surface that content is a compliance exposure, not an SEO preference. Both spellings are
needed: the encoded form for crawlers that normalise the space to `%20`, the literal for those
that do not.

Verify with `grep -c 'User-agent:' robots.txt` → `14`, and `grep -c 'Disallow: /admin/'` → `14`.

### 2.4 The automation in `.github/workflows/`

```
.github/workflows/keep-admin-entry.yml
.github/workflows/admin-live-check.yml
```

These are not leftovers and should not be tidied up as unrecognised files. They are the automatic
repair mechanism:

- `keep-admin-entry.yml` runs on every push, every 30 minutes and on demand. It checks that
  everything in sections 2.1 to 2.3 is still present and puts back anything that is missing. If
  nothing is missing it exits without committing.
- `admin-live-check.yml` runs hourly and probes the published site rather than the repo, so it also
  catches the case where the repo is correct but the published page is stale.

Every edit the repair job makes is proved additive before it is written: the file must equal the
original plus exactly one insert, a fixed list of checkout, cart, payment, age-gate and promotion
markers must not move beyond what the insert itself contains, and every inline script must still
parse. If any of that fails the edit is discarded rather than committed.

**A commit authored by `iron-cell-admin-guard`** is that job working as intended. Do not revert it
and do not discard it as a conflict. If your local copy disagrees with it, your copy is the older
one - pull, then re-apply your change on top.

---

## 3. Also worth keeping

Small files, each of which breaks something large:

- `CNAME` - the only thing pointing the custom domain at this site.
- `sitemap.xml` - referenced by `robots.txt`.
- `llms.txt`
- `googlea8e08b7d1d3051d2.html` - the Google Search Console verification file. Removing it
  un-verifies the property.

---

## 4. Worth a quick word before you change it

Not off limits, just worth confirming the intent first, because these move money or carry legal
weight:

- Checkout and `proceedWithOrder()`, the cart, pricing, coupons and the Spend & Save tier maths
- PayPal, Venmo and Zelle handles
- The age gate and the research-use-only notices

---

## 5. Before you commit: a 30 second checklist

Run this against your working copy. Every line should print the number next to it.

```bash
grep -c 'gtag/js?id=AW-18389709216'        index.html   # 1
grep -c 'BVXmCJiwnuIcEKDj8sBE'             index.html   # 1  purchase conversion
grep -c 'jCpBCKnUsOIcEKDj8sBE'             index.html   # 2  newsletter conversion (see note)
grep -c 'application/ld+json'              index.html   # 3
grep -c '"@type":"ItemList"'               index.html   # 1  (minified, no space after the colon)
grep -c 'href="/admin/"'                   index.html   # 1
grep -c 'ironcell-ingest?t=sub'            index.html   # 1
grep -c 'Disallow: /admin/'                robots.txt   # 1
git diff --numstat                                      # only the files you meant to touch
```

If `git diff --numstat` reports thousands of changed lines on `index.html` for a small edit, that
is the write-back from section 1. Reset and redo the change against current `main`.

---

## 6. After you publish

GitHub Pages cancels an in-progress build when a new commit arrives, so twenty commits in thirty
seconds means nineteen cancelled builds and one survivor. Batch related changes into as few commits
as you reasonably can, let a publish finish before starting the next one, and wait for the Pages
deploy before verifying. Checking too early just shows you the old page.

Then confirm against the live domain rather than the repo:

```bash
curl -s "https://ironcellresearch.com/?cb=$RANDOM" \
  | grep -c -e 'href="/admin/"' \
            -e 'gtag/js?id=AW-18389709216' \
            -e 'BVXmCJiwnuIcEKDj8sBE' \
            -e 'application/ld+json'

curl -s -o /dev/null -w '%{http_code}\n' https://ironcellresearch.com/admin/   # 200
curl -s https://ironcellresearch.com/robots.txt | grep -c 'Disallow: /admin/'  # 1
```

One note on verification: `raw.githubusercontent.com` can serve a cached copy for a while after a
push, and it has already produced one false "this is missing" reading. Check the live domain or the
GitHub API, not `raw`.

---

## Quick summary

| Do | Instead of |
|---|---|
| Pull current `main`, then edit in place | Editing an older local or pasted copy |
| Change only the lines you mean to change | Writing the whole file back |
| `git diff` before committing | Committing and checking afterwards |
| Leaving `.github/workflows/` alone | Removing the two workflow files |
| Letting `iron-cell-admin-guard` commits stand | Reverting or discarding them |
| Verifying the live domain after a publish | Assuming a green push means a good page |
| Leaving Jimmy's sheet, order emails and order numbers exactly as they are | Adding a writer, a sender or a new number format to his fulfilment system |
