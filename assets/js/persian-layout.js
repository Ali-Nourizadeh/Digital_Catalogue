/* Bounded Persian paragraph composition. Preserve source text/inline markup,
   joining and font scale. Measure the actual rendered font, optimize line
   breaks, and only fill a line when its word spaces remain in the permitted
   font-relative interval. Never insert tatweel or stretch letters/glyphs. */
(() => {
  if (document.documentElement.lang !== 'fa') return;
  const selector = '.prose p, .people__lede p, .list li, .benefit p, .slabs__uses-intro, .about__text p';
  const states = new WeakMap();
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context || !window.ResizeObserver) return;
  const pending = new Set();
  let scheduled = false;

  function textNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = []; let offset = 0, node;
    while ((node = walker.nextNode())) {
      nodes.push({ node, from: offset, to: offset + node.length });
      offset += node.length;
    }
    return nodes;
  }
  function slice(nodes, start, end) {
    const a = nodes.find(x => x.to > start);
    const b = [...nodes].reverse().find(x => x.from < end);
    const range = document.createRange();
    range.setStart(a.node, start - a.from);
    range.setEnd(b.node, end - b.from);
    return range;
  }
  function compose(p) {
    const state = states.get(p), style = getComputedStyle(p);
    const width = p.getBoundingClientRect().width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const signature = [width.toFixed(1), style.fontSize, style.fontFamily, style.fontWeight].join('/');
    if (width < 100 || signature === state.signature) return;
    state.signature = signature;
    p.replaceChildren(state.original.cloneNode(true));
    p.classList.remove('fa-composed', 'fa-native-justify');
    p.classList.add('fa-measuring');
    const nodes = textNodes(p), raw = p.textContent;
    const words = [...raw.matchAll(/\S+/gu)].map(m => ({ text: m[0], from: m.index, to: m.index + m[0].length }));
    if (words.length < 5 || words.length > 700) { p.classList.remove('fa-measuring'); return; }
    const widths = words.map(w => slice(nodes, w.from, w.to).getBoundingClientRect().width);
    if (widths.some(w => w > width + 0.5)) { p.classList.remove('fa-measuring'); return; }
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const normal = context.measureText(' ').width;
    if (!(normal > 0)) { p.classList.remove('fa-measuring'); return; }
    const lower = normal * (parseFloat(style.getPropertyValue('--fa-space-min')) || 0.55);
    const target = normal * (parseFloat(style.getPropertyValue('--fa-space-target')) || 1);
    const upper = normal * (parseFloat(style.getPropertyValue('--fa-space-max')) || 2);
    const n = words.length, cost = Array(n + 1).fill(Infinity), next = Array(n);
    cost[n] = 0;
    for (let i = n - 1; i >= 0; i--) {
      let letters = 0;
      for (let j = i; j < n && j < i + 45; j++) {
        letters += widths[j]; const gaps = j - i;
        if (letters + gaps * lower > width + 0.1) break;
        const last = j === n - 1;
        const needed = gaps ? (width - letters) / gaps : target;
        const filled = !last && gaps > 0 && needed >= lower && needed <= upper;
        const space = filled ? needed : Math.min(target, gaps ? (width - letters) / gaps : target);
        const unused = Math.max(0, width - letters - gaps * space);
        if (!last && !filled) continue;
        const penalty = last
          ? 25 * Math.max(0, 0.55 - (width - unused) / width) ** 2 + ((gaps < 2) ? 4 : 0)
          : filled ? 0.15 * ((space - target) / normal) ** 2
          : 100 + 100 * (unused / width) ** 2;
        const value = penalty + cost[j + 1] + 0.015;
        if (value < cost[i]) { cost[i] = value; next[i] = { end: j + 1, space, filled, unused }; }
      }
    }
    if (!next[0]) {
      // Never emit a short forced interior line. Let the browser justify
      // the complete original paragraph when no all-filled bounded plan exists.
      p.classList.remove('fa-measuring');
      p.classList.add('fa-native-justify');
      return;
    }
    const plan = [];
    for (let at = 0; at < n; at = next[at].end) plan.push(next[at]);
    if (plan.length > 1 && (width - plan[plan.length - 1].unused) / width < 0.5) {
      p.classList.remove('fa-measuring');
      p.classList.add('fa-native-justify');
      return;
    }
    const fragment = document.createDocumentFragment();
    fragment.append(document.createTextNode(raw.slice(0, words[0].from)));
    for (let i = 0; i < n;) {
      const line = next[i], span = document.createElement('span');
      span.className = 'fa-line';
      span.style.wordSpacing = `${(line.space - normal).toFixed(4)}px`;
      span.dataset.spacingRatio = (line.space / normal).toFixed(4);
      span.dataset.filled = String(line.filled);
      span.append(slice(nodes, words[i].from, words[line.end - 1].to).cloneContents());
      fragment.append(span);
      if (line.end < n) fragment.append(document.createTextNode(raw.slice(words[line.end - 1].to, words[line.end].from)));
      i = line.end;
    }
    fragment.append(document.createTextNode(raw.slice(words[n - 1].to)));
    // Roll back rather than change any author character, including whitespace.
    if (fragment.textContent !== raw) { p.classList.remove('fa-measuring'); return; }
    p.replaceChildren(fragment);
    p.classList.remove('fa-measuring');
    p.classList.add('fa-composed');
    if ([...p.querySelectorAll(':scope > .fa-line')].some(line => line.scrollWidth > line.clientWidth + 1)) {
      p.replaceChildren(state.original.cloneNode(true));
      p.classList.remove('fa-composed');
      p.classList.add('fa-native-justify');
    }
  }
  function enqueue(p) {
    pending.add(p);
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      for (const item of pending) compose(item);
      pending.clear();
    });
  }
  async function init() {
    if (document.fonts) await document.fonts.ready;
    const resize = new ResizeObserver(entries => entries.forEach(e => enqueue(e.target)));
    const near = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        enqueue(entry.target); resize.observe(entry.target); near.unobserve(entry.target);
      }
    }, { rootMargin: '1200px' });
    for (const p of document.querySelectorAll(selector)) {
      const original = document.createDocumentFragment();
      for (const child of p.childNodes) original.append(child.cloneNode(true));
      states.set(p, { original, signature: '' });
      near.observe(p);
    }
    if (document.fonts) document.fonts.addEventListener('loadingdone', () => {
      for (const p of document.querySelectorAll(selector)) {
        const state = states.get(p); if (state) { state.signature = ''; enqueue(p); }
      }
    });
  }
  init();
})();
