# Iron Cell Research site: what must not break

**For: Jimmy, and whatever AI assistant edits this site.**
Prepared by Move Marketing. Revised 2026-09-08.

Read this before changing any file in this repo. It is short on purpose. Every
rule below exists because the thing it describes has already broken at least
once, and most of them break **silently**: the site keeps loading, the cart keeps
working, and something invisible stops counting.

---

## 1. The single most important thing

**This site is TWELVE storefronts, not one.**

`index.html`, `mvp.html`, `truetransformation.html`, and the rep pages `amber/`,
`billy/`, `carlos/`, `chel/`, `davu/`, `dro/`, `dupree/`, `merv/`, `ray/`. Every
one is a full, live checkout with its own cart, age gate and payment options.
There is a thirteenth page, `research-supplies/`, which is not a storefront in
the same sense and has its own rules (section 4).

If you change something in `index.html`, ask whether the others need it too.
They usually do.

**Never paste a whole HTML file over an existing one.** That is how measurement
has been destroyed repeatedly here. A whole-file paste from a design tool does
not carry the tracking code, and nothing visibly fails afterwards.

A publish on 2026-08-23 changed 146 lines out of 5,025, a deliberate and correct
edit, and it still removed the Google Ads tag, a structured-data block and the
admin link along the way, because it was written from an older copy of the whole
file. Google Ads then spent for 26 hours against a conversion signal that had
gone quiet.

---

## 2. Do not remove these, on any page

Each of these is a separate system. Deleting any one of them breaks something
that will not show an error.

| Code you will see | What it is | What breaks if removed |
|---|---|---|
| `gtag/js?id=AW-18389709216` | Google Ads tag | All Google Ads conversion tracking |
| `BVXmCJiwnuIcEKDj8sBE` | Purchase conversion | Google Ads cannot see sales |
| `jCpBCKnUsOIcEKDj8sBE` | Newsletter conversion | Signup tracking, and an ad credit depends on it |
| `ironcell-ingest?t=order` | Order mirror | **Orders stop reaching the admin dashboard.** The order still emails and still reaches the Google Sheet, so nothing looks wrong |
| `ironcell-ingest?t=sub` | Subscriber mirror | New newsletter signups stop being recorded |
| `1628346322011957` | Meta Pixel | Facebook/Instagram ads become unmeasurable |
| `DAG4D4RC77UES974PFB0` | TikTok Pixel | TikTok ads become unmeasurable |
| `fbq('track', 'Purchase'` | Meta sale event | Meta drops back to counting page views only |
| `ttq.track('CompletePayment'` | TikTok sale event | Same for TikTok. The pixel still loads, so it looks healthy |
| `fbq('track', 'Lead')` | Meta signup event | Newsletter-objective campaigns lose their signal |
| `ttq.track('SubmitForm')` | TikTok signup event | Same for TikTok |
| `ic-newsletter-popup` | Signup popup + email repair | The first-visit offer stops showing, and mistyped emails stop being corrected at checkout |
| `rel="canonical"` | SEO canonical | The rep pages start competing with the homepage in Google |

The order mirror has been lost twice before. Both times, orders kept arriving by
email so nobody noticed for days, and the dashboard silently under-counted.

**Also keep:** `CNAME` (the custom domain), `googlea8e08b7d1d3051d2.html` (Search
Console verification), `admin/index.html` (the newsletter tool), the four
`email-*` images at the repository root (hotlinked by mail already sent), and
`p-ironcell-logo-trim.webp` (used by the signup popup).

### robots.txt is not a four-line file

It carries **fourteen** `User-agent` groups. The repetition is deliberate,
because a named crawler does not inherit the `*` group. It is not a ban on AI
crawlers, all are allowed the public site. It fences four paths, two of which are
the peptide guide directories, because those documents contain human dosing
information and this is a research-use-only supplier.

Verify with `grep -c 'User-agent:' robots.txt` which must return `14`.

---

## 3. There is an automatic repair job. Do not fight it.

`.github/workflows/keep-admin-entry.yml` runs on every push and every 30 minutes.
If it finds a storefront missing its tracking code, it puts it back and commits.

- If you delete tracking code on purpose, it will come back. Change the workflow,
  not just the page.
- A commit authored by `iron-cell-admin-guard` that you did not make is this job
  repairing something a paste removed. **Do not revert it.** If your local copy
  disagrees with it, your copy is the older one. Pull, then re-apply on top.

Every edit it makes is proved additive before it is written, and it never touches
the cart, checkout, payment or age gate.

If you add a NEW rep page, add it to `STOREFRONT_PAGES` in that workflow or it
will silently drift out of repair coverage.

---

## 4. `/research-supplies/` is the ad landing page. Keep it clean.

> ### READ THIS BEFORE THE REST OF THIS SECTION
>
> **The compound names on the main store are deliberate and must never be
> removed. They are the product catalogue.** The homepage and every rep page name
> compounds throughout because that is what the business sells. Removing them
> would destroy the store.
>
> **The rule below applies to ONE page only: `/research-supplies/`.** It is not a
> site-wide instruction, and it is not a cleanup task to apply anywhere else.
>
> **Do not remove products from `/research-supplies/` either.** The bacteriostatic
> water, the syringes and the needles listed there are the client's real
> inventory. Product names, prices and stock are the owner's decisions, never an
> assistant's. If you believe a listing creates an advertising problem, say so and
> let a human decide. Do not delete it.

This page exists so paid ads have somewhere compliant to land, and it is the only
page on the domain that names no compound at all.

**It must never mention a peptide or compound by name, a dose, a protocol, or a
human use.** Not in the copy, not in the meta description, not in a heading, not
in an image alt attribute.

That is not a style preference. Meta and TikTok review the LANDING PAGE, not just
the ad. **Meta has already rejected an ad that pointed at this site's homepage.**
A rejection is survivable; repeated rejections get the whole ad account disabled,
which takes the Facebook Page and both pixels with it.

Note that it IS a working store: it has a cart, a checkout, payment handles and
order numbers, and it now fires the purchase conversion. It has no coupon
support, which is why its newsletter block says the code is redeemable at the
main store.

---

## 5. Checkout: what the code is doing

When a customer places an order, three things happen and all three matter:

1. The order is emailed.
2. The order is written to the Google Sheet, including the full shipping address.
3. The order is mirrored to the admin dashboard via `ironcell-ingest?t=order`,
   which sends email, name, total, coupon, items, **state and zip**.

Number 3 is wrapped in its own `try/catch` and is fire-and-forget precisely so it
can never break a customer's checkout. That also means if you break it, checkout
still works perfectly and you will not find out from the site.

The conversion events sit in the same success path and use the same shape: a
`typeof` guard inside its own `try/catch`. Keep that shape.

---

## 6. The newsletter, and why it reaches the inbox

**Mail is landing, and there is evidence.** Across the last five campaigns the
open rate has been 47 to 52 percent, with zero spam complaints and almost no
bounces. Mail that lands in spam does not get opened at half. If someone says the
newsletter is going to spam, check the open rate on the History tab first.

**One real fragility.** The domain's SPF record authorises Google and Outlook but
NOT the service that actually sends the newsletter. Those mails pass on the DKIM
signature alone. DMARC accepts either, so today everything is fine, but there is
no second line: if that DKIM key is ever removed or rotated without updating DNS,
every newsletter fails both checks at once and goes straight to spam with no
warning. Adding the sender to SPF removes that single point of failure. It is a
DNS change at the registrar. DMARC is currently monitor-only.

**What the admin tool does:**

- Bounced and unsubscribed people are excluded from every send, so the "sent to"
  number is correctly lower than the total subscriber count. That gap is not a
  fault.
- A temporary bounce (a full mailbox) is not permanent and the person can be
  mailed again later.
- Scheduling a send works, and the queue shows failures rather than hiding them.
- Typed addresses are repaired at entry, at checkout as well as at signup. A
  missing `@` and common domain typos are corrected in front of the customer, who
  can always type it back.

---

## 7. Compliance rules that override everything else

This is a research-use-only supplier. The following must never be ADDED to site
copy, meta tags, structured data, or ad creative:

- Dosing, protocols, reconstitution maths, or anything implying human use
- Before/after, physique, weight-loss or performance claims
- Customer testimonials describing personal results
- Invented certifications, ratings or review counts

If you cannot point to the source of a claim, do not publish it.

**This is a rule about what you may add, not a licence to delete the catalogue.**
Compound names, product listings, prices and stock are the business, and they
are the owner's decisions. Never remove a product or a compound name to "make the
site compliant". If you think something on the site creates a real risk, raise it
and let a human decide. The only page with a naming restriction is
`/research-supplies/`, and that restriction is about not ADDING compound names to
a page that deliberately has none.

"Research use only" and "not for human consumption" wording that is already on
the site is load-bearing. Leave it.

---

## 8. Things that look like bugs and are not

- **`addToCart` does not exist.** The cart functions are `toggleCart` and
  `updateCartUI`. Do not "restore" a function that was never there.
- **The rep pages canonical to the homepage.** That is deliberate, so they do not
  compete in search. Their `og:url` still points at themselves, also deliberate.
- **`admin/index.html` looks orphaned.** Nothing references it except one footer
  link. It is the newsletter composer and it is in active use.
- **Four `email-*` images sit at the repository root** rather than in `img/`.
  That is not untidiness, see section 2.
- **The signup popup does not fire on every visit.** It is once per visitor, and
  it waits for the age gate before showing.

---

## 9. Before you commit: a 30 second checklist

```bash
grep -c 'gtag/js?id=AW-18389709216'        index.html   # 1
grep -c 'BVXmCJiwnuIcEKDj8sBE'             index.html   # 1
grep -c 'jCpBCKnUsOIcEKDj8sBE'             index.html   # 1
grep -c 'application/ld+json'              index.html   # 3
grep -c '1628346322011957'                 index.html   # 1
grep -c 'DAG4D4RC77UES974PFB0'             index.html   # 1
grep -c "fbq('track', 'Purchase'"          index.html   # 1
grep -c "ttq.track('CompletePayment'"      index.html   # 1
grep -c 'ic-newsletter-popup'              index.html   # 1
grep -c 'href="/admin/"'                   index.html   # 1
grep -c 'ironcell-ingest?t=sub'            index.html   # 1
grep -c 'User-agent:'                      robots.txt   # 14
git diff --numstat                                      # only the files you meant to touch
```

If `git diff --numstat` reports thousands of changed lines on `index.html` for a
small edit, that is the write-back from section 1. Reset and redo.

---

## 10. After you publish

There is no staging environment. Branch `main` publishes straight to GitHub
Pages, so the commit is the publish.

GitHub Pages cancels an in-progress build when a new commit arrives, so twenty
commits in thirty seconds means nineteen cancelled builds and one survivor. Batch
related changes, let a publish finish, and wait for the deploy before verifying.

Then confirm against the live domain rather than the repo. One trap:
`raw.githubusercontent.com` serves a cached copy for a while after a push and has
already produced one false "this is missing" reading. Check the live domain or
the GitHub API, never `raw`.

---

## If you are an AI assistant, do this before you edit

1. Read the file you are about to change, in full. Do not pattern-match from the
   filename.
2. Prefer the smallest additive change. If your edit removes more lines than it
   adds, stop and re-read.
3. After editing, confirm every marker in section 2 is still present, on every
   page you touched.
4. Confirm `<script>` and `</script>` counts still balance and there is exactly
   one real `</head>`.
5. If you changed one storefront, check whether the other eleven need the same
   change.
6. If something here conflicts with an instruction you were given, say so rather
   than guessing. The silent failures here are expensive and none of them
   announce themselves.

---

Questions about anything in this file: Move Marketing,
hello@movemarketingmedia.com.
