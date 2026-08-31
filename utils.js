// ovice utils build 037
// builds up to 036 by Tok@ovice, 2024-2026
// build 037: persist utm_* / gclid in localStorage so they survive navigation
//            within the site, and stop mutating global_prm in the click handler
var global_utils = 37;
var global_prm;
var global_prm_val;
const msuid_direct = 'dir_na_non';
const url_form_trial = 'trial-form';
const url_form_sf = 'go.ovice.com';
const url_form_ovice = 'inforea.ch';
const ads_store = 'ovicecom_sAds';
const ads_keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
const ads_ttl = 30 * 24 * 60 * 60 * 1000;

function retrieveGETqs() {
  var query = window.location.search.substring(1);
  if (!query) return false;
  return query;
}

// Read the stored utm_* / gclid. Anything past its expiry is discarded.
function readAdsStore() {
  if (typeof localStorage === 'undefined') return {};
  var raw = localStorage.getItem(ads_store);
  if (!raw) return {};
  var o;
  try { o = JSON.parse(raw); } catch (e) { return {}; }
  if (!o || typeof o !== 'object') return {};
  if (!o.ts || (new Date().getTime() - Number(o.ts)) > ads_ttl) {
    try { localStorage.removeItem(ads_store); } catch (e) {}
    return {};
  }
  return o;
}

// Store utm_* / gclid when the current page URL carries them.
// utm_* is replaced as a set so values from different campaigns never mix.
// gclid is overwritten independently, since ad links may carry it on its own.
function storeAdsParams(v) {
  if (typeof localStorage === 'undefined') return;
  var cur = readAdsStore();
  var changed = false;
  var utm = {};
  var i;
  for (i = 0; i < ads_keys.length; i++) {
    var val = v.get(ads_keys[i]);
    if (val !== null && val !== '') {utm[ads_keys[i]] = val;}
  }
  if (Object.keys(utm).length > 0) {
    for (i = 0; i < ads_keys.length; i++) {delete cur[ads_keys[i]];}
    for (var k in utm) {cur[k] = utm[k];}
    changed = true;
  }
  var g = v.get('gclid');
  if ((g !== null) && (g !== '')) {
    cur.gclid = g;
    changed = true;
  }
  if (changed) {
    cur.ts = new Date().getTime();
    // This runs inside the IIFE. An uncaught throw here (a full quota rejecting a
    // new key, for instance) would stop the script before the click handler is
    // bound, and every link on the page would lose mark_* as well. Losing the ads
    // record is the lesser failure.
    try { localStorage.setItem(ads_store, JSON.stringify(cur)); } catch (e) {}
  }
}

// Build the utm_* / gclid parameters to append to a form link.
// A key is skipped when it is already present either in the current page's URL
// (it gets copied over via global_prm) or on the link itself (hardcoded by the
// site), so that neither source ends up duplicated.
function retrieveAdsParams(target_url) {
  var o = readAdsStore();
  var all = ads_keys.concat(['gclid']);
  var qi = target_url.indexOf('?');
  var tgt = (qi !== -1) ? new URLSearchParams(target_url.slice(qi + 1)) : null;
  var out = [];
  for (var i = 0; i < all.length; i++) {
    var k = all[i];
    if (!o[k]) continue;
    if (global_prm_val && (global_prm_val.get(k) !== null)) continue;
    if (tgt && (tgt.get(k) !== null)) continue;
    out.push(k + '=' + encodeURIComponent(o[k]));
  }
  return out.join('&');
}

function checkAttribution(d) {
  const refdata = `[
    {"domain": "google.", "ref": "seo_go_sea"},
    {"domain": "yahoo.co.jp", "ref": "seo_ya_sea"},
    {"domain": "yahoo.com", "ref": "seo_ya_sea"},
    {"domain": "bing.com", "ref": "seo_mi_sea"},
    {"domain": "duckduckgo.com", "ref": "seo_ot_sea"},
    {"domain": "coccoc.com", "ref": "seo_ot_sea"},
    {"domain": "yandex.com", "ref": "seo_ot_sea"},
    {"domain": "naver.com", "ref": "seo_ot_sea"},
    {"domain": "baidu.com", "ref": "seo_ot_sea"},
    {"domain": "ecosia.org", "ref": "seo_ot_sea"},
    {"domain": "msn.com", "ref": "seo_ot_sea"},
    {"domain": "excite.co.jp", "ref": "seo_ot_sea"},
    {"domain": "goo.ne.jp", "ref": "seo_ot_sea"},
    {"domain": "livedoor.com", "ref": "seo_ot_sea"},
    {"domain": "biglobe.ne.jp", "ref": "seo_ot_sea"},
    {"domain": "ocn.ne.jp", "ref": "seo_ot_sea"},
    {"domain": "nifty.com", "ref": "seo_ot_sea"},
    {"domain": "infoseek.co.jp", "ref": "seo_ot_sea"},
    {"domain": "auone.jp", "ref": "seo_ot_sea"},
    {"domain": "docomo.ne.jp", "ref": "seo_ot_sea"},
    {"domain": "play.google.com", "ref": "aso_go_sea"},
    {"domain": "apps.apple.com", "ref": "aso_ap_sea"},
    {"domain": "note.com", "ref": "own_bl_art"},
    {"domain": "ovice.", "ref": "ref_ov_art"},
    {"domain": "flexergylab.com", "ref": "ref_fl_art"},
    {"domain": "www.itreview.jp", "ref": "ref_it_art"},
    {"domain": "prtimes.jp", "ref": "ref_pr_art"},
    {"domain": "peatix.com", "ref": "ref_pe_art"},
    {"domain": "boxil.jp", "ref": "aso_ot_sea"},
    {"domain": "it-trend.jp", "ref": "ref_ov_art"},
    {"domain": "capterra.jp", "ref": "ref_fl_art"},
    {"domain": "capterra.com", "ref": "ref_it_art"},
    {"domain": "g2.com", "ref": "ref_pr_art"},
    {"domain": "getapp.com", "ref": "ref_pe_art"},
    {"domain": "wantedly.com", "ref": "ref_ot_art"},
    {"domain": "techable.jp", "ref": "ref_ot_art"},
    {"domain": "zendesk.com", "ref": "ref_ot_art"},
    {"domain": "patentsalon.com", "ref": "ref_ot_art"},
    {"domain": "connpas.com", "ref": "ref_ot_art"},
    {"domain": "voice-ping.com", "ref": "ref_ot_art"},
    {"domain": "toremaga.com", "ref": "ref_ot_art"},
    {"domain": "wmr.tokyo", "ref": "ref_ot_art"},
    {"domain": "zdnet.com", "ref": "ref_ot_art"},
    {"domain": "cnet.com", "ref": "ref_ot_art"},
    {"domain": "impress.co.jp", "ref": "ref_ot_art"},
    {"domain": "panora.tokyo", "ref": "ref_ot_art"},
    {"domain": "notion.site", "ref": "ref_ot_art"},
    {"domain": "facebook.com", "ref": "soc_fa_pos"},
    {"domain": "l.facebook.com", "ref": "soc_fa_pos"},
    {"domain": "lm.facebook.com", "ref": "soc_fa_pos"},
    {"domain": "x.com", "ref": "soc_x_pos"},
    {"domain": "linkedin.com", "ref": "soc_ig_pos"},
    {"domain": "youtube.com", "ref": "soc_in_pos"},
    {"domain": "instagram.com", "ref": "soc_yo_pos"}
  ]`;
  var j = JSON.parse(refdata);
  for (var i = 0; i < j.length; i++) {
    if (d.indexOf(j[i].domain) > -1) {return j[i].ref;}
  }
  return 'ref_ot_art';
}

function secdomain(p) {
  var u = new URL(p).hostname;
  var s = u.split('.');
  var l = s.length;
  return s[l-2] + '.' + s[l-1];
}

(function(){
  var str = retrieveGETqs();
  // Do not decodeURIComponent the whole query string: %26 / %3D inside a value
  // turn into separators and break the parameters, and a bare % in the URL
  // (e.g. ?q=100%) throws URIError, which halts this IIFE so that even mark_*
  // stops being applied. URLSearchParams decodes per value, so it is not needed.
  global_prm = str ? str : '';
  global_prm_val = new URLSearchParams(global_prm);

  if ((typeof sessionStorage !== 'undefined') & (typeof localStorage !== 'undefined')) {
    var ls = localStorage;
    var ss = sessionStorage;
    var r = document.referrer;
    var ft = false;
    var u = ls.getItem('ovicecom_utils');
    if ((u == null) || Number(u) < global_utils) {ls.setItem('ovicecom_utils', global_utils);}
    if(ss.getItem('ovicecom_fEntry') === '99') {
      console.log('ovicecom utils: reset');
      ss.removeItem('ovicecom_fEntry');
      ls.removeItem('ovicecom_utils');
      ls.removeItem('ovicecom_cPages');
      ls.removeItem('ovicecom_cVisits');
      ls.removeItem('ovicecom_sFirstRef');
      ls.removeItem('ovicecom_sLastRef');
      ls.removeItem('ovicecom_attribution');
      ls.removeItem(ads_store);
      return;
    }
    storeAdsParams(global_prm_val);
    if (r === '') {
      r = msuid_direct;
    } else {
      var rd = secdomain(r);
      var cd = secdomain(location.origin);
      if (rd === cd) {ft = true;}
    }
    if((ss.getItem('ovicecom_fEntry') === null) && (ft === false)) {
      ss.setItem('ovicecom_fEntry', 1);
      var v = Number(ls.getItem('ovicecom_cVisits'));
      ls.setItem('ovicecom_cVisits', v + 1);
      if (v === 0) {
        ls.setItem('ovicecom_sFirstRef', checkAttribution(r));
      }
      var p;
      if ((p = global_prm_val.get('source')) !== null) {
        ls.setItem('ovicecom_sLastRef', p);
      } else if ((p = global_prm_val.get('mark_source')) !== null) {
        ls.setItem('ovicecom_sLastRef', p);
      } else {
        ls.setItem('ovicecom_sLastRef', (r === msuid_direct ? r : checkAttribution(r)));
      }
    }
    var t = new Date();
    ls.setItem('ovicecom_nLastTime', t.getTime());
    ls.setItem('ovicecom_cPages', Number(ls.getItem('ovicecom_cPages')) + 1);
    ls.setItem('ovicecom_attribution', ls.getItem('ovicecom_sLastRef'));
  }
})();

$(function(){
  $('a').click(function() {
    // The handler rewrites href in place, and the element outlives the click, so a
    // second click has to rebuild from the original href instead of appending again
    // (a double-click would otherwise duplicate every parameter).
    if (!('ovice_base' in this)) {this.ovice_base = $(this).attr('href');}
    var target_url = this.ovice_base;
    if (!target_url.startsWith('#') && !target_url.startsWith('?')) {
      var at = '';
      var p = false;
      if(typeof localStorage !== 'undefined') {
        var s = localStorage;
        var is_trial = target_url.includes(url_form_trial);
        var is_form = is_trial || target_url.includes(url_form_sf) || target_url.includes(url_form_ovice);
        if (is_form) {
          if (s.getItem('ovicecom_attribution')) {
            if (is_trial) {
              at = 'mp=' + s.getItem('ovicecom_cPages') + '&mv=' + s.getItem('ovicecom_cVisits') + '&mf=' + s.getItem('ovicecom_sFirstRef') + '&ms=' + s.getItem('ovicecom_attribution');
            } else {
              at = 'mark_pages=' + s.getItem('ovicecom_cPages') + '&mark_visits=' + s.getItem('ovicecom_cVisits') + '&mark_first=' + s.getItem('ovicecom_sFirstRef') + '&mark_source=' + s.getItem('ovicecom_attribution');
            }
            p = true;
          }
          var ads = retrieveAdsParams(target_url);
          if (ads) {
            at = at ? at + '&' + ads : ads;
            p = true;
          }
        }
      }
      if (p) {
        var qs = global_prm ? global_prm + '&' + at : at;
        if (target_url.indexOf('?') != -1) {
          $(this).attr('href', target_url + '&' + qs);
        } else {
          $(this).attr('href', target_url + '?' + qs);
        }
      }
    }
  })
});
