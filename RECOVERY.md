# Iron Cell - recovery runbook and system map

Read this before touching anything that carries an order, a signup, or a sale.
It exists because on 2026-09-08/09 a well-meant "fix" put a second writer, a
second order-number format and two blind backfills into the client's live
fulfilment sheet, and the sheet then had to be restored from version history.
Every fact below was verified by reading the live system back, not inferred.

## 1. What this site is

- Static GitHub Pages site for ironcellresearch.com. `git push` to `main` IS
  the publish; there is no build step. Verify a deploy by curling the live page
  for a string you just added (`curl -s --compressed URL | grep -c MARKER`).
- 14 pages take traffic. **12 storefront files share one checkout**
  (`proceedWithOrder()`): `index.html`, the nine rep folders `amber/ billy/
  carlos/ chel/ davu/ dro/ dupree/ merv/ ray/`, and `mvp.html` +
  `truetransformation.html` at the root. **`research-supplies/`** is the 13th
  order-taking page, with its own checkout (`window.placeOrder()`): both paid
  Google campaigns land there, it names no compound and has no age gate.
  **`peptidecalculator/`** takes signups only. `admin/` is the client's
  newsletter composer, not a storefront. `/IRONCELL/` is a legacy mockup with no
  checkout and no tags (robots-disallowed, unlinked).

## 2. The client's systems. Never change their shape.

Jimmy (the client) tracks, confirms, fulfils and ships physical product from
two things we did not build and do not own:

**2a. The Google Sheet "IronCell Order Tracker"**
id `15vIDUTsNVrJhIX4SF4DVrilB7Oo6qqinbiAR4J44rDw`, owned by
jimmyabernathy@gmail.com. Tabs: Site Summary, Reta10 Redemptions, Sheet1
(orders, gid=0), Sheet6, Sheet5, Welcome Redemptions, Sheet2, Newsletter
Subscribers (gid=340804265), Sheet3, Sheet4. Sheet2-6 are empty.

Sheet1 layout (header row 1, data from row 2): A Order #, B Date, C Customer
Name, D Address, E Email Address, F Payment Method, G Product Price (the grand
total charged), H Tax, I Shipping, J Tracking Number, K Status, L Notes (the
items string), N Tracking Sent, O Inv Processed, P Subtotal (an ARRAYFORMULA
`G-H-I` in P2 that fills down automatically). Rows written by his Apps Script
are WHITE; rows he has worked are GREEN with K="paid"; a blank/black row marks
a month boundary. The sheet ends at its last data row because the script uses
`appendRow`. Site Summary counts orders per rep prefix and month from Sheet1
(`LEFT(A,2)` and `TEXT(B,"yyyy-MM")`), and revenue from column P.

Newsletter Subscribers layout: A timestamp, B Email, C type ("Signup",
"New order", "Order import"), D Last Newsletter Sent, E Status. His script
adds a "New order" row the first time an email orders.

**2b. His Apps Script**
`https://script.google.com/macros/s/AKfycbwha_53kpXJWgZ6X94dM4d9NJcgwaGabxKWPMJpQYaXQqMWmgoTpgcw7RARBu0quJ6BQw/exec`
- Order row: GET with `orderNumber, date, customerName, email, phone,
  paymentMethod, productPrice, tax, shipping, coupon, address, notes`. The
  parameter NAMES are the column mapping. `date` is
  `new Date().toLocaleDateString()` (M/D/YYYY), `paymentMethod` is the method
  with a capitalised first letter ("Venmo", "Paypal"), `productPrice` is the
  grand total to 2dp, `notes` is the items list joined by ` | ` with a
  ` | Coupon: CODE (-$x.xx)` suffix when a coupon applied.
- Newsletter: `?type=newsletter&email=...`
- Lookups: `?type=welcomecheck` and `?type=retacheck` (JSONP) feed the
  Welcome/Reta10 Redemptions tabs.

**2c. His emails (one Web3Forms key for everything)**
Key `603b0822-9385-4831-ba22-13f82778ebab`.
- **Order email** to `orders@ironcellresearch.com`, subject `New Order #<n> -
  IronCell Research`, from_name `IronCell Research Orders`, body `NEW ORDER
  RECEIVED ...` exactly as in `proceedWithOrder()` in `index.html`. Sent by all
  12 storefront files and (since `eea0dea`, Sep 9) the supplies page. The rep
  clones add their own `ccemail` and a rep suffix - Jimmy's design, leave it.
- **Signup email**, subject `New Newsletter Subscriber - IronCell Research`,
  from_name `IronCell Research Newsletter`, `subscriber_email`, body
  `New newsletter subscriber:\n\nEmail: <email>`. `mvp.html` and
  `truetransformation.html` use their own subjects (`- MVP` / `- True
  Transformation`, from_name `MVP Newsletter` / `True Transformation
  Newsletter`) - also his design. **Until Sep 10 only the storefront footer form
  sent this.** The first-visit popup (all 14 pages, the main signup path since
  Sep 8) and the supplies-page form reached his sheet but never his inbox, which
  is what "Jimmy isn't getting signup emails" was. Since `6432302` both send the
  identical call, with each page's own subject.
- **Quota:** Web3Forms free plan is 250 submissions a month per key. Sep 1-10
  ran 44 orders + ~10 signups, i.e. ~165/month. A month with ~200 orders plus a
  signup push would hit 250 and **delivery stops silently** - no error anywhere.
  If order volume climbs, Jimmy needs a paid Web3Forms plan (his account).

**2d. His order numbers**
Main site and supplies page: six random digits. Rep clones: rep prefix plus
six digits (`RS123456`). A RAY20/DAVU20/CORTEZWM/DRO20 coupon on the main site
adds `RS_`/`DV_`/`CC_`/`DM_` so the rep is credited on Site Summary. There is
exactly ONE numbering scheme. Never mint another (the `IC-########` format of
Sep 8 is gone and must not return).

Note: the `RS_`/`DV_`/`CC_`/`DM_` prefix has **never fired** (Jimmy's Jul 23
code: `openCheckout()` resets `appliedCoupon` to null a few lines BEFORE it
computes the prefix, and the coupon box is inside checkout, so the prefix is
always empty). Main-site orders using a rep code are therefore counted under
"Main Site" on Site Summary, not the rep. Reported to Julien 2026-09-10; it is
his commission accounting, so it is not ours to change.

**Rules, absolute:** no new writer to his sheet from any page; no second
number format; no renamed, added or reordered beacon parameter; no changed
subject line; no editing or deleting his rows; no hand-written rows without
reading the sheet back first (section 5); never state or imply whether an order
shipped. When his system and an instruction collide, surface the collision.

## 3. Our systems (change freely, they never reach him)

- `ironcell-ingest` edge function on Supabase project `fnodwwpunekaycxxshbb`
  (this is the SnacksFrom org project; Iron Cell shares it). `?t=order` mirrors
  every order into `ironcell_orders` (email, name, total, coupon, items, raw
  jsonb of every query param). **Since `6432302` (Sep 10) every order page sends
  `&order=<order number>`** (read it as `raw->>'order'`), and the supplies page
  also sends `&state` and `&zip`, so the mirror can be matched to his sheet by
  order number instead of email + total. Orders before Sep 10 have no number in
  the mirror. Phone and street address are deliberately not mirrored (the
  supplies page's `items` string still carries them). `?t=sub` mirrors signups
  into `ironcell_subscribers`; since ingest **v10** (Sep 10) the signup's
  first-touch attribution is kept in `ironcell_subscribers.src` (it used to be
  discarded, so no signup could be tied to an ad). `GET ?t=watchdog` returns
  the deployed `fnVersion` - check it after any deploy. Never test `?t=sub` from
  a page on our domain with a real-looking address: it sends the WELCOME20 mail.
  Probe with a foreign `Referer` and an `@example.com` address, then delete the
  row.
- `/admin/` on the site reads that mirror ("Export orders (CSV)").
- `&src=` first-touch ad attribution (`icAttr()`, 30-day TTL) rides on both
  ingest calls and nowhere else.

## 4. Ad tracking that must stay in sync

- Google Ads tag `AW-18389709216` on every page. Purchase conversion label
  `BVXmCJiwnuIcEKDj8sBE` fires once per order with `value` = grand total and
  `transaction_id` = order number, on the storefront, every clone and the
  supplies page. The Newsletter-signup conversion `jCpBCKnUsOIcEKDj8sBE` fires
  on every signup path: storefront footer, the popup on all 14 pages, the
  supplies form. Healthy `AW-` reference counts (Sep 10): storefront files 8,
  supplies 6, calculator 4. A clone that lost the tag on paste is the
  historical failure. `&src=` attribution now rides on every `t=sub` and
  `t=order` beacon, mvp/truetransformation included.
- Meta pixel (`fbq` Purchase) and TikTok pixel (`ttq` CompletePayment) fire on
  the same order event.
- Google Ads account: `977-552-6860 Iron Cell Research` under
  jimmyabernathy@gmail.com (Chrome authuser=2). Campaigns: "IronCell - Research
  Supplies" (Search, $33/day) and "IronCell - Newsletter Signups (WELCOME20)".
  No healthcare certification (by decision), enhanced conversions OFF (Jimmy's
  call), every campaign uses the new-account promo credit, ad spend is on the
  client's own payment method. The unrelated `979-037-6401 TEMSA Collective
  Holdings` account under temsagpt@ is paused pending advertiser verification.

## 4b. Ad platforms and creative - what gets accounts banned

**The compliance fence.** Google's Unapproved Substances policy covers the
compound catalogue with no research-use exemption, and violations can suspend
the account without warning. So every Google ad points at `/research-supplies/`,
sells lab supplies only, and every campaign carries campaign-level negatives:
`retatrutide, tirzepatide, semaglutide, bpc-157, bpc 157, tb-500, tb 500, pt-141,
mt-2, melanotan, cjc-1295, cjc 1295, ipamorelin, ghk-cu, mots-c, tesamorelin,
peptide, peptides, sarms, hgh, trt, glp-1, glp1, weight loss, dosage, dose,
how to inject, for humans`. Never "peptide" in a keyword, headline or
description. (Do not add `injection for` as a broad negative: it blocks
"bacteriostatic water for injection", the best-converting term.)

**Sep 10 fix:** the "Newsletter Signups (WELCOME20)" campaign (24233938787) had
been built with four broad-match peptide keywords, "Research Peptide Supplies"
headlines, a "for peptide work" description and ZERO negatives. The fence above
was added, the four keywords paused (not removed), and the ad reworded.

**Meta: account classified Drugs & Pharmaceuticals.** Two rejections so far: a
boosted post (Aug/Sep) and "New Traffic Ad" in the TX-CA policy test
(campaign 120247568982530788). Its history is clean: created Sep 9 1:38 PM,
never edited, delivered from 6:45 PM ($6.81, 23 landing-page views), then
rejected. Its creative was the WELCOME20 "20% off your first order" image
showing an Iron Cell **vial**. Meta reviews the image and the landing domain;
vial imagery on this account reads as pharmaceuticals regardless of the RUO
line. A third rejection risks a disabled ad account, Page and pixel.
**Rule: no vial or compound imagery in any paid ad on any platform.** Supplies
imagery (bacteriostatic water, syringes, kits) and text-only offers only.
Editing a rejected Meta ad auto-resubmits it; Ads Manager's "Review and publish"
ships the WHOLE draft queue. Meta's uploader is the OS file picker (a human has
to add creative there).

**TikTok:** Business Center "Unifirst" / ad account Unifirst0905
(7618373214120656897), pixel DAG4D4RC77UES974PFB0. Campaign "IC Research
Supplies / Lab Consumables TX-CA" ran Sep 8-15, $20/day. Same creative rule.

The daily guard task `ironcell-ads-500-stop` (on Julien's machine) reads all
four campaigns every morning and pauses on any cap, date or rejection.

## 5. How to verify anything without sending anything

**Read his sheet back (no download, no Drive scope):** in a docs.google.com
tab signed in as him, `fetch` the gviz endpoint:
`https://docs.google.com/spreadsheets/d/<id>/gviz/tq?tqx=out:csv&headers=0&authuser=<n>&gid=0&tq=select A,B,C,G,K limit 700`
(`sheet=<tab name>` instead of `gid`). It drops fully empty rows, so its index
is not the sheet row number; use Ctrl+J in the UI to confirm a row.

**Dry-run an order or signup path on the LIVE page** (headless Playwright or
DevTools): stub `window.Image` (capture the `src` setter), `window.fetch`,
`navigator.sendBeacon`, `gtag`, `fbq`, `ttq` BEFORE touching the page, then
drive the form and read back the captured URLs. `proceedWithOrder` needs its
arguments and `openCheckout()` first; the supplies page uses
`window.placeOrder(method)` and latches on `window._icOrderPlaced`. Never place
a real test order and never GET the Apps Script by hand.

**Diff his sheet against our mirror:** SQL on `ironcell_orders` (Supabase MCP
reaches this project) for `created_at`, `lower(customer_email)`, `total`; match
sheet rows on email + total within +/-2 days. Unmatched mirror rows are either
his test orders, double-submits within minutes, rows he re-priced, or genuinely
missing orders. Only the last kind gets added, by hand, at the bottom, in the
white RAW layout, highlighted YELLOW, with `ADDED BY MM <date> - <why>. Please
confirm status.` appended to column L. Then read it back.

**Prove a deploy:** curl the live page for the marker; check all inline
`<script>` blocks parse (`new Function(block)`); dry-run as above.

**Or run the whole suite: [`ops/wiring-dry-run.mjs`](ops/wiring-dry-run.mjs).**
110 checks across the supplies form, the supplies checkout (typo'd email, real
mouse clicks, second order on one page load), the popup on 6 page types at
desktop and iPhone size, the storefront footer and checkout on desktop and
iPhone, and a rep clone. It asserts the exact 12 sheet parameters in order,
the order email subject, the signup email subject per page, the mirror's
`&order=`, the conversions, and that nothing is sent before a typo is
confirmed. Expected: 105/110, the 5 misses listed in 6b.

**Prove Jimmy's base is untouched: [`ops/base-contract.mjs`](ops/base-contract.mjs)** (no
dependencies, plain Node). It extracts every statement that feeds his systems - the
order-number function, every Apps Script call (order row, newsletter row, welcome/reta
lookups, the popup's `SHEET`), every Web3Forms email - from all 14 order/signup pages and
compares them, whitespace-blind, with the approved snapshot `ops/base-contract.json` (131
statements, approved 2026-09-10 from `3a889c4`, which the live site matched). `node
ops/base-contract.mjs` checks the repo, `--live` checks the published site; both print `OK` or
the exact statement before and after. The `Base contract` GitHub workflow runs it on every push
and against the live site every 6 hours. It never reverts anything: a red run means put it
back, by hand, from `git log -p`. Only a change Jimmy approved (relayed by Julien) is
re-snapshotted, with `--write`, and the commit says whose approval it was. Our own lines
(`ironcell-ingest`, gtag/fbq/ttq) are outside the contract and can change freely.

## 6. Recovery routes

- Sheet damaged: Google Sheets File > Version history > restore (the client
  or Julien does this; the version-history view freezes a driven browser tab on
  this sheet). Then re-add only what arrived after the restore point from the
  mirror, yellow, with notes.
- Orders lost from the site side: the mirror holds every order since Aug 9
  2026; older ones exist only in his sheet's version history.
- A page's order path suspected dead: dry-run it (section 5) before changing
  a line; the closure trap (`SHEET`/`INGEST` consts declared inside the
  newsletter popup IIFE, invisible to `placeOrder`) reads as a dead beacon
  while being a ReferenceError swallowed by try/catch.

## 6b. Known issues in Jimmy's own code (report, do not fix)

- Rep-code prefix on main-site orders never fires (section 2d).
- 9 of the 11 rep storefronts compute tax without the state-dropdown fallback
  that `index.html`, `billy/` and `dupree/` have, so tax can differ by page for
  the same address. Pricing, so his call.
- `mvp.html` and `truetransformation.html`: a script references a `coaModal`
  element those pages do not have (harmless console error), and their footer
  signup form is not visible (the "View Test Results" section sits where it
  would be), so on those two pages the popup is the only signup path.

## 7. Incident record, 2026-09-08/10 (so it is not repeated)

1. `/research-supplies/` never sent his sheet row or order email; four ad-driven
   orders (Aug 16, Aug 17, Aug 28, Sep 6) were invisible to him.
2. The first fix added the calls with a new `IC-` number format and a beacon
   that threw silently, then backfilled twice into a sheet nobody could read.
3. During the hand repair a stray drag moved his whole data block 551 rows
   down and 2 columns right, which read as "the sheet is wiped" and broke every
   Site Summary revenue formula (`#REF!`).
4. Fixed by version-history restore to 7:27 AM Sep 9, a mirror-vs-sheet diff,
   nine yellow rows added at the bottom, two signups re-added, and the supplies
   page rewired as an exact copy of the storefront path (commit `eea0dea`).
5. Sep 10 (`6432302`): signup emails restored for the popup and supplies form;
   the email typo repair stopped eating the first press after a typo (it was
   costing signups AND the first tap on Zelle/Venmo/PayPal in checkout); popup
   no longer opens over checkout; order number added to our mirror.
6. Sep 10: the Meta TX-CA ad's rejection traced to its vial creative (4b), and
   the Google newsletter campaign brought back inside the compliance fence.

The rule that would have prevented all of it: **never write to a system you
cannot read back, and copy the client's path byte-for-byte or not at all.**
