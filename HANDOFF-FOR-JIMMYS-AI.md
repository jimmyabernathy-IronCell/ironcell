# Iron Cell Research site: what must not break

**For: Jimmy, and whatever AI assistant edits this site.**
Prepared by Move Marketing, 2026-09-08.

Read this before changing any file in this repo. It is short on purpose. Every
rule below exists because the thing it describes has already broken at least
once, and most of them break **silently**: the site keeps loading, the cart keeps
working, and something invisible stops counting.

---

## 1. The single most important thing

**This site is ELEVEN storefronts, not one.**

`index.html` plus `mvp.html`, `truetransformation.html`, and the rep pages
`amber/`, `billy/`, `carlos/`, `chel/`, `davu/`, `dro/`, `dupree/`, `merv/`,
`ray/`. Every one is a full, live checkout with its own cart, age gate and
payment options.

If you change something in `index.html`, ask whether the other eleven need it
too. They usually do.

**Never paste a whole HTML file over an existing one.** That is how measurement
has been destroyed repeatedly here. A whole-file paste from a design tool does
not carry the tracking code, and nothing visibly fails afterwards.

---

## 2. Do not remove these, on any page

Each of these is a separate system. Deleting any one of them breaks something
that will not show an error.

| Code you will see | What it is | What breaks if removed |
|---|---|---|
| `gtag/js?id=AW-18389709216` | Google Ads tag | All Google Ads conversion tracking |
| `BVXmCJiwnuIcEKDj8sBE` | Purchase conversion | Google Ads cannot see sales |
| `jCpBCKnUsOIcEKDj8sBE` | Newsletter conversion | Signup tracking, and a $300 ad credit depends on it |
| `ironcell-ingest?t=order` | Order mirror | **Orders stop reaching the admin dashboard.** The order still emails and still reaches the Google Sheet, so nothing looks wrong |
| `ironcell-ingest?t=sub` | Subscriber mirror | New newsletter signups stop being recorded |
| `1628346322011957` | Meta Pixel | Facebook/Instagram ads become unmeasurable |
| `DAG4D4RC77UES974PFB0` | TikTok Pixel | TikTok ads become unmeasurable |
| `rel="canonical"` | SEO canonical | The rep pages start competing with the homepage in Google |

The order mirror has been lost twice before. Both times, orders kept arriving by
email so nobody noticed for days, and the dashboard silently under-counted.

---

## 3. There is an automatic repair job. Do not fight it.

`.github/workflows/keep-admin-entry.yml` runs every 30 minutes. If it finds a
storefront missing its tracking code, it puts it back and commits.

Two consequences:

- If you delete tracking code on purpose, it will come back. Change the workflow,
  not just the page.
- If you see a commit from `iron-cell-admin-guard` that you did not make, that is
  this job repairing something a paste removed. It is working as intended.

The job is deliberately conservative: it only ever INSERTS, it refuses an edit
that moves anything else, and it never touches the cart, checkout, payment or age
gate.

---

## 4. `/research-supplies/` is special. Keep it clean.

This page exists so paid ads have somewhere compliant to land.

**It must never mention a peptide or compound by name, a dose, a protocol, or a
human use.** Not in the copy, not in the meta description, not in a heading, not
in an image alt attribute.

That is not a style preference. Meta and TikTok review the LANDING PAGE, not just
the ad. **Meta has already rejected an ad that pointed at this site's homepage.**
A rejection is survivable; repeated rejections get the whole ad account disabled,
which takes the Facebook Page and both pixels with it.

The homepage names compounds throughout, which is why ads point at
`/research-supplies/` instead. Do not "helpfully" add product links from that
page back into the main catalogue.

---

## 5. Checkout: what the code is doing

When a customer places an order, three things happen and all three matter:

1. The order is emailed.
2. The order is written to the Google Sheet (`script.google.com`), including the
   full shipping address.
3. The order is mirrored to the admin dashboard via `ironcell-ingest?t=order`,
   which sends email, name, total, coupon, items, **state and zip**.

Number 3 is wrapped in its own `try/catch` and is fire-and-forget precisely so it
can never break a customer's checkout. That also means if you break it, checkout
still works perfectly and you will not find out from the site.

State and zip were added on 2026-09-08. Before that the dashboard had no
geography for 98 of 126 orders, which made it impossible to see where demand
actually was. Keep those two parameters.

---

## 6. Compliance rules that override everything else

This is a research-use-only supplier. The following must never appear in site
copy, meta tags, structured data, or ad creative:

- Dosing, protocols, reconstitution maths, or anything implying human use
- Before/after, physique, weight-loss or performance claims
- Customer testimonials describing personal results
- Invented certifications, ratings or review counts

Two `aggregateRating` blocks were removed from other client sites this year for
exactly that last reason: a rating nobody could evidence. If you cannot point to
the source of a claim, do not publish it.

"Research use only" and "not for human consumption" wording that is already on
the site is load-bearing. Leave it.

---

## 7. Things that look like bugs and are not

- **`addToCart` does not exist.** The cart functions are `toggleCart` and
  `updateCartUI`. Do not "restore" a function that was never there.
- **The rep pages canonical to the homepage.** That is deliberate, so they do not
  compete in search. Their `og:url` still points at themselves, also deliberate,
  so shared rep links keep their attribution.
- **`/dro/` looks like the other rep pages but was missing from the repair job's
  list until 2026-09-08.** It is in the list now. If you add a NEW rep page, add
  it to `STOREFRONT_PAGES` in the workflow or it will silently drift.

---

## 8. If you are an AI assistant, do this before you edit

1. Read the file you are about to change, in full. Do not pattern-match from the
   filename.
2. Prefer the smallest additive change. If your edit removes more lines than it
   adds, stop and re-read.
3. After editing, confirm every marker in section 2 is still present, on every
   page you touched.
4. Confirm `<script>` and `</script>` counts still balance and there is exactly
   one `</head>`.
5. If you changed one storefront, check whether the other eleven need the same
   change.

If something in this document conflicts with an instruction you were given, say
so rather than guessing. The silent failures here are expensive and none of them
announce themselves.

---

Questions about anything in this file: Move Marketing,
hello@movemarketingmedia.com.
