// utils.js の挙動検証ハーネス（jsdom不要・vmで最小スタブ）
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const SRC = process.argv[2] || '../utils.js';
const code = fs.readFileSync(path.resolve(__dirname, SRC), 'utf8');

function makeStorage(seed) {
  const m = new Map(seed || []);
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
    _dump: () => Object.fromEntries(m),
    _map: m,
  };
}

// 1ページ読み込みをシミュレートする。ls は呼び出し間で共有＝サイト内回遊を再現
function loadPage({ ls, search, referrer, origin }) {
  const ss = makeStorage();
  let readyFn = null;
  let clickHandler = null;

  const $ = function (arg) {
    if (typeof arg === 'function') { readyFn = arg; return; }
    if (arg === 'a') {
      return { click: h => { clickHandler = h; } };
    }
    // 要素ラッパー
    const el = arg;
    return {
      attr: (name, val) => {
        if (val === undefined) return el[name];
        el[name] = val;
        return undefined;
      },
    };
  };

  const sandbox = {
    window: { location: { search, origin } },
    location: { search, origin },
    document: { referrer },
    localStorage: ls,
    sessionStorage: ss,
    console: { log: () => {} },
    $,
    URL, URLSearchParams, JSON, Date, Number, Object, String,
    decodeURIComponent, encodeURIComponent,
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  if (readyFn) readyFn();

  // 実ブラウザと同じく <a> 要素はページ内で永続する。
  // クリックごとに要素を作り直すと、書き換え済み href への再追記を見逃す。
  const els = new Map();

  return {
    // href を持つ擬似 <a> をクリックして書き換え後の href を返す
    click(href) {
      let el = els.get(href);
      if (!el) { el = { href }; els.set(href, el); }
      clickHandler.call(el);
      return el.href;
    },
    ls,
  };
}

// ---- アサーション ----
let pass = 0, fail = 0;
function check(label, cond, detail) {
  if (cond) { pass++; console.log('  PASS  ' + label); }
  else { fail++; console.log('  FAIL  ' + label + (detail ? '\n          ' + detail : '')); }
}
function paramsOf(url) {
  const q = url.split('?')[1] || '';
  const out = {};
  const dup = {};
  for (const kv of q.split('&')) {
    if (!kv) continue;
    const i = kv.indexOf('=');
    const k = i < 0 ? kv : kv.slice(0, i);
    const v = i < 0 ? '' : kv.slice(i + 1);
    if (k in out) dup[k] = (dup[k] || 1) + 1;
    out[k] = v;
  }
  return { p: out, dup };
}

const SF = 'https://go.ovice.com/l/1041722/2026-01-01/abc';
const TRIAL = 'https://app.ovice.com/trial-form';
const ORIGIN = 'https://ovice.com';

console.log('=== 対象: ' + SRC + ' ===\n');

// --- ケース1: 着地ページから直接フォームへ（回帰） ---
console.log('[1] ?utm_source=A&utm_medium=B で着地 → そのままフォーム');
{
  const ls = makeStorage();
  const pg = loadPage({ ls, search: '?utm_source=A&utm_medium=B', referrer: 'https://www.google.com/', origin: ORIGIN });
  const { p, dup } = paramsOf(pg.click(SF));
  check('utm_source=A', p.utm_source === 'A', JSON.stringify(p));
  check('utm_medium=B', p.utm_medium === 'B', JSON.stringify(p));
  check('mark_source あり', !!p.mark_source, JSON.stringify(p));
  check('重複パラメータなし', Object.keys(dup).length === 0, JSON.stringify(dup));
}

// --- ケース2: 1ページ回遊してからフォーム（本命） ---
console.log('\n[2] ?utm_source=A&utm_medium=B で着地 → 別ページ回遊 → フォーム');
{
  const ls = makeStorage();
  loadPage({ ls, search: '?utm_source=A&utm_medium=B', referrer: 'https://www.google.com/', origin: ORIGIN });
  const pg2 = loadPage({ ls, search: '', referrer: ORIGIN + '/lp', origin: ORIGIN });
  const { p, dup } = paramsOf(pg2.click(SF));
  check('utm_source=A が生き残る', p.utm_source === 'A', JSON.stringify(p));
  check('utm_medium=B が生き残る', p.utm_medium === 'B', JSON.stringify(p));
  check('mark_source あり', !!p.mark_source, JSON.stringify(p));
  check('重複パラメータなし', Object.keys(dup).length === 0, JSON.stringify(dup));
}

// --- ケース3: trial-form でも回遊後に残るか ---
console.log('\n[3] 同条件 → trial-form へ（両分岐対象の確認）');
{
  const ls = makeStorage();
  loadPage({ ls, search: '?utm_source=A&utm_campaign=C1', referrer: 'https://www.google.com/', origin: ORIGIN });
  const pg2 = loadPage({ ls, search: '', referrer: ORIGIN + '/lp', origin: ORIGIN });
  const { p, dup } = paramsOf(pg2.click(TRIAL));
  check('utm_source=A', p.utm_source === 'A', JSON.stringify(p));
  check('utm_campaign=C1', p.utm_campaign === 'C1', JSON.stringify(p));
  check('ms（MSUID）あり', !!p.ms, JSON.stringify(p));
  check('mark_source は付かない', p.mark_source === undefined, JSON.stringify(p));
  check('重複パラメータなし', Object.keys(dup).length === 0, JSON.stringify(dup));
}

// --- ケース4: utm セット単位の上書き ---
console.log('\n[4] utm_source=A&utm_campaign=C1 で着地 → 後日 utm_source=C のみで再着地');
{
  const ls = makeStorage();
  loadPage({ ls, search: '?utm_source=A&utm_campaign=C1', referrer: 'https://www.google.com/', origin: ORIGIN });
  const pg2 = loadPage({ ls, search: '?utm_source=C', referrer: 'https://www.bing.com/', origin: ORIGIN });
  const { p } = paramsOf(pg2.click(SF));
  check('utm_source=C に上書き', p.utm_source === 'C', JSON.stringify(p));
  check('前キャンペーンの utm_campaign=C1 が混ざらない', p.utm_campaign === undefined, JSON.stringify(p));
}

// --- ケース5: gclid 単独 ---
console.log('\n[5] ?gclid=GX のみで着地（utm は前回値を保持）→ 回遊 → フォーム');
{
  const ls = makeStorage();
  loadPage({ ls, search: '?utm_source=A', referrer: 'https://www.google.com/', origin: ORIGIN });
  loadPage({ ls, search: '?gclid=GX', referrer: 'https://www.google.com/', origin: ORIGIN });
  const pg3 = loadPage({ ls, search: '', referrer: ORIGIN + '/lp', origin: ORIGIN });
  const { p } = paramsOf(pg3.click(SF));
  check('gclid=GX', p.gclid === 'GX', JSON.stringify(p));
  check('utm_source=A を保持', p.utm_source === 'A', JSON.stringify(p));
  check('小文字 gclid で出る（GCLID ではない）', p.GCLID === undefined, JSON.stringify(p));
}

// --- ケース6: 同一ページで2回クリック（既存バグの回帰） ---
console.log('\n[6] 同一ページでリンクを2回クリック');
{
  const ls = makeStorage();
  const pg = loadPage({ ls, search: '?utm_source=A', referrer: 'https://www.google.com/', origin: ORIGIN });
  const first = paramsOf(pg.click(SF));
  const second = paramsOf(pg.click(SF));
  check('1回目に重複なし', Object.keys(first.dup).length === 0, JSON.stringify(first.dup));
  check('2回目にも重複なし', Object.keys(second.dup).length === 0, JSON.stringify(second.dup));
  check('2回目も utm_source=A', second.p.utm_source === 'A', JSON.stringify(second.p));
}

// --- ケース7: 有効期限30日 ---
console.log('\n[7] 保存から31日経過後');
{
  const ls = makeStorage();
  loadPage({ ls, search: '?utm_source=A', referrer: 'https://www.google.com/', origin: ORIGIN });
  const rec = JSON.parse(ls.getItem('ovicecom_sAds'));
  rec.ts = Date.now() - 31 * 24 * 60 * 60 * 1000;
  ls.setItem('ovicecom_sAds', JSON.stringify(rec));
  const pg2 = loadPage({ ls, search: '', referrer: ORIGIN + '/lp', origin: ORIGIN });
  const { p } = paramsOf(pg2.click(SF));
  check('期限切れの utm は付かない', p.utm_source === undefined, JSON.stringify(p));
  check('mark_source は従来どおり付く', !!p.mark_source, JSON.stringify(p));
  check('ストアが削除される', ls.getItem('ovicecom_sAds') === null);
}

// --- ケース8: 値のエスケープ ---
console.log('\n[8] 値に & = 空白 日本語 を含む');
{
  const ls = makeStorage();
  const raw = '?utm_campaign=' + encodeURIComponent('a&b=c 日本語');
  loadPage({ ls, search: raw, referrer: 'https://www.google.com/', origin: ORIGIN });
  const pg2 = loadPage({ ls, search: '', referrer: ORIGIN + '/lp', origin: ORIGIN });
  const url = pg2.click(SF);
  const { p } = paramsOf(url);
  check('復元後の値が壊れない', decodeURIComponent(p.utm_campaign || '') === 'a&b=c 日本語',
    'raw=' + p.utm_campaign + '  url=' + url);
}

// --- ケース9: フォーム以外のリンクには何も付けない ---
console.log('\n[9] 通常の内部リンク / アンカー');
{
  const ls = makeStorage();
  const pg = loadPage({ ls, search: '?utm_source=A', referrer: 'https://www.google.com/', origin: ORIGIN });
  check('内部リンクは書き換えない', pg.click('/about') === '/about');
  check('# は書き換えない', pg.click('#top') === '#top');
  check('? は書き換えない', pg.click('?page=2') === '?page=2');
}

// --- ケース10: localStorage が使えない環境 ---
console.log('\n[10] localStorage 不在（エラーを出さず現URLのみで動く）');
{
  let readyFn = null, clickHandler = null;
  const $ = function (arg) {
    if (typeof arg === 'function') { readyFn = arg; return; }
    if (arg === 'a') return { click: h => { clickHandler = h; } };
    const el = arg;
    return { attr: (n, v) => { if (v === undefined) return el[n]; el[n] = v; } };
  };
  const sandbox = {
    window: { location: { search: '?utm_source=A', origin: ORIGIN } },
    location: { search: '?utm_source=A', origin: ORIGIN },
    document: { referrer: 'https://www.google.com/' },
    console: { log: () => {} },
    $, URL, URLSearchParams, JSON, Date, Number, Object, String,
    decodeURIComponent, encodeURIComponent,
  };
  vm.createContext(sandbox);
  let err = null;
  try {
    vm.runInContext(code, sandbox);
    if (readyFn) readyFn();
    const el = { href: SF };
    clickHandler.call(el);
    check('例外を投げない', true);
    check('パラメータは付かない（従来と同じ）', el.href === SF, el.href);
  } catch (e) {
    err = e;
    check('例外を投げない', false, String(e));
  }
}

// --- ケース11: リセット（fEntry=99）でストアも消える ---
console.log('\n[11] sessionStorage fEntry=99 のリセット');
{
  const ls = makeStorage();
  loadPage({ ls, search: '?utm_source=A', referrer: 'https://www.google.com/', origin: ORIGIN });
  check('リセット前はストアあり', ls.getItem('ovicecom_sAds') !== null);
  // fEntry=99 のページ読み込みを再現するため sessionStorage を差し込む
  {
    const ss = makeStorage([['ovicecom_fEntry', '99']]);
    let readyFn = null;
    const $ = function (arg) {
      if (typeof arg === 'function') { readyFn = arg; return; }
      if (arg === 'a') return { click: () => {} };
      return { attr: () => {} };
    };
    const sandbox = {
      window: { location: { search: '', origin: ORIGIN } },
      location: { search: '', origin: ORIGIN },
      document: { referrer: ORIGIN + '/lp' },
      localStorage: ls, sessionStorage: ss,
      console: { log: () => {} },
      $, URL, URLSearchParams, JSON, Date, Number, Object, String,
      decodeURIComponent, encodeURIComponent,
    };
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);
    if (readyFn) readyFn();
  }
  check('リセット後はストアが消える', ls.getItem('ovicecom_sAds') === null, JSON.stringify(ls._dump()));
}

// --- ケース12: 素の % を含むURL（036では URIError でスクリプト全停止） ---
console.log('\n[12] ?q=100% で着地（decodeURIComponent の URIError）');
{
  const ls = makeStorage();
  let err = null, url = null;
  try {
    const pg = loadPage({ ls, search: '?q=100%', referrer: 'https://www.google.com/', origin: ORIGIN });
    url = pg.click(SF);
  } catch (e) { err = e; }
  check('例外を投げない', err === null, err ? String(err) : '');
  if (!err) {
    const { p } = paramsOf(url);
    check('mark_source が付く（スクリプトが生きている）', !!p.mark_source, JSON.stringify(p));
  }
}

// --- ケース13: 現URLに utm があるとき二重付与しない ---
console.log('\n[13] 保存値ありの状態で utm_source を持つページからフォームへ');
{
  const ls = makeStorage();
  loadPage({ ls, search: '?utm_source=OLD', referrer: 'https://www.google.com/', origin: ORIGIN });
  const pg2 = loadPage({ ls, search: '?utm_source=NEW', referrer: 'https://www.google.com/', origin: ORIGIN });
  const { p, dup } = paramsOf(pg2.click(SF));
  check('utm_source が1つだけ', dup.utm_source === undefined, JSON.stringify(dup));
  check('現URLの値 NEW が採用される', p.utm_source === 'NEW', JSON.stringify(p));
}

console.log('\n=== 結果: ' + pass + ' passed, ' + fail + ' failed ===');
process.exit(fail === 0 ? 0 : 1);
