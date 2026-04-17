(function () {
  const version = '1.1.0';

  function ensureCurrentMonthSelected(callback) {
    const monthSelect = document.querySelector('select#Donem_Id');
    if (!monthSelect) { callback(); return; }

    const currentMonthText = (new Date()).toLocaleString('tr-TR', { month: 'long' }).toLocaleUpperCase('tr-TR');
    const currentYearShort = String(new Date().getFullYear()).slice(-2);

    const selected = monthSelect.options[monthSelect.selectedIndex];
    if (selected && selected.textContent.includes(currentMonthText)) {
      callback();
      return;
    }

    for (let i = 0; i < monthSelect.options.length; i++) {
      const opt = monthSelect.options[i];
      if (opt.textContent.includes(currentMonthText) && opt.textContent.includes(currentYearShort)) {
        monthSelect.selectedIndex = i;
        monthSelect.dispatchEvent(new Event('change', { bubbles: true }));
        setTimeout(callback, 1200);
        return;
      }
    }
    callback();
  }

  function openPdksPanel(onReady) {
    console.log('[PDKS] openPdksPanel başladı');

    // HTML yapısı: li.sub_folder > a > span.folder-item-parent "PDKS"
    const pdksFolderA = Array.from(document.querySelectorAll('li.sub_folder > a'))
      .find(a => a.textContent.includes('PDKS'));

    if (!pdksFolderA) {
      console.error('[PDKS] li.sub_folder > a[PDKS] bulunamadı');
      alert("PDKS menüsü bulunamadı. Portal'a giriş yaptığınızdan emin olun.");
      return;
    }

    console.log('[PDKS] PDKS folder A bulundu, tıklanıyor');
    pdksFolderA.click();

    setTimeout(() => {
      // HTML yapısı: ul#menu-folder-28 > li.EndLineMenu > a "PDKS Giriş-Çıkış Bilgileri Kartı"
      const pdksUl = document.querySelector('ul#menu-folder-28');
      const kartA = pdksUl
        ? Array.from(pdksUl.querySelectorAll('li.EndLineMenu > a'))
            .find(a => a.textContent.includes('Giriş-Çıkış'))
        : null;

      console.log('[PDKS] #menu-folder-28:', !!pdksUl, '| Kart A:', !!kartA, kartA?.textContent.trim());

      if (!kartA) {
        alert('"PDKS Giriş-Çıkış Bilgileri Kartı" menüsü bulunamadı. Manuel olarak açın.');
        return;
      }

      kartA.click();
      console.log('[PDKS] Kart A tıklandı, panel bekleniyor...');

      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        if (document.querySelector('#grid_kesin_giris_cikis')) {
          clearInterval(poll);
          console.log('[PDKS] Panel yüklendi!');
          setTimeout(onReady, 700);
        } else if (attempts > 25) {
          clearInterval(poll);
          console.error('[PDKS] Panel yüklenemedi (25 deneme)');
          alert('Panel yüklenemedi. Lütfen manuel olarak açıp tekrar deneyin.');
        }
      }, 300);
    }, 500);
  }

  function runApp() {
    ensureCurrentMonthSelected(function () {

      /** dayjs */
      !function (t, n) { "object" == typeof exports && "undefined" != typeof module ? module.exports = n() : "function" == typeof define && define.amd ? define(n) : t.dayjs = n() }(this, function () { "use strict"; var t = "millisecond", n = "second", e = "minute", r = "hour", i = "day", s = "week", u = "month", o = "quarter", a = "year", h = /^(\d{4})-?(\d{1,2})-?(\d{0,2})[^0-9]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?.?(\d{1,3})?$/, f = /\[([^\]]+)]|Y{2,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g, c = function (t, n, e) { var r = String(t); return !r || r.length >= n ? t : "" + Array(n + 1 - r.length).join(e) + t }, d = { s: c, z: function (t) { var n = -t.utcOffset(), e = Math.abs(n), r = Math.floor(e / 60), i = e % 60; return (n <= 0 ? "+" : "-") + c(r, 2, "0") + ":" + c(i, 2, "0") }, m: function (t, n) { var e = 12 * (n.year() - t.year()) + (n.month() - t.month()), r = t.clone().add(e, u), i = n - r < 0, s = t.clone().add(e + (i ? -1 : 1), u); return Number(-(e + (n - r) / (i ? r - s : s - r)) || 0) }, a: function (t) { return t < 0 ? Math.ceil(t) || 0 : Math.floor(t) }, p: function (h) { return { M: u, y: a, w: s, d: i, D: "date", h: r, m: e, s: n, ms: t, Q: o }[h] || String(h || "").toLowerCase().replace(/s$/, "") }, u: function (t) { return void 0 === t } }, $ = { name: "en", weekdays: "Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"), months: "January_February_March_April_May_June_July_August_September_October_November_December".split("_") }, l = "en", m = {}; m[l] = $; var y = function (t) { return t instanceof v }, M = function (t, n, e) { var r; if (!t) return l; if ("string" == typeof t) m[t] && (r = t), n && (m[t] = n, r = t); else { var i = t.name; m[i] = t, r = i } return e || (l = r), r }, g = function (t, n, e) { if (y(t)) return t.clone(); var r = n ? "string" == typeof n ? { format: n, pl: e } : n : {}; return r.date = t, new v(r) }, D = d; D.l = M, D.i = y, D.w = function (t, n) { return g(t, { locale: n.$L, utc: n.$u, $offset: n.$offset }) }; var v = function () { function c(t) { this.$L = this.$L || M(t.locale, null, !0), this.parse(t) } var d = c.prototype; return d.parse = function (t) { this.$d = function (t) { var n = t.date, e = t.utc; if (null === n) return new Date(NaN); if (D.u(n)) return new Date; if (n instanceof Date) return new Date(n); if ("string" == typeof n && !/Z$/i.test(n)) { var r = n.match(h); if (r) return e ? new Date(Date.UTC(r[1], r[2] - 1, r[3] || 1, r[4] || 0, r[5] || 0, r[6] || 0, r[7] || 0)) : new Date(r[1], r[2] - 1, r[3] || 1, r[4] || 0, r[5] || 0, r[6] || 0, r[7] || 0) } return new Date(n) }(t), this.init() }, d.init = function () { var t = this.$d; this.$y = t.getFullYear(), this.$M = t.getMonth(), this.$D = t.getDate(), this.$W = t.getDay(), this.$H = t.getHours(), this.$m = t.getMinutes(), this.$s = t.getSeconds(), this.$ms = t.getMilliseconds() }, d.$utils = function () { return D }, d.isValid = function () { return !("Invalid Date" === this.$d.toString()) }, d.isSame = function (t, n) { var e = g(t); return this.startOf(n) <= e && e <= this.endOf(n) }, d.isAfter = function (t, n) { return g(t) < this.startOf(n) }, d.isBefore = function (t, n) { return this.endOf(n) < g(t) }, d.$g = function (t, n, e) { return D.u(t) ? this[n] : this.set(e, t) }, d.year = function (t) { return this.$g(t, "$y", a) }, d.month = function (t) { return this.$g(t, "$M", u) }, d.day = function (t) { return this.$g(t, "$W", i) }, d.date = function (t) { return this.$g(t, "$D", "date") }, d.hour = function (t) { return this.$g(t, "$H", r) }, d.minute = function (t) { return this.$g(t, "$m", e) }, d.second = function (t) { return this.$g(t, "$s", n) }, d.millisecond = function (n) { return this.$g(n, "$ms", t) }, d.unix = function () { return Math.floor(this.valueOf() / 1e3) }, d.valueOf = function () { return this.$d.getTime() }, d.startOf = function (t, o) { var h = this, f = !!D.u(o) || o, c = D.p(t), d = function (t, n) { var e = D.w(h.$u ? Date.UTC(h.$y, n, t) : new Date(h.$y, n, t), h); return f ? e : e.endOf(i) }, $ = function (t, n) { return D.w(h.toDate()[t].apply(h.toDate(), (f ? [0, 0, 0, 0] : [23, 59, 59, 999]).slice(n)), h) }, l = this.$W, m = this.$M, y = this.$D, M = "set" + (this.$u ? "UTC" : ""); switch (c) { case a: return f ? d(1, 0) : d(31, 11); case u: return f ? d(1, m) : d(0, m + 1); case s: var g = this.$locale().weekStart || 0, v = (l < g ? l + 7 : l) - g; return d(f ? y - v : y + (6 - v), m); case i: case "date": return $(M + "Hours", 0); case r: return $(M + "Minutes", 1); case e: return $(M + "Seconds", 2); case n: return $(M + "Milliseconds", 3); default: return this.clone() } }, d.endOf = function (t) { return this.startOf(t, !1) }, d.$set = function (s, o) { var h, f = D.p(s), c = "set" + (this.$u ? "UTC" : ""), d = (h = {}, h[i] = c + "Date", h.date = c + "Date", h[u] = c + "Month", h[a] = c + "FullYear", h[r] = c + "Hours", h[e] = c + "Minutes", h[n] = c + "Seconds", h[t] = c + "Milliseconds", h)[f], $ = f === i ? this.$D + (o - this.$W) : o; if (f === u || f === a) { var l = this.clone().set("date", 1); l.$d[d]($), l.init(), this.$d = l.set("date", Math.min(this.$D, l.daysInMonth())).toDate() } else d && this.$d[d]($); return this.init(), this }, d.set = function (t, n) { return this.clone().$set(t, n) }, d.get = function (t) { return this[D.p(t)]() }, d.add = function (t, o) { var h, f = this; t = Number(t); var c = D.p(o), d = function (n) { var e = g(f); return D.w(e.date(e.date() + Math.round(n * t)), f) }; if (c === u) return this.set(u, this.$M + t); if (c === a) return this.set(a, this.$y + t); if (c === i) return d(1); if (c === s) return d(7); var $ = (h = {}, h[e] = 6e4, h[r] = 36e5, h[n] = 1e3, h)[c] || 1, l = this.$d.getTime() + t * $; return D.w(l, this) }, d.subtract = function (t, n) { return this.add(-1 * t, n) }, d.format = function (t) { var n = this; if (!this.isValid()) return "Invalid Date"; var e = t || "YYYY-MM-DDTHH:mm:ssZ", r = D.z(this), i = this.$locale(), s = this.$H, u = this.$m, o = this.$M, a = i.weekdays, h = i.months, c = function (t, r, i, s) { return t && (t[r] || t(n, e)) || i[r].substr(0, s) }, d = function (t) { return D.s(s % 12 || 12, t, "0") }, $ = i.meridiem || function (t, n, e) { var r = t < 12 ? "AM" : "PM"; return e ? r.toLowerCase() : r }, l = { YY: String(this.$y).slice(-2), YYYY: this.$y, M: o + 1, MM: D.s(o + 1, 2, "0"), MMM: c(i.monthsShort, o, h, 3), MMMM: h[o] || h(this, e), D: this.$D, DD: D.s(this.$D, 2, "0"), d: String(this.$W), dd: c(i.weekdaysMin, this.$W, a, 2), ddd: c(i.weekdaysShort, this.$W, a, 3), dddd: a[this.$W], H: String(s), HH: D.s(s, 2, "0"), h: d(1), hh: d(2), a: $(s, u, !0), A: $(s, u, !1), m: String(u), mm: D.s(u, 2, "0"), s: String(this.$s), ss: D.s(this.$s, 2, "0"), SSS: D.s(this.$ms, 3, "0"), Z: r }; return e.replace(f, function (t, n) { return n || l[t] || r.replace(":", "") }) }, d.utcOffset = function () { return 15 * -Math.round(this.$d.getTimezoneOffset() / 15) }, d.diff = function (t, h, f) { var c, d = D.p(h), $ = g(t), l = 6e4 * ($.utcOffset() - this.utcOffset()), m = this - $, y = D.m(this, $); return y = (c = {}, c[a] = y / 12, c[u] = y, c[o] = y / 3, c[s] = (m - l) / 6048e5, c[i] = (m - l) / 864e5, c[r] = m / 36e5, c[e] = m / 6e4, c[n] = m / 1e3, c)[d] || m, f ? y : D.a(y) }, d.daysInMonth = function () { return this.endOf(u).$D }, d.$locale = function () { return m[this.$L] }, d.locale = function (t, n) { if (!t) return this.$L; var e = this.clone(), r = M(t, n, !0); return r && (e.$L = r), e }, d.clone = function () { return D.w(this.$d, this) }, d.toDate = function () { return new Date(this.valueOf()) }, d.toJSON = function () { return this.isValid() ? this.toISOString() : null }, d.toISOString = function () { return this.$d.toISOString() }, d.toString = function () { return this.$d.toUTCString() }, c }(); return g.prototype = v.prototype, g.extend = function (t, n) { return t(n, v, g), g }, g.locale = M, g.isDayjs = y, g.unix = function (t) { return g(1e3 * t) }, g.en = m[l], g.Ls = m, g });

      // week offset: 0 = this week, -1 = last week, -2 = two weeks ago ...
      let weekOffset = 0;

      function getMondayOfWeek(offset) {
        const d = new Date();
        const day = d.getDay();
        d.setDate(d.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
        d.setHours(0, 0, 0, 0);
        return d;
      }

      function getSundayOfWeek(offset) {
        const mon = getMondayOfWeek(offset);
        const sun = new Date(mon);
        sun.setDate(mon.getDate() + 6);
        sun.setHours(23, 59, 59, 999);
        return sun;
      }

      function calculateTime(time) {
        let minute = Math.round(time * 60);
        let hour = 0;
        while (minute >= 60) { minute -= 60; hour++; }
        return [hour, minute];
      }

      function calculateRemaining(time, week = false, target = week ? 45 : 9) {
        const remaining = target - time;
        if (remaining <= 0) return [0, 0];
        return calculateTime(remaining);
      }


      function timeNormalize(value) {
        let [date, time] = value.split(/[ \n]/);
        date = date.split('.').reverse().join('-');
        return [
          date?.trim().replace(/(\r\n|\n|\r)/gm, ''),
          time?.trim().replace(/(\r\n|\n|\r)/gm, ''),
        ];
      }

      function capDailyHours(h, m) {
        if (h > 11 || (h === 11 && m > 0)) return [11, 0];
        return [h, m];
      }

      function parseOOO(str) {
        if (!str) return 0;
        const parts = String(str).trim().split(':');
        if (parts.length === 2) return Math.max(0, parseInt(parts[0]) || 0) * 60 + Math.max(0, Math.min(59, parseInt(parts[1]) || 0));
        return Math.max(0, parseInt(str) || 0) * 60;
      }

      function formatOOO(minutes) {
        if (!minutes) return '0:00';
        return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
      }

      // ── Leave / OOO helpers ─────────────────────────────────────
      const GITHUB_REPO = 'rasitokumus/pdks-extension';

      function getWeekKey(offset) {
        const d = getMondayOfWeek(offset);
        return d.toISOString().slice(0, 10);
      }

      function getLeaveData(weekKey) {
        try { return JSON.parse(localStorage.getItem(`pdks_${weekKey}`) || '{"leave":0,"ooo":0,"autoDetected":true}'); }
        catch { return { leave: 0, ooo: 0, autoDetected: true }; }
      }

      function saveLeaveData(weekKey, data) {
        localStorage.setItem(`pdks_${weekKey}`, JSON.stringify(data));
      }

      async function fetchLatestVersion() {
        try {
          const res = await fetch(`https://raw.githubusercontent.com/${GITHUB_REPO}/main/manifest.json`);
          const { version: v } = await res.json();
          return v;
        } catch { return null; }
      }

      // ── UI helpers ──────────────────────────────────────────────
      function addNoticeBox() {
        document.querySelector('#script-notice-box')?.remove();
        const box = document.createElement('div');
        box.id = 'script-notice-box';
        Object.assign(box.style, {
          width: '420px',
          position: 'absolute',
          left: '24px',
          top: '618px',
          zIndex: '9999',
          backgroundColor: '#fff',
          borderRadius: '14px',
          boxShadow: '0 6px 28px rgba(0,0,0,0.14)',
          fontFamily: 'system-ui,-apple-system,BlinkMacSystemFont,sans-serif',
          overflow: 'hidden',
        });

        // stats container (cleared & re-filled on each app() call)
        const stats = document.createElement('div');
        stats.id = 'pdks-stats';
        box.appendChild(stats);

        // version footer (created once, never cleared)
        const footer = document.createElement('div');
        footer.id = 'pdks-footer';
        Object.assign(footer.style, {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '7px 16px',
          borderTop: '1px solid #f0f0f0',
        });

        const verSpan = document.createElement('span');
        verSpan.textContent = `v${version.replace(/^v/, '')}`;
        Object.assign(verSpan.style, { color: '#ccc', fontSize: '11px' });

        const updateLink = document.createElement('a');
        updateLink.id = 'pdks-update-link';
        updateLink.href = `https://github.com/${GITHUB_REPO}/releases`;
        updateLink.target = '_blank';
        updateLink.textContent = 'Kontrol ediliyor…';
        Object.assign(updateLink.style, { color: '#bbb', fontSize: '11px', textDecoration: 'none' });

        footer.appendChild(verSpan);
        footer.appendChild(updateLink);
        box.appendChild(footer);
        document.body.appendChild(box);

        fetchLatestVersion().then(latest => {
          const el = document.querySelector('#pdks-update-link');
          if (!el) return;
          if (!latest) { el.textContent = 'Releases ↗'; return; }
          if (latest === version) {
            el.textContent = '✅ Güncel';
            el.style.color = '#10b981';
            el.removeAttribute('href');
            el.style.cursor = 'default';
          } else {
            el.textContent = `🔴 v${latest} mevcut`;
            el.style.color = '#ef4444';
            el.href = `https://github.com/${GITHUB_REPO}/releases`;
          }
        });
      }

      function addRow(label, value, { cls = '', color = '#111', small = false } = {}) {
        const stats = document.querySelector('#pdks-stats');
        const row = document.createElement('div');
        row.className = `script-input${cls ? ' ' + cls : ''}`;
        Object.assign(row.style, {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          padding: small ? '2px 16px' : '5px 16px',
        });
        row.innerHTML = `
          <span style="color:#888;font-size:${small ? '12' : '13'}px;">${label}</span>
          <span style="color:${color};font-weight:600;font-size:${small ? '12' : '14'}px;">${value}</span>
        `;
        stats.appendChild(row);
      }

      function addDivider() {
        const stats = document.querySelector('#pdks-stats');
        const d = document.createElement('div');
        d.className = 'script-input';
        Object.assign(d.style, { height: '1px', background: '#f3f3f3', margin: '5px 16px' });
        stats.appendChild(d);
      }

      function addProgressBar(pct, targetH) {
        const stats = document.querySelector('#pdks-stats');
        const p = Math.min(100, Math.round(pct));
        const color = p >= 100 ? '#10b981' : p >= 70 ? '#3b82f6' : '#f59e0b';
        const wrap = document.createElement('div');
        wrap.className = 'script-input';
        Object.assign(wrap.style, { padding: '4px 16px 8px' });
        wrap.innerHTML = `
          <div style="height:5px;border-radius:3px;background:#eee;overflow:hidden;">
            <div style="height:100%;width:${p}%;border-radius:3px;background:${color};"></div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:2px;">
            <span style="font-size:10px;color:#bbb;">0</span>
            <span style="font-size:10px;color:#bbb;">${p}% / ${parseFloat(targetH.toFixed(2))}s</span>
          </div>
        `;
        stats.appendChild(wrap);
      }

      function addLeaveInputs(weekKey) {
        const stats = document.querySelector('#pdks-stats');
        const data = getLeaveData(weekKey);
        const section = document.createElement('div');
        section.className = 'script-input';
        Object.assign(section.style, {
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          padding: '9px 16px',
          borderTop: '1px solid #f3f3f3',
        });
        const iStyle = 'text-align:center;border:1px solid #e0e0e0;border-radius:5px;padding:2px 5px;font-size:12px;font-family:inherit;outline:none;';
        section.innerHTML = `
          <div style="display:flex;align-items:center;gap:5px;">
            <span style="font-size:12px;color:#999;">🏖️ İzin</span>
            <input id="pdks-leave" type="number" min="0" max="5" value="${data.leave}" style="width:34px;${iStyle}">
            <span style="font-size:11px;color:#bbb;">gün</span>
          </div>
          <div style="display:flex;align-items:center;gap:5px;position:relative;">
            <span id="pdks-ooo-label" style="font-size:12px;color:#999;cursor:help;border-bottom:1px dashed #ccc;">🏠 OOO</span>
            <div id="pdks-ooo-tip" style="display:none;position:absolute;bottom:calc(100% + 6px);left:0;background:#222;color:#fff;padding:7px 10px;border-radius:8px;font-size:11px;line-height:1.5;white-space:nowrap;z-index:99999;pointer-events:none;">
              <strong>Out of Office</strong> — ofis dışında geçirilen süre.<br>
              PDKS'e yansımaz, 45s hedefe <strong>eklenir</strong>.<br>
              Format: <code style="background:#444;padding:1px 4px;border-radius:3px;">SS:DD</code> (ör. 1:30)
            </div>
            <input id="pdks-ooo" type="text" placeholder="0:00" value="${formatOOO(data.ooo)}" style="width:42px;${iStyle}">
          </div>
        `;
        stats.appendChild(section);

        const oooLabel = section.querySelector('#pdks-ooo-label');
        const tip = section.querySelector('#pdks-ooo-tip');
        oooLabel.addEventListener('mouseenter', () => tip.style.display = 'block');
        oooLabel.addEventListener('mouseleave', () => tip.style.display = 'none');

        const getInputValues = () => ({
          leave: Math.max(0, parseInt(document.querySelector('#pdks-leave')?.value) || 0),
          ooo: parseOOO(document.querySelector('#pdks-ooo')?.value),
        });

        section.querySelector('#pdks-leave')?.addEventListener('change', () => {
          // User manually changed leave → disable auto-detection
          saveLeaveData(weekKey, { ...getInputValues(), autoDetected: false });
          document.querySelectorAll('#pdks-stats .script-input').forEach(el => el.remove());
          app();
        });

        section.querySelector('#pdks-ooo')?.addEventListener('change', () => {
          // OOO change preserves auto-detection state
          saveLeaveData(weekKey, { ...getInputValues(), autoDetected: getLeaveData(weekKey).autoDetected });
          document.querySelectorAll('#pdks-stats .script-input').forEach(el => el.remove());
          app();
        });
      }

      function addWeekNav() {
        const box = document.querySelector('#script-notice-box');
        const nav = document.createElement('div');
        nav.id = 'pdks-week-nav';
        Object.assign(nav.style, {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#111',
          padding: '10px 14px',
        });

        const btnStyle = 'cursor:pointer;background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.18);border-radius:6px;padding:4px 12px;font-size:12px;font-family:inherit;';

        const label = document.createElement('span');
        label.id = 'pdks-week-label';
        Object.assign(label.style, { color: '#fff', fontWeight: '600', fontSize: '12px' });

        const prevBtn = document.createElement('button');
        prevBtn.id = 'pdks-prev-btn';
        prevBtn.textContent = '◀ Önceki';
        prevBtn.setAttribute('style', btnStyle);
        prevBtn.onclick = () => { weekOffset--; app(); };

        const nextBtn = document.createElement('button');
        nextBtn.id = 'pdks-next-btn';
        nextBtn.textContent = 'Sonraki ▶';
        nextBtn.setAttribute('style', btnStyle);
        nextBtn.onclick = () => { if (weekOffset < 0) { weekOffset++; app(); } };

        nav.appendChild(prevBtn);
        nav.appendChild(label);
        nav.appendChild(nextBtn);
        box.insertBefore(nav, box.querySelector('#pdks-stats'));
      }

      function updateWeekNav() {
        const monday = getMondayOfWeek(weekOffset);
        const sunday = getSundayOfWeek(weekOffset);
        const fmt = (d) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
        const text = weekOffset === 0
          ? `Bu Hafta  ${fmt(monday)}-${fmt(sunday)}`
          : weekOffset === -1
            ? `Geçen Hafta  ${fmt(monday)}-${fmt(sunday)}`
            : `${Math.abs(weekOffset)} Hafta Önce  ${fmt(monday)}-${fmt(sunday)}`;
        const label = document.querySelector('#pdks-week-label');
        if (label) label.textContent = text;
        const nextBtn = document.querySelector('#pdks-next-btn');
        if (nextBtn) nextBtn.style.visibility = weekOffset >= 0 ? 'hidden' : 'visible';
      }

      function app() {
        const today = dayjs();
        document.querySelectorAll('#pdks-stats .script-input').forEach(el => el.remove());

        const isCurrentWeek = weekOffset === 0;
        const weekStart = dayjs(getMondayOfWeek(weekOffset));
        const weekEnd = dayjs(getSundayOfWeek(weekOffset));
        const weekKey = getWeekKey(weekOffset);
        const leaveData = getLeaveData(weekKey);
        const [tableOne, tableTwo] = document.querySelectorAll('div.flexgrid');
        const monthlyList = tableTwo.querySelectorAll('tbody > tr');

        // ── Auto-detect leave days: past weekdays with zero recorded hours ──
        if (leaveData.autoDetected !== false) {
          const datesWithHours = new Set();
          monthlyList.forEach(row => {
            try {
              const [rowDate] = timeNormalize(row.querySelector('td:nth-child(3)').innerText);
              const rowDay = dayjs(rowDate);
              if (rowDay.isBefore(weekStart, 'day') || rowDay.isAfter(weekEnd, 'day')) return;
              const [wh, wm] = row.querySelector('td:nth-child(6)').innerText.split(':');
              if ((parseInt(wh) || 0) > 0 || (parseInt(wm) || 0) > 0) datesWithHours.add(rowDate);
            } catch {}
          });
          let autoLeave = 0;
          for (let c = weekStart; !c.isAfter(weekEnd, 'day'); c = c.add(1, 'day')) {
            if (c.day() >= 1 && c.day() <= 5 && c.isBefore(today, 'day'))
              if (!datesWithHours.has(c.format('YYYY-MM-DD'))) autoLeave++;
          }
          if (autoLeave !== leaveData.leave) {
            leaveData.leave = autoLeave;
            saveLeaveData(weekKey, leaveData);
          }
        }

        const weekTargetH = 45 - leaveData.leave * 9 + leaveData.ooo / 60;

        let th = 0, tm = 0;
        let rh = weekTargetH, rm = 0;
        let firstRecord = null;

        // --- TODAY ---
        if (isCurrentWeek) {
          tableOne.querySelectorAll('tbody > tr').forEach(row => {
            const rowTime = row.querySelector('td:nth-child(6)')?.innerText;
            if (!rowTime) return;
            const [currentDate, currentTime] = timeNormalize(rowTime);
            const time = dayjs(`${currentDate} ${currentTime}`);
            if (today.isSame(time, 'day') && !firstRecord)
              firstRecord = time.add((time.get('second') > 1 ? 60 - time.get('second') : 1), 'second');
          });

          if (firstRecord && today.isSame(dayjs(firstRecord), 'day')) {
            const diff = today.diff(firstRecord, 'hour', true);
            [th, tm] = calculateTime(diff);
            [rh, rm] = calculateRemaining(diff, false, 9);
            addRow('Bugün', th > 0 ? `${th} sa ${tm} dk` : `${tm} dk`);
            addRow('Bugün Kalan', rh > 0 ? `${rh} sa ${rm} dk` : `${rm} dk`, { cls: 'today-remaining', color: '#f59e0b' });
          }
        }

        // --- WEEK ---
        let weekTotalMin = 0;

        if (monthlyList.length > 0) {
          let inWeek = false;
          monthlyList.forEach(row => {
            const [rowDate] = timeNormalize(row.querySelector('td:nth-child(3)').innerText);
            const rowDay = dayjs(rowDate);
            if (!inWeek && (weekStart.isSame(rowDay, 'day') || weekStart.isBefore(rowDay, 'day'))) inWeek = true;
            if (inWeek && rowDay.isAfter(weekEnd, 'day')) inWeek = false;
            if (!inWeek || (isCurrentWeek && today.isSame(rowDay, 'day'))) return;
            let [wh, wm] = row.querySelector('td:nth-child(6)').innerText.split(':');
            [wh, wm] = capDailyHours(parseInt(wh), parseInt(wm));
            weekTotalMin += wh * 60 + wm;
          });

          const [wh, wm] = calculateTime(weekTotalMin / 60);

          if (isCurrentWeek) {
            addDivider();
            addRow('Bu Hafta', `${wh} sa ${wm} dk`);
            const weekTotalWithTodayMin = weekTotalMin + th * 60 + tm;
            const wTotalH = weekTotalWithTodayMin / 60;
            const [wth, wtm] = calculateTime(wTotalH);
            addRow('Bugün + Bu Hafta', `${wth} sa ${wtm} dk`);
            addProgressBar(wTotalH / weekTargetH * 100, weekTargetH);

            const [rwth, rwtm] = calculateRemaining(wTotalH, true, weekTargetH);
            addRow('Bu Hafta Kalan', rwth === 0 && rwtm === 0 ? '✅ Tamam' : `${rwth} sa ${rwtm} dk`,
              { cls: 'week-remaining', color: rwth === 0 && rwtm === 0 ? '#10b981' : '#f59e0b' });

            const [r36h, r36m] = calculateRemaining(wTotalH, true, 36);
            const [r27h, r27m] = calculateRemaining(wTotalH, true, 27);
            const [r18h, r18m] = calculateRemaining(wTotalH, true, 18);
            if (r36h || r36m) addRow('36 saat için', `${r36h} sa ${r36m} dk`, { small: true });
            if (r27h || r27m) addRow('27 saat için', `${r27h} sa ${r27m} dk`, { small: true });
            if (r18h || r18m) addRow('18 saat için', `${r18h} sa ${r18m} dk`, { small: true });

            if (today.day() === 5 && rwth < 9) {
              document.querySelector('div.today-remaining')?.remove();
              rh = rwth; rm = rwtm;
            }
          } else {
            addRow('Hafta Toplamı', `${wh} sa ${wm} dk`);
            const totalH = weekTotalMin / 60;
            addProgressBar(totalH / weekTargetH * 100, weekTargetH);
            const [rwth, rwtm] = calculateRemaining(totalH, true, weekTargetH);
            const done = rwth === 0 && rwtm === 0;
            addRow(`Hedef (${weekTargetH} saat)`,
              done ? '✅ Tamamlandı' : `❌ Eksik: ${rwth} sa ${rwtm} dk`,
              { color: done ? '#10b981' : '#ef4444' });
          }
        }

        // --- ÇIKIŞ SAATİ ---
        if (isCurrentWeek && firstRecord) {
          addDivider();
          if (rh !== 0 || rm !== 0) {
            const lt = today.add(rh, 'h').add(rm, 'm');
            addRow('Bugün Çıkış', `~ ${String(lt.hour()).padStart(2,'0')}:${String(lt.minute()).padStart(2,'0')}`);
          } else {
            addRow('Bugün Çıkış', 'Çıkış Yapabilirsiniz! ✅', { color: '#10b981' });
          }
        }

        addLeaveInputs(weekKey);
        updateWeekNav();
      }

      addNoticeBox();
      addWeekNav();
      app();
    });
  }

  if (document.querySelector('#grid_kesin_giris_cikis')) {
    runApp();
  } else {
    openPdksPanel(runApp);
  }
})();
