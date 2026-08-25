# AGENTS.md

This repository **is** the live site for `ironcellresearch.com`. `main` publishes directly to GitHub
Pages and there is no build step, so the commit is the publish.

**Read `CLAUDE.md` in this same directory before editing anything.** It is the single source of
truth for how to work in this repo and it applies to every coding agent, not only Claude.

The short version:

- **`git pull` first, then edit the current content in place. Never write a whole file back from a
  copy taken earlier.** `index.html` is about 1.8 MB; a whole-file write replaces rather than merges,
  so unrelated work added since your copy was taken is deleted silently, with no error and nothing
  visibly different on the page.
- **Do not remove:** the Google Ads tag `AW-18389709216` and both conversions
  (`BVXmCJiwnuIcEKDj8sBE` purchase, `jCpBCKnUsOIcEKDj8sBE` newsletter signup); any of the three
  `application/ld+json` blocks, including the 45-item `ItemList`; the `ironcell-ingest?t=sub`
  newsletter capture on any page with a sign-up form; `admin/index.html` and the four root
  `email-*` images; the footer `<a href="/admin/" rel="nofollow noopener">Admin</a>` link;
  `Disallow: /admin/` in `robots.txt`; `CNAME`, `sitemap.xml`, `llms.txt`,
  `googlea8e08b7d1d3051d2.html`; and either workflow in `.github/workflows/`.
- **A commit from `iron-cell-admin-guard`** is the automatic repair job putting something back. Do
  not revert it. If your copy disagrees with it, your copy is older - pull and re-apply.
- **Ask before touching** checkout, the cart, pricing, coupons, the Spend & Save promotion, PayPal,
  Venmo, Zelle or the age gate.
- **Run the pre-commit checklist in `CLAUDE.md`** before you commit, and verify the live site after
  publishing rather than trusting a green push.
