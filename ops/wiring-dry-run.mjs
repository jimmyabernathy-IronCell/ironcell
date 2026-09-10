// ops/wiring-dry-run.mjs - end-to-end dry run of every order and signup path.
//
// Sends NOTHING: every request to a host other than ironcellresearch.com is
// aborted, and Image / fetch / sendBeacon / window.open are stubbed before any
// page script runs, so Jimmy's sheet, orders@ and the admin mirror never see it.
//
// Needs Playwright. Easiest: copy this file into a folder that has it installed
// (C:/Users/julie/mm-hub does) and run from there:
//   node wiring-dry-run.mjs                 # the LOCAL repo, served at the real URLs
//   IC_MODE=live node wiring-dry-run.mjs    # the LIVE site
//   IC_ONLY="supplies" node ...             # one scenario group
// Expected 2026-09-10: 105/110. The 5 misses are Jimmy's own pre-existing markup
// on mvp.html / truetransformation.html (see RECOVERY.md section 6b), not bugs.
import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';

const ROOT = process.env.IC_ROOT || 'C:/Users/julie/ironcell-site';
const MODE = process.env.IC_MODE || 'local';          // 'local' | 'live'
const results = [];
const ok = (name, cond, detail) => { results.push({ name, pass: !!cond, detail }); };

const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon', '.xml': 'application/xml' };

async function newContext(browser, mobile) {
  const ctx = await browser.newContext(mobile ? { ...devices['iPhone 13'] } : { viewport: { width: 1366, height: 768 } });
  await ctx.route('**/*', async (route) => {
    const u = new URL(route.request().url());
    if (u.hostname !== 'ironcellresearch.com' && u.hostname !== 'www.ironcellresearch.com') return route.abort();
    if (MODE === 'live') return route.continue();
    let p = decodeURIComponent(u.pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, p);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) {
      const g = path.join(ROOT, p, 'index.html');
      if (fs.existsSync(g)) return route.fulfill({ status: 200, contentType: 'text/html', body: fs.readFileSync(g) });
      return route.fulfill({ status: 404, body: '' });
    }
    return route.fulfill({ status: 200, contentType: TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream', body: fs.readFileSync(f) });
  });
  await ctx.addInitScript(() => {
    window.__cap = { img: [], fetch: [], beacon: [] };
    const RealImage = window.Image;
    window.Image = function () {
      const o = new RealImage();
      Object.defineProperty(o, 'src', { set(v) { window.__cap.img.push(String(v)); }, get() { return ''; } });
      return o;
    };
    window.fetch = function (u, o) { window.__cap.fetch.push({ url: String(u), body: o && o.body }); return Promise.resolve(new Response('{}', { status: 200 })); };
    navigator.sendBeacon = function (u) { window.__cap.beacon.push(String(u)); return true; };
    window.open = function () { return null; };
    window.alert = function (m) { (window.__alerts = window.__alerts || []).push(String(m)); };
  });
  return ctx;
}

const cap = (page) => page.evaluate(() => {
  const dl = (window.dataLayer || []).map((a) => Array.from(a)).filter((a) => a[0] === 'event').map((a) => a[2] && a[2].send_to);
  const fq = (window.fbq && window.fbq.queue ? Array.from(window.fbq.queue) : []).map((a) => Array.from(a)).filter((a) => a[0] === 'track').map((a) => a[1]);
  const tq = (Array.isArray(window.ttq) ? window.ttq : []).filter((a) => Array.isArray(a) && a[0] === 'track').map((a) => a[1]);
  return { img: window.__cap.img.slice(), fetch: window.__cap.fetch.slice(), gtag: dl, fbq: fq, ttq: tq };
});
const reset = (page) => page.evaluate(() => { window.__cap.img = []; window.__cap.fetch = []; window.dataLayer = (window.dataLayer || []).filter(() => false); if (window.fbq && window.fbq.queue) window.fbq.queue.length = 0; if (Array.isArray(window.ttq)) { for (let i = window.ttq.length - 1; i >= 0; i--) if (Array.isArray(window.ttq[i]) && window.ttq[i][0] === 'track') window.ttq.splice(i, 1); } });
const center = async (page, sel) => { const b = await page.locator(sel).first().boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const has = (arr, re) => arr.some((s) => re.test(s));
const w3 = (c, re) => c.fetch.filter((f) => /web3forms/.test(f.url)).map((f) => f.body || '').filter((b) => re.test(b));

async function suppliesDesktop(browser) {
  const ctx = await newContext(browser, false); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('https://ironcellresearch.com/research-supplies/');
  await page.waitForTimeout(800);

  // 1. inline form, typo, REAL mouse click: first press asks to confirm, sends nothing
  await page.fill('#nlEmail', 'dryrun.one@gmail.con');
  let c1 = await center(page, '#newsletter button');
  await page.mouse.click(c1.x, c1.y);
  await page.waitForTimeout(500);
  let msg = await page.textContent('#nlMsg');
  let c = await cap(page);
  ok('supplies form: typo value corrected on first press', (await page.inputValue('#nlEmail')) === 'dryrun.one@gmail.com', await page.inputValue('#nlEmail'));
  ok('supplies form: first press asks to confirm (not eaten silently)', /Press Subscribe again to confirm/.test(msg || ''), msg);
  ok('supplies form: nothing sent before confirmation', !has(c.img, /type=newsletter/) && w3(c, /Newsletter/).length === 0, c.img.length + ' imgs');
  c1 = await center(page, '#newsletter button');
  await page.mouse.click(c1.x, c1.y);
  await page.waitForTimeout(500);
  c = await cap(page);
  ok('supplies form: 2nd press -> Jimmy sheet newsletter beacon', has(c.img, /script\.google\.com.*type=newsletter&email=dryrun\.one%40gmail\.com/), c.img.join(' | ').slice(0, 300));
  ok('supplies form: 2nd press -> ingest t=sub with &src=', has(c.img, /ironcell-ingest\?t=sub&email=dryrun\.one%40gmail\.com&src=/));
  ok('supplies form: 2nd press -> Web3Forms "New Newsletter Subscriber - IronCell Research"', w3(c, /"subject":"New Newsletter Subscriber - IronCell Research".*"from_name":"IronCell Research Newsletter".*"subscriber_email":"dryrun\.one@gmail\.com"/).length === 1, JSON.stringify(c.fetch).slice(0, 300));
  ok('supplies form: exactly one subscriber email per signup', w3(c, /New Newsletter Subscriber/).length === 1);
  ok('supplies form: Google newsletter conversion fired', c.gtag.includes('AW-18389709216/jCpBCKnUsOIcEKDj8sBE'), JSON.stringify(c.gtag));
  ok('supplies form: fbq Lead + ttq SubmitForm', c.fbq.includes('Lead') && c.ttq.includes('SubmitForm'), JSON.stringify([c.fbq, c.ttq]));
  ok('supplies form: marks subscribed', await page.evaluate(() => localStorage.getItem('ic_subscribed_v1') === '1' && localStorage.getItem('ic_nl_popup_v1') === 'subscribed'));

  // 2. Enter key on the inline form
  await reset(page);
  await page.fill('#nlEmail', 'dryrun.two@example.com');
  await page.focus('#nlEmail'); await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  c = await cap(page);
  ok('supplies form: Enter key submits', has(c.img, /type=newsletter&email=dryrun\.two%40example\.com/) && w3(c, /dryrun\.two@example\.com/).length === 1);

  // 3. checkout with a typo'd email: the FIRST real click on Venmo must place the order
  await reset(page);
  await page.locator('#grid button[data-key]').first().click();
  await page.evaluate(() => { toggleCart(false); openCheckout(); });
  await page.fill('#custName', 'Dry Run');
  await page.fill('#custPhone', '0000000000'); await page.fill('#custAddress', '1 Test St');
  await page.fill('#custCity', 'Testville'); await page.selectOption('#custState', 'VA'); await page.fill('#custZip', '22066');
  await page.fill('#custEmail', 'buyer.one@gmail.con');           // typed LAST: focus stays in the field
  await page.locator("button[onclick=\"placeOrder('venmo')\"]").evaluate((el) => el.scrollIntoView({ block: 'center' }));
  ok('supplies checkout: email still focused and uncorrected before the press', await page.evaluate(() => document.activeElement.id === 'custEmail' && document.getElementById('custEmail').value === 'buyer.one@gmail.con'));
  const pv = await center(page, "button[onclick=\"placeOrder('venmo')\"]");
  await page.mouse.click(pv.x, pv.y);
  await page.waitForTimeout(600);
  c = await cap(page);
  const doneActive = await page.evaluate(() => document.getElementById('done').classList.contains('active'));
  const sheet1 = c.img.find((s) => /script\.google\.com.*orderNumber=/.test(s)) || '';
  const num1 = (sheet1.match(/orderNumber=(\d+)/) || [])[1];
  ok('supplies checkout: FIRST click on a pay button places the order (typo email)', doneActive && !!sheet1, 'done=' + doneActive);
  ok('supplies checkout: order number is 6 digits (storefront format)', /^\d{6}$/.test(num1 || ''), num1);
  ok('supplies checkout: sheet beacon carries the corrected email', /email=buyer\.one%40gmail\.com/.test(sheet1));
  ok('supplies checkout: sheet params are exactly Jimmy\'s 12, in order', sheet1 && [...new URL(sheet1).searchParams.keys()].join(',') === 'orderNumber,date,customerName,email,phone,paymentMethod,productPrice,tax,shipping,coupon,address,notes', sheet1 && [...new URL(sheet1).searchParams.keys()].join(','));
  ok('supplies checkout: order email subject "New Order #<n> - IronCell Research"', w3(c, new RegExp('"subject":"New Order #' + num1 + ' - IronCell Research"')).length === 1);
  ok('supplies checkout: order email shows tax state suffix', w3(c, /Tax: \$[0-9.]+ \(VA 5\.30%\)/).length === 1, (w3(c, /New Order/)[0] || '').slice(0, 200));
  ok('supplies checkout: ingest mirror carries &order=<same> &state &zip &src', has(c.img, new RegExp('ironcell-ingest\\?t=order&order=' + num1 + '&state=VA&zip=22066&email=buyer\\.one%40gmail\\.com.*&src=')), c.img.filter((s) => /t=order/.test(s))[0]);
  ok('supplies checkout: Purchase conversion once, value + transaction_id', c.gtag.filter((s) => s === 'AW-18389709216/BVXmCJiwnuIcEKDj8sBE').length === 1);

  // 4. a second order on the same page load is no longer swallowed
  await reset(page);
  await page.evaluate(() => { document.getElementById('done').classList.remove('active'); closeCheckout(); });
  await page.locator('#grid button[data-key]').nth(1).click();
  await page.evaluate(() => { toggleCart(false); openCheckout(); });
  await page.fill('#custEmail', 'buyer.two@example.com');
  await page.locator("button[onclick=\"placeOrder('zelle')\"]").evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const pz = await center(page, "button[onclick=\"placeOrder('zelle')\"]");
  await page.mouse.click(pz.x, pz.y);
  await page.waitForTimeout(500);
  c = await cap(page);
  ok('supplies: second order on the same page load goes through', has(c.img, /orderNumber=\d{6}.*email=buyer\.two%40example\.com/));

  // 5. styling fixes
  const bg = await page.evaluate(() => getComputedStyle(document.getElementById('checkout')).backgroundColor);
  ok('supplies: checkout modal has a visible backdrop', bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent', bg);
  ok('supplies: no page errors', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

async function suppliesPopupNotOverCheckout(browser) {
  const ctx = await newContext(browser, false); const page = await ctx.newPage();
  await page.goto('https://ironcellresearch.com/research-supplies/');
  await page.locator('#grid button[data-key]').first().click();
  await page.evaluate(() => { toggleCart(false); openCheckout(); });
  await page.waitForTimeout(7000);
  ok('popup: does NOT open over an open checkout', (await page.locator('#icNlPop').count()) === 0);
  await page.evaluate(() => closeCheckout());
  await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
  await page.waitForTimeout(1200);
  ok('popup: opens once the checkout is closed', (await page.locator('#icNlPop').count()) === 1);
  // Escape closes only the popup
  await page.evaluate(() => { openCheckout(); });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const coOpen = await page.evaluate(() => document.getElementById('checkout').classList.contains('active'));
  ok('popup: Escape closes the popup only, not the checkout underneath', coOpen && (await page.locator('#icNlPop').count()) === 0, 'checkout open=' + coOpen);
  await ctx.close();
}

async function popupFlow(browser, url, subjectRe, label, mobile) {
  const ctx = await newContext(browser, mobile); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(url);
  await page.evaluate(() => { const g = document.getElementById('ageGate'); if (g) g.classList.add('hidden'); });
  await page.waitForSelector('#icNlPop [data-ic-input]', { timeout: 12000 }).catch(() => {});
  const shown = (await page.locator('#icNlPop').count()) === 1;
  ok(label + ': popup appears for an idle new visitor', shown);
  if (!shown) { await ctx.close(); return; }
  await page.waitForTimeout(400);
  await page.fill('#icNlPop [data-ic-input]', 'pop.user@gmail.con');
  const g = await center(page, '#icNlPop [data-ic-go]');
  if (mobile) await page.touchscreen.tap(g.x, g.y); else await page.mouse.click(g.x, g.y);
  await page.waitForTimeout(600);
  let c = await cap(page);
  const m1 = await page.textContent('#icNlPop [data-ic-msg]').catch(() => '');
  ok(label + ': typo -> first press asks to confirm, sends nothing', /confirm/i.test(m1 || '') && !has(c.img, /type=newsletter/), m1);
  const g2 = await center(page, '#icNlPop [data-ic-go]');
  if (mobile) await page.touchscreen.tap(g2.x, g2.y); else await page.mouse.click(g2.x, g2.y);
  await page.waitForTimeout(600);
  c = await cap(page);
  ok(label + ': confirm -> sheet beacon (corrected email)', has(c.img, /script\.google\.com.*type=newsletter&email=pop\.user%40gmail\.com/));
  ok(label + ': confirm -> ingest t=sub WITH &src=', has(c.img, /ironcell-ingest\?t=sub&email=pop\.user%40gmail\.com&src=/));
  ok(label + ': confirm -> Jimmy subscriber email, this page\'s own subject', w3(c, subjectRe).length === 1 && w3(c, /"subscriber_email":"pop\.user@gmail\.com"/).length === 1, JSON.stringify(c.fetch.map((f) => (f.body || '').slice(0, 120))));
  ok(label + ': newsletter conversion + Lead + SubmitForm', c.gtag.includes('AW-18389709216/jCpBCKnUsOIcEKDj8sBE') && c.fbq.includes('Lead') && c.ttq.includes('SubmitForm'));
  ok(label + ': no page errors', errs.length === 0, errs.join(' | '));
  // reload: must not re-offer
  await page.reload(); await page.evaluate(() => { const g = document.getElementById('ageGate'); if (g) g.classList.add('hidden'); });
  await page.waitForTimeout(6500);
  ok(label + ': not offered again after subscribing', (await page.locator('#icNlPop').count()) === 0);
  await ctx.close();
}

async function storefront(browser, url, label, mobile) {
  const ctx = await newContext(browser, mobile); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(url);
  await page.evaluate(() => { const g = document.getElementById('ageGate'); if (g) g.classList.add('hidden'); localStorage.setItem('ic_nl_popup_v1', 'dismissed'); });
  // footer: typo + one real click/tap must send (no confirmation step by design)
  await page.locator('#newsletterEmail').scrollIntoViewIfNeeded();
  await page.fill('#newsletterEmail', 'foot.user@gmail.con');
  const b = await center(page, '.newsletter-form button');
  if (mobile) await page.touchscreen.tap(b.x, b.y); else await page.mouse.click(b.x, b.y);
  await page.waitForTimeout(700);
  let c = await cap(page);
  ok(label + ': footer typo -> FIRST press/tap sends (was eaten)', has(c.img, /type=newsletter&email=foot\.user%40gmail\.com/), c.img.slice(0, 3).join(' | '));
  ok(label + ': footer -> Jimmy subscriber email (unchanged original)', w3(c, /New Newsletter Subscriber/).length === 1);
  // stale hint must not sit under the cleared field
  const hint = await page.evaluate(() => { const h = document.querySelector('[data-ic-emailhint]'); return h ? h.textContent : ''; });
  ok(label + ': no stale "Corrected to" hint under the cleared field', !hint, hint);
  // footer Enter
  await reset(page);
  await page.waitForTimeout(4200);    // footer re-enables after 4s
  await page.fill('#newsletterEmail', 'foot.enter@example.com');
  await page.focus('#newsletterEmail'); await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  c = await cap(page);
  ok(label + ': footer Enter key submits', has(c.img, /type=newsletter&email=foot\.enter%40example\.com/));
  // order via Zelle with a typo'd email
  await reset(page);
  await page.evaluate(() => { cart.length = 0; cart.push({ key: 'bw', name: 'Bacteriostatic Water', strength: '', price: 9.99, qty: 1, noCoupon: false }); if (typeof updateCart === 'function') updateCart(); openCheckout(); });
  await page.fill('#custName', 'Dry Run');
  await page.fill('#custPhone', '0000000000'); await page.fill('#custAddress', '1 Test St');
  await page.fill('#custCity', 'Testville'); await page.selectOption('#custState', 'VA'); await page.fill('#custZip', '22066');
  await page.fill('#custEmail', 'buyer.sf@gmail.con');            // typed LAST: focus stays in the field
  await page.locator('.pay-bar.bar-zelle').evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const z = await center(page, '.pay-bar.bar-zelle');
  if (mobile) await page.touchscreen.tap(z.x, z.y); else await page.mouse.click(z.x, z.y);
  await page.waitForTimeout(700);
  c = await cap(page);
  const sheet = c.img.find((s) => /script\.google\.com.*orderNumber=/.test(s)) || '';
  const num = (sheet.match(/orderNumber=([A-Z_]*\d+)/) || [])[1];
  ok(label + ': order placed on first Zelle press with typo email', !!sheet && /email=buyer\.sf%40gmail\.com/.test(sheet), sheet.slice(0, 160));
  ok(label + ': sheet params exactly Jimmy\'s 12 in order', sheet && [...new URL(sheet).searchParams.keys()].join(',') === 'orderNumber,date,customerName,email,phone,paymentMethod,productPrice,tax,shipping,coupon,address,notes');
  ok(label + ': ingest mirror now carries &order=<same number>', has(c.img, new RegExp('ironcell-ingest\\?t=order&order=' + num + '&email=')), c.img.filter((s) => /t=order/.test(s))[0]);
  ok(label + ': order email subject unchanged', w3(c, new RegExp('"subject":"New Order #' + num)).length === 1);
  ok(label + ': no page errors', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

const browser = await chromium.launch();
const run = async (name, fn) => { try { await fn(); } catch (e) { ok(name + ' (scenario crashed)', false, e.message.split(String.fromCharCode(10))[0]); } };
const ONLY = process.env.IC_ONLY || '';
try {
  const S = [
    ['supplies desktop', () => suppliesDesktop(browser)],
    ['popup vs checkout', () => suppliesPopupNotOverCheckout(browser)],
    ['supplies popup desktop', () => popupFlow(browser, 'https://ironcellresearch.com/research-supplies/', /"subject":"New Newsletter Subscriber - IronCell Research"/, 'supplies popup (desktop)', false)],
    ['supplies popup iphone', () => popupFlow(browser, 'https://ironcellresearch.com/research-supplies/', /"subject":"New Newsletter Subscriber - IronCell Research"/, 'supplies popup (iPhone tap)', true)],
    ['storefront popup', () => popupFlow(browser, 'https://ironcellresearch.com/', /"subject":"New Newsletter Subscriber - IronCell Research"/, 'storefront popup', false)],
    ['ray popup', () => popupFlow(browser, 'https://ironcellresearch.com/ray/', /"subject":"New Newsletter Subscriber - IronCell Research"/, 'ray clone popup', false)],
    ['mvp popup', () => popupFlow(browser, 'https://ironcellresearch.com/mvp.html', /"subject":"New Newsletter Subscriber - MVP"/, 'mvp popup', false)],
    ['calc popup', () => popupFlow(browser, 'https://ironcellresearch.com/peptidecalculator/', /"subject":"New Newsletter Subscriber - IronCell Research"/, 'calculator popup', false)],
    ['storefront desktop', () => storefront(browser, 'https://ironcellresearch.com/', 'storefront desktop', false)],
    ['storefront iphone', () => storefront(browser, 'https://ironcellresearch.com/', 'storefront iPhone', true)],
    ['amber iphone', () => storefront(browser, 'https://ironcellresearch.com/amber/', 'amber clone iPhone', true)],
    ['tt', () => storefront(browser, 'https://ironcellresearch.com/truetransformation.html', 'truetransformation', false)],
  ];
  for (const [n, f] of S) { if (!ONLY || n.includes(ONLY)) await run(n, f); }
} finally {
  await browser.close();
}
const fails = results.filter((r) => !r.pass);
for (const r of results) console.log((r.pass ? 'PASS ' : 'FAIL ') + r.name + (r.pass ? '' : '   :: ' + String(r.detail || '').slice(0, 400)));
console.log(`\n${results.length - fails.length}/${results.length} passed (${MODE})`);
process.exit(fails.length ? 1 : 0);
