// Renders CHANGELOG.md (or CHANGELOG.tr.md) from main so the site never drifts from the repository.
// The container's data-lang ("en" or "tr") picks the page chrome language.
(function () {
  var REPO = 'https://github.com/mrokumus/argeportal-hour-calculator';
  var RAW = 'https://raw.githubusercontent.com/mrokumus/argeportal-hour-calculator/main/';
  var STRINGS = {
    en: {
      locale: 'en-GB',
      sources: ['CHANGELOG.md'],
      latest: 'Latest',
      sections: {},
      failed: 'The changelog could not be loaded. See <a href="' + REPO + '/blob/main/CHANGELOG.md">CHANGELOG.md on GitHub</a> or the <a href="' + REPO + '/releases">Releases page</a>.',
    },
    tr: {
      locale: 'tr-TR',
      // The Turkish file is optional; fall back to English if it is missing.
      sources: ['CHANGELOG.tr.md', 'CHANGELOG.md'],
      latest: 'En yeni',
      sections: { Added: 'Eklenenler', Fixed: 'Düzeltmeler', Changed: 'Değişiklikler', Removed: 'Kaldırılanlar' },
      failed: 'Sürüm notları yüklenemedi. <a href="' + REPO + '/blob/main/CHANGELOG.md">GitHub\'daki CHANGELOG.md</a> dosyasına veya <a href="' + REPO + '/releases">Releases sayfasına</a> bakabilirsiniz.',
    },
  };

  var root = document.getElementById('releases');
  if (!root) return;
  var text = STRINGS[root.getAttribute('data-lang')] || STRINGS.en;

  function escape(value) {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function inline(value) {
    return escape(value)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
  }

  function render(markdown) {
    var lines = markdown.split(/\r?\n/);
    var links = {};
    lines.forEach(function (line) {
      var ref = line.match(/^\[([^\]]+)\]:\s*(https:\/\/\S+)/);
      if (ref) links[ref[1]] = ref[2];
    });

    var html = '';
    var inRelease = false;
    var inList = false;
    var first = true;
    function closeList() { if (inList) { html += '</ul>'; inList = false; } }
    function closeRelease() { closeList(); if (inRelease) { html += '</section>'; inRelease = false; } }

    lines.forEach(function (line) {
      if (/^\[[^\]]+\]:/.test(line) || /^# /.test(line)) return;
      var release = line.match(/^## \[([^\]]+)\](?:\s*-\s*(\d{4}-\d{2}-\d{2}))?/);
      if (release) {
        closeRelease();
        var version = escape(release[1]);
        var date = release[2];
        var tag = links[release[1]] ? REPO + '/releases/tag/v' + encodeURIComponent(release[1]) : null;
        html += '<section class="release" id="v' + version + '"><header><h2>'
          + (tag ? '<a href="' + tag + '">v' + version + '</a>' : 'v' + version) + '</h2>'
          + (date ? '<time datetime="' + date + '">' + new Date(date + 'T00:00:00').toLocaleDateString(text.locale, { day: 'numeric', month: 'long', year: 'numeric' }) + '</time>' : '')
          + (first ? '<span class="latest">' + text.latest + '</span>' : '')
          + '</header>';
        inRelease = true;
        first = false;
        return;
      }
      var heading = line.match(/^### (.+)/);
      if (heading) { closeList(); html += '<h3>' + inline(text.sections[heading[1]] || heading[1]) + '</h3>'; return; }
      var item = line.match(/^- (.+)/);
      if (item && inRelease) {
        if (!inList) { html += '<ul>'; inList = true; }
        html += '<li>' + inline(item[1]) + '</li>';
        return;
      }
      if (!line.trim()) { closeList(); return; }
      // Intro text belongs to the page header; trailing notes close the release list.
      if (!inRelease && first) return;
      closeRelease();
      html += '<p>' + inline(line) + '</p>';
    });
    closeRelease();
    return html;
  }

  function load(sources) {
    return fetch(RAW + sources[0], { cache: 'no-cache' })
      .then(function (response) {
        if (!response.ok) throw new Error(response.status);
        return response.text();
      })
      .catch(function (error) {
        if (sources.length > 1) return load(sources.slice(1));
        throw error;
      });
  }

  load(text.sources)
    .then(function (markdown) {
      root.innerHTML = render(markdown);
      if (location.hash) {
        var target = document.getElementById(location.hash.slice(1));
        if (target) target.scrollIntoView();
      }
    })
    .catch(function () {
      root.innerHTML = '<p class="status">' + text.failed + '</p>';
    });
})();
