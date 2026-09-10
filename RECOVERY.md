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
- 14 pages take traffic: `index.html` (main storefront), ten rep clones
  (`amber/ billy/ carlos/ chel/ davu/ dro/ dupree/ merv/ ray/` and the tenth in
  the tree), `research-supplies/` (the page BOTH paid campaigns land on; its own
  checkout, no compounds named, no age gate), `peptidecalculator/`. `admin/` is
  the newsletter composer for the client, not a storefront.

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

**2c. His order email**
Web3Forms key `603b0822-9385-4831-ba22-13f82778ebab` to
`orders@ironcellresearch.com`, subject `New Order #<n> - IronCell Research`,
from_name `IronCell Research Orders`, body `NEW ORDER RECEIVED ...` exactly as
in `proceedWithOrder()` in `index.html`. Every storefront file and the supplies
page send on this one key. There is also a `New Newsletter Subscriber` email.

**2d. His order numbers**
Main site and supplies page: six random digits. Rep clones: rep prefix plus
six digits (`RS123456`). A RAY20/DAVU20/CORTEZWM/DRO20 coupon on the main site
adds `RS_`/`DV_`/`CC_`/`DM_` so the rep is credited on Site Summary. There is
exactly ONE numbering scheme. Never mint another (the `IC-########` format of
Sep 8 is gone and must not return).

**Rules, absolute:** no new writer to his sheet from any page; no second
number format; no renamed, added or reordered beacon parameter; no changed
subject line; no editing or deleting his rows; no hand-written rows without
reading the sheet back first (section 5); never state or imply whether an order
shipped. When his system and an instruction collide, surface the collision.

## 3. Our systems (change freely, they never reach him)

- `ironcell-ingest` edge function on Supabase project `fnodwwpunekaycxxshbb`
  (this is the SnacksFrom org project; Iron Cell shares it). `?t=order` mirrors
  every order into `ironcell_orders` (email, name, total, coupon, items, raw
  jsonb of every query param incl. `src`, `state`, `zip`). `?t=sub` mirrors
  signups into `ironcell_subscribers`. The mirror does NOT receive the order
  number, phone or street address; the raw `items` string on the supplies page
  carries order number, address and phone as a fallback.
- `/admin/` on the site reads that mirror ("Export orders (CSV)").
- `&src=` first-touch ad attribution (`icAttr()`, 30-day TTL) rides on both
  ingest calls and nowhere else.

## 4. Ad tracking that must stay in sync

- Google Ads tag `AW-18389709216` on every page. Purchase conversion label
  `BVXmCJiwnuIcEKDj8sBE` fires once per order with `value` = grand total and
  `transaction_id` = order number, on the storefront, every clone and the
  supplies page. A Newsletter-signup conversion fires on every signup path.
  A healthy storefront file has 7 `AW-` references; a clone that lost the tag
  on paste is the historical failure.
- Meta pixel (`fbq` Purchase) and TikTok pixel (`ttq` CompletePayment) fire on
  the same order event.
- Google Ads account: `977-552-6860 Iron Cell Research` under
  jimmyabernathy@gmail.com (Chrome authuser=2). Campaigns: "IronCell - Research
  Supplies" (Search, $33/day) and "IronCell - Newsletter Signups (WELCOME20)".
  No healthcare certification (by decision), enhanced conversions OFF (Jimmy's
  call), every campaign uses the new-account promo credit, ad spend is on the
  client's own payment method. The unrelated `979-037-6401 TEMSA Collective
  Holdings` account under temsagpt@ is paused pending advertiser verification.

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

## 7. Incident record, 2026-09-08/09 (so it is not repeated)

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

The rule that would have prevented all of it: **never write to a system you
cannot read back, and copy the client's path byte-for-byte or not at all.**
