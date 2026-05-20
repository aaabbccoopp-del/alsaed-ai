'use strict';
/* ═══════════════════════════════════════════════════
   السعيد AI — markdown.js
   عرض Markdown بالكامل بدون مكتبات خارجية
   ═══════════════════════════════════════════════════ */

window.MD = (() => {

  /* ── تلوين الكود ── */
  const KEYWORDS = {
    js : /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|this|class|extends|import|export|default|async|await|try|catch|finally|typeof|instanceof|null|undefined|true|false|void|delete|in|of|throw)\b/g,
    py : /\b(def|class|return|if|elif|else|for|while|in|not|and|or|import|from|as|with|try|except|finally|raise|pass|break|continue|lambda|None|True|False|global|nonlocal|yield|async|await|print|len|range|type|isinstance)\b/g,
    html:/(&lt;\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s[^&]*?)?\/? ?&gt;)/g,
    css : /([a-z-]+)\s*:/g,
  };

  function highlight(code, lang) {
    let h = Store.escHtml(code);
    const l = (lang || '').toLowerCase();
    if (l === 'js' || l === 'javascript' || l === 'ts' || l === 'typescript') {
      h = h
        .replace(/(\/\/[^\n]*)/g, '<span class="cm">$1</span>')
        .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="cm">$1</span>')
        .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, '<span class="cs">$1</span>')
        .replace(KEYWORDS.js, '<span class="ck">$1</span>')
        .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="cn">$1</span>');
    } else if (l === 'py' || l === 'python') {
      h = h
        .replace(/(#[^\n]*)/g, '<span class="cm">$1</span>')
        .replace(/("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '<span class="cs">$1</span>')
        .replace(KEYWORDS.py, '<span class="ck">$1</span>')
        .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="cn">$1</span>');
    } else if (l === 'html' || l === 'xml') {
      h = h
        .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="cm">$1</span>')
        .replace(/(&lt;\/?[a-zA-Z][a-zA-Z0-9-]*)/g, '<span class="ck">$1</span>')
        .replace(/(=)("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '=<span class="cs">$2</span>');
    } else if (l === 'css' || l === 'scss') {
      h = h
        .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="cm">$1</span>')
        .replace(/([a-z-]+)\s*:/g, '<span class="ck">$1</span>:')
        .replace(/(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/g, '<span class="cn">$1</span>');
    } else if (l === 'json') {
      h = h
        .replace(/("(?:[^"\\]|\\.)*")\s*:/g, '<span class="ck">$1</span>:')
        .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="cs">$1</span>')
        .replace(/\b(true|false|null)\b/g, '<span class="ck">$1</span>')
        .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="cn">$1</span>');
    }
    return h;
  }

  /* ── جداول Markdown ── */
  function parseTable(block) {
    const rows = block.trim().split('\n');
    if (rows.length < 2) return null;
    const sep = rows[1];
    if (!/^\|?[\s\-:|]+\|/.test(sep)) return null;
    const aligns = sep.split('|').filter(c => c.trim()).map(c => {
      c = c.trim();
      if (c.startsWith(':') && c.endsWith(':')) return 'center';
      if (c.endsWith(':'))   return 'end';
      if (c.startsWith(':')) return 'start';
      return '';
    });
    const head = rows[0].split('|').filter(c => c.trim());
    const body = rows.slice(2).map(r => r.split('|').filter(c => c.trim()));
    let html = '<div class="md-table-wrap"><table class="md-table"><thead><tr>';
    head.forEach((h, i) => {
      const a = aligns[i] ? ` style="text-align:${aligns[i]}"` : '';
      html += `<th${a}>${inlineMd(h.trim())}</th>`;
    });
    html += '</tr></thead><tbody>';
    body.forEach(row => {
      html += '<tr>';
      row.forEach((c, i) => {
        const a = aligns[i] ? ` style="text-align:${aligns[i]}"` : '';
        html += `<td${a}>${inlineMd(c.trim())}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  /* ── إنلاين ماركداون ── */
  function inlineMd(text) {
    return text
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="md-img">')
      .replace(/==(.+?)==/g, '<mark>$1</mark>');
  }

  /* ── الدالة الرئيسية ── */
  function render(raw) {
    if (!raw) return '';
    const lines = raw.split('\n');
    let html  = '';
    let i     = 0;
    let inUL  = false;
    let inOL  = false;
    let olIdx = 0;
    let inBQ  = false;
    let bqBuf = '';

    function flushList() {
      if (inUL) { html += '</ul>'; inUL = false; }
      if (inOL) { html += '</ol>'; inOL = false; olIdx = 0; }
    }
    function flushBQ() {
      if (inBQ) {
        html += `<blockquote>${render(bqBuf)}</blockquote>`;
        inBQ = false; bqBuf = '';
      }
    }

    while (i < lines.length) {
      const line = lines[i];

      /* كتل الكود */
      if (line.startsWith('```')) {
        flushList(); flushBQ();
        const lang = line.slice(3).trim();
        const codeLines = [];
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i]); i++;
        }
        const code = codeLines.join('\n');
        const hiCode = highlight(code, lang);
        html += `<div class="code-block"><div class="code-header"><span class="code-lang">${Store.escHtml(lang || 'code')}</span><button class="copy-code-btn" data-raw="${encodeURIComponent(code)}">📋 نسخ</button></div><pre><code>${hiCode}</code></pre></div>`;
        i++; continue;
      }

      /* اقتباسات */
      if (line.startsWith('> ')) {
        flushList();
        inBQ = true;
        bqBuf += line.slice(2) + '\n';
        i++; continue;
      } else if (inBQ) { flushBQ(); }

      /* فاصل أفقي */
      if (/^---+$|^\*\*\*+$|^___+$/.test(line.trim())) {
        flushList();
        html += '<hr class="md-hr">';
        i++; continue;
      }

      /* عناوين */
      const h6 = line.match(/^(#{1,6})\s+(.+)/);
      if (h6) {
        flushList();
        const level = h6[1].length;
        html += `<h${level} class="md-h${level}">${inlineMd(h6[2])}</h${level}>`;
        i++; continue;
      }

      /* جدول */
      if (line.includes('|') && i + 1 < lines.length && lines[i+1].includes('|')) {
        let tableBlock = line;
        let j = i + 1;
        while (j < lines.length && lines[j].includes('|')) { tableBlock += '\n' + lines[j]; j++; }
        const tableHtml = parseTable(tableBlock);
        if (tableHtml) { flushList(); html += tableHtml; i = j; continue; }
      }

      /* قوائم غير مرتبة */
      const ul = line.match(/^(\s*)[-*+]\s+(.+)/);
      if (ul) {
        if (inOL) { html += '</ol>'; inOL = false; }
        if (!inUL) { html += '<ul class="md-list">'; inUL = true; }
        html += `<li>${inlineMd(ul[2])}</li>`;
        i++; continue;
      }

      /* قوائم مرتبة */
      const ol = line.match(/^(\s*)\d+[.)]\s+(.+)/);
      if (ol) {
        if (inUL) { html += '</ul>'; inUL = false; }
        if (!inOL) { html += '<ol class="md-list">'; inOL = true; olIdx = 0; }
        html += `<li>${inlineMd(ol[2])}</li>`;
        i++; continue;
      }

      /* سطر فارغ */
      if (line.trim() === '') {
        flushList(); flushBQ();
        i++; continue;
      }

      /* فقرة عادية */
      flushList(); flushBQ();
      html += `<p>${inlineMd(line)}</p>`;
      i++;
    }
    flushList(); flushBQ();
    return html;
  }

  return { render, highlight, escHtml: Store.escHtml };
})();
