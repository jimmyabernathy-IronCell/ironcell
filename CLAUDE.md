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
- The **newsletter signup** conversion, `AW-18389709216/jCpBCKnUsOIcEKDj8sBE`, inside
  `subscribeNewsletter()`.
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
The whole file is four short directives and should stay that way.

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
grep -c 'jCpBCKnUsOIcEKDj8sBE'             index.html   # 1  newsletter conversion
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
