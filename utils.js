// ovice utils build 036 by Tok@ovice, 2026
var global_utils = 36;
var global_prm;
var global_prm_val;
const msuid_direct = 'dir_na_non';
const url_form_trial = 'trial-form';
const url_form_sf = 'go.ovice.com';
const url_form_ovice = 'inforea.ch';

function retrieveGETqs() {
  var query = window.location.search.substring(1);
  if (!query) return false;
  return query;
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
  global_prm = str ? decodeURIComponent(str) : '';
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
      return;
    }
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
    var target_url = $(this).attr('href');
    if (!target_url.startsWith('#') && !target_url.startsWith('?')) {
      var at = '';
      var p = false;
      if(typeof localStorage !== 'undefined') {
        var s = localStorage;
        if (target_url.includes(url_form_trial)) {
          if (s.getItem('ovicecom_attribution')) {
            at = 'mp=' + s.getItem('ovicecom_cPages') + '&mv=' + s.getItem('ovicecom_cVisits') + '&mf=' + s.getItem('ovicecom_sFirstRef') + '&ms=' + s.getItem('ovicecom_attribution');
            if (global_prm) {
              global_prm = global_prm + '&' + at;
            } else {
              global_prm = at;
            }
            p = true;
          }
        } else if (target_url.includes(url_form_sf) || target_url.includes(url_form_ovice)) {
          if (s.getItem('ovicecom_attribution')) {
            at = 'mark_pages=' + s.getItem('ovicecom_cPages') + '&mark_visits=' + s.getItem('ovicecom_cVisits') + '&mark_first=' + s.getItem('ovicecom_sFirstRef') + '&mark_source=' + s.getItem('ovicecom_attribution');
            if (global_prm) {
              global_prm = global_prm + '&' + at;
            } else {
              global_prm = at;
            }
            p = true;
          }
        }
      }
      if (p) {
        if (target_url.indexOf('?') != -1) {
          $(this).attr('href', target_url + '&' + global_prm);
        } else {
          $(this).attr('href', target_url + '?' + global_prm);
        }
      }
    }
  })
});
