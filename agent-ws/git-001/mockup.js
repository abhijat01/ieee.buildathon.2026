/* Mockup for issue #1. Sample data only. No server calls. */

class Icons {
  static shapes = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8M16 13H8M16 17H8"/>',
    briefcase: '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect x="2" y="6" width="20" height="14" rx="2"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    plus: '<path d="M5 12h14M12 5v14"/>',
    sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4M22 5h-4"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
    right: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    left: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
    pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
    calendar: '<path d="M8 2v4M16 2v4M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/>',
    undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
  };

  static svg(name, size = 16) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${Icons.shapes[name]}</svg>`;
  }

  static hydrate(root) {
    root.querySelectorAll('i[data-icon]').forEach(mark => {
      mark.outerHTML = Icons.svg(mark.dataset.icon, Number(mark.dataset.size || 16));
    });
  }
}

class Text {
  static escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, mark => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[mark]));
  }

  static month(value) {
    if (!value) return '';
    const [year, month] = value.split('-');
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return month ? `${names[Number(month) - 1] ?? month} ${year}` : year;
  }

  static period(item) {
    if (!item.startDate && !item.endDate) return 'No dates';
    return `${Text.month(item.startDate) || '?'} – ${Text.month(item.endDate) || 'Present'}`;
  }
}

/** A small, safe Markdown renderer: headings, lists, bold, italic, code, and links. */
class Markdown {
  static render(source) {
    const blocks = [];
    let list = null;
    let paragraph = [];
    const closeParagraph = () => { if (paragraph.length) { blocks.push(`<p>${paragraph.join('<br/>')}</p>`); paragraph = []; } };
    const closeList = () => { if (list) { blocks.push(`<${list.tag}>${list.items.join('')}</${list.tag}>`); list = null; } };
    for (const line of String(source).split('\n')) {
      const heading = line.match(/^(#{1,3})\s+(.*)$/);
      const bullet = line.match(/^\s*[-*]\s+(.*)$/);
      const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
      if (heading) { closeParagraph(); closeList(); blocks.push(`<h${heading[1].length}>${Markdown.inline(heading[2])}</h${heading[1].length}>`); }
      else if (bullet || numbered) {
        closeParagraph();
        const tag = bullet ? 'ul' : 'ol';
        if (list && list.tag !== tag) closeList();
        list = list || { tag, items: [] };
        list.items.push(`<li>${Markdown.inline((bullet || numbered)[1])}</li>`);
      }
      else if (!line.trim()) { closeParagraph(); closeList(); }
      else { closeList(); paragraph.push(Markdown.inline(line)); }
    }
    closeParagraph(); closeList();
    return blocks.join('');
  }

  static inline(text) {
    return Text.escape(text)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[\s(])_([^_]+)_/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }
}

/** Sample data and simulated AI results. The real app gets these from the server. */
class SampleData {
  static experience = `## Atlas analytics dashboard

At **Acme Corp** I led the build of Atlas, an internal analytics dashboard, from March 2022 to June 2023.

- Built the data pipeline with Python and PostgreSQL
- Made the UI with React and TypeScript
- Worked with 4 engineers and 1 designer

The dashboard made reports faster for the sales team.`;

  static improved = `## Atlas analytics dashboard

Led a team of 5 at **Acme Corp** to build Atlas, an internal analytics dashboard (March 2022 – June 2023).

- Designed and built the data pipeline with Python and PostgreSQL
- Delivered the UI with React and TypeScript
- Led 4 engineers and 1 designer from the first design to the release

**Result:** The sales team gets reports faster. _Add a number here, for example the time saved for each report._`;

  static items() {
    return [
      { id: 'a1', title: 'Atlas reporting dashboard', type: 'PROJECT', company: 'Acme Corp', startDate: '2022-03', endDate: '2023-06',
        skills: ['Python', 'React', 'PostgreSQL'], saved: 'Sep 12',
        text: '## Atlas reporting dashboard\n\nI built the first version of the Atlas dashboard at **Acme Corp**.\n\n- Python data pipeline\n- React UI for the sales team' },
      { id: 'a2', title: 'Sales data pipeline', type: 'PROJECT', company: 'Acme Corp', startDate: '2021-06', endDate: '2022-02',
        skills: ['Python', 'Airflow'], saved: 'Aug 30',
        text: '## Sales data pipeline\n\nA nightly pipeline that moves sales data into the warehouse.\n\n- Python and Airflow\n- 40 source tables' },
      { id: 'a3', title: 'Senior Software Engineer', type: 'WORK', company: 'Northwind Labs', startDate: '2019-01', endDate: '2021-05',
        skills: ['Java', 'Kubernetes', 'Mentoring'], saved: 'Aug 30',
        text: 'I worked in the platform team at **Northwind Labs**.\n\n- Moved 12 services to Kubernetes\n- Mentored 3 junior engineers' },
    ];
  }

  /** Simulates the extraction. The original text stays unchanged. */
  static extract(text) {
    if (text.includes('Atlas')) {
      return { title: 'Atlas analytics dashboard', type: 'PROJECT', company: 'Acme Corp', startDate: '2022-03', endDate: '2023-06',
        skills: ['Python', 'PostgreSQL', 'React', 'TypeScript', 'Team lead'] };
    }
    const first = text.split('\n').find(line => line.trim()) || '';
    return { title: first.replace(/^#+\s*/, '').replace(/[*_`]/g, '').slice(0, 80), type: 'WORK', company: '', startDate: '', endDate: '', skills: [] };
  }

  static duplicates(fields, items) {
    const words = value => new Set(String(value).toLowerCase().split(/\W+/).filter(word => word.length > 2));
    const title = words(fields.title);
    return items.map(item => {
      const shared = [...words(item.title)].filter(word => title.has(word)).length;
      const sameCompany = fields.company && item.company.toLowerCase() === fields.company.toLowerCase();
      const level = shared >= 2 && sameCompany ? 'high' : (shared >= 1 || sameCompany) ? 'some' : null;
      return { item, level, reason: [shared ? 'Similar title' : null, sameCompany ? 'Same company' : null].filter(Boolean).join(' · ') };
    }).filter(match => match.level).sort((a, b) => (a.level === 'high' ? 0 : 1) - (b.level === 'high' ? 0 : 1)).slice(0, 3);
  }

  static improve(text, instruction) {
    if (text.includes('Atlas')) return SampleData.improved;
    const note = instruction ? `_Changed for your instruction: ${instruction}_` : '_Changed for clear and active language._';
    return `${text.trim()}\n\n${note}`;
  }
}

class PortfolioMockup {
  constructor(root) {
    this.root = root;
    this.items = SampleData.items();
    this.emptyList = false;
    this.failAi = false;
    this.view = 'list';
    this.savedId = null;
    this.openItemId = null;
    this.draft = null;
    document.addEventListener('click', event => this.onClick(event));
    document.addEventListener('input', event => this.onInput(event));
    document.addEventListener('keydown', event => this.onKey(event));
    this.applyTheme(this.storedTheme());
    Icons.hydrate(document.body);
    this.render();
  }

  // ---------- state changes ----------

  newDraft() {
    return { step: 'write', tab: 'write', original: '', text: '', fields: null, duplicates: [], busy: null, error: null,
      improveOpen: false, instruction: '', proposal: null, improvedInUse: false };
  }

  storedTheme() {
    try { return localStorage.getItem('mockup-theme') || 'light'; } catch { return 'light'; }
  }

  applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('mockup-theme', theme); } catch { /* storage is optional */ }
    document.querySelectorAll('[data-action="theme"]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.themeValue === theme)));
  }

  visibleItems() { return this.emptyList ? this.items.filter(item => item.isNew) : this.items; }

  analyze() {
    const draft = this.draft;
    draft.busy = 'analyze'; draft.error = null; this.render();
    setTimeout(() => {
      draft.busy = null;
      if (this.failAi) { draft.error = 'The AI could not analyze the text. Your text is safe. Try again.'; return this.render(); }
      draft.original = draft.text;
      draft.fields = SampleData.extract(draft.text);
      draft.duplicates = SampleData.duplicates(draft.fields, this.visibleItems());
      draft.step = 'review'; draft.proposal = null; draft.improveOpen = false; draft.improvedInUse = false;
      this.render();
    }, 1300);
  }

  improve() {
    const draft = this.draft;
    draft.busy = 'improve'; draft.error = null; draft.proposal = null; this.render();
    setTimeout(() => {
      draft.busy = null;
      if (this.failAi) draft.error = 'The AI could not improve the text. Your text is unchanged. Try again.';
      else draft.proposal = SampleData.improve(draft.original, draft.instruction.trim());
      this.render();
    }, 1500);
  }

  save() {
    const { fields, text, original } = this.draft;
    const item = { id: `n${Date.now()}`, ...fields, skills: [...fields.skills], text, original, saved: 'Today', isNew: true };
    this.items.unshift(item);
    this.savedId = item.id; this.draft = null; this.view = 'list';
    this.render();
  }

  // ---------- events ----------

  onClick(event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    if (target.tagName === 'A') event.preventDefault();
    const draft = this.draft;
    const actions = {
      'theme': () => this.applyTheme(target.dataset.themeValue),
      'toggle-empty': () => { this.emptyList = !this.emptyList; target.setAttribute('aria-pressed', String(this.emptyList)); this.view = 'list'; },
      'toggle-error': () => { this.failAi = !this.failAi; target.setAttribute('aria-pressed', String(this.failAi)); },
      'go-list': () => { this.view = 'list'; },
      'add': () => { this.draft = this.newDraft(); this.view = 'add'; this.savedId = null; },
      'cancel': () => { this.draft = null; this.view = 'list'; },
      'dismiss-saved': () => { this.savedId = null; },
      'dismiss-error': () => { draft.error = null; },
      'tab': () => { draft.tab = target.dataset.tab; },
      'sample': () => { draft.text = SampleData.experience; draft.tab = 'write'; },
      'analyze': () => this.analyze(),
      'edit-text': () => { draft.step = 'write'; draft.tab = 'write'; draft.text = draft.original; },
      'type': () => { draft.fields.type = target.dataset.type; },
      'remove-skill': () => { draft.fields.skills.splice(Number(target.dataset.index), 1); },
      'open-item': () => { this.openItemId = target.dataset.id; this.view = 'item'; },
      'back-to-draft': () => { this.view = 'add'; },
      'open-improve': () => { draft.improveOpen = true; },
      'close-improve': () => { draft.improveOpen = false; draft.proposal = null; },
      'suggest': () => { draft.instruction = target.dataset.text; },
      'improve': () => this.improve(),
      'use-improved': () => { draft.text = draft.proposal; draft.improvedInUse = true; draft.proposal = null; draft.improveOpen = false; },
      'keep-original': () => { draft.proposal = null; draft.improveOpen = false; },
      'restore-original': () => { draft.text = draft.original; draft.improvedInUse = false; },
      'save': () => this.save(),
    };
    const action = actions[target.dataset.action];
    if (!action) return;
    action();
    if (!['theme', 'toggle-error', 'analyze', 'improve', 'save'].includes(target.dataset.action)) this.render();
    if (target.dataset.action === 'open-improve') document.getElementById('instruction')?.focus();
  }

  onInput(event) {
    const { field } = event.target.dataset;
    if (!field || !this.draft) return;
    if (field === 'text') {
      this.draft.text = event.target.value;
      document.querySelector('[data-action="analyze"]').disabled = !this.draft.text.trim();
      document.getElementById('count').textContent = `${this.draft.text.length} / 4000`;
    } else if (field === 'instruction') this.draft.instruction = event.target.value;
    else if (field !== 'skill') {
      this.draft.fields[field] = event.target.value;
      event.target.classList.toggle('is-missing', !event.target.value.trim());
    }
  }

  onKey(event) {
    if (event.key !== 'Enter' || !this.draft) return;
    if (event.target.dataset.field === 'skill' && event.target.value.trim()) {
      event.preventDefault();
      this.draft.fields.skills.push(event.target.value.trim());
      this.render();
      document.getElementById('skill-input')?.focus();
    }
    if (event.target.dataset.field === 'instruction') { event.preventDefault(); this.improve(); }
  }

  // ---------- views ----------

  render() {
    const views = { list: () => this.listView(), add: () => this.addView(), item: () => this.itemView() };
    this.root.innerHTML = views[this.view]();
    Icons.hydrate(this.root);
  }

  breadcrumb(...parts) {
    const last = parts.pop();
    const links = parts.map(part => `<a href="#" data-action="go-list">${part}</a><span>/</span>`).join('');
    return `<div class="breadcrumb"><i data-icon="grid" data-size="13"></i> Workspace <span>/</span>${links}<strong>${last}</strong></div>`;
  }

  typeBadge(type) {
    return type === 'PROJECT' ? '<span class="type-badge project">Project</span>' : '<span class="type-badge work">Work experience</span>';
  }

  listView() {
    const items = this.visibleItems();
    const saved = this.savedId ? `<div class="success-banner" role="status"><i data-icon="check" data-size="16"></i>
      <span>The app saved the experience in your portfolio.</span>
      <button type="button" class="icon-button" aria-label="Dismiss message" data-action="dismiss-saved"><i data-icon="x" data-size="15"></i></button></div>` : '';
    const cards = items.map(item => `<button type="button" class="pf-card${item.id === this.savedId ? ' is-new' : ''}" data-action="open-item" data-id="${item.id}">
        <div class="pf-card-top">${this.typeBadge(item.type)}${item.id === this.savedId ? '<span class="pf-new-label">New</span>' : ''}</div>
        <h3>${Text.escape(item.title)}</h3>
        <div class="pf-meta"><span><i data-icon="building" data-size="13"></i>${Text.escape(item.company || 'No company')}</span>
          <span><i data-icon="calendar" data-size="13"></i>${Text.period(item)}</span></div>
        <div class="pf-chips">${item.skills.map(skill => `<span class="chip">${Text.escape(skill)}</span>`).join('')}</div>
      </button>`).join('');
    const empty = `<div class="notes-empty"><span class="empty-icon"><i data-icon="briefcase" data-size="23"></i></span>
        <div><h3>Your portfolio is empty.</h3><p>Add a project or a job. Use it later for a resume or an essay.</p></div>
        <button type="button" class="outline-button" data-action="add"><i data-icon="plus" data-size="15"></i> Your first experience</button></div>`;
    return `${this.breadcrumb('Portfolio')}
      <div class="page-title"><div><h1>Portfolio</h1><p>Your projects and work experience, ready for a resume or an essay.</p></div>
        <button type="button" class="primary-button" data-action="add"><i data-icon="plus" data-size="16"></i> Add experience</button></div>
      ${saved}
      <div class="section-title"><h2>Your experiences <span class="count-badge">${items.length}</span></h2></div>
      ${items.length ? `<div class="pf-grid">${cards}</div>` : empty}`;
  }

  steps(current) {
    const names = ['Write', 'Review', 'Save'];
    const index = { write: 0, review: 1 }[current];
    return `<ol class="steps" aria-label="Progress">${names.map((name, position) => `<li class="${position === index ? 'current' : position < index ? 'done' : ''}"${position === index ? ' aria-current="step"' : ''}>
      <span class="step-number">${position < index ? '<i data-icon="check" data-size="12"></i>' : position + 1}</span><span class="step-text">${name}</span></li>`).join('')}</ol>`;
  }

  errorBanner() {
    return this.draft.error ? `<div class="error-banner" role="alert"><span>${this.draft.error}</span>
      <button type="button" class="icon-button" aria-label="Dismiss error" data-action="dismiss-error"><i data-icon="x" data-size="15"></i></button></div>` : '';
  }

  addView() {
    const body = this.draft.step === 'write' ? this.writeStep() : this.reviewStep();
    return `${this.breadcrumb('Portfolio', 'Add experience')}
      <div class="page-title"><div><h1>Add experience</h1><p>${this.draft.step === 'write'
        ? 'Describe a project or a job. Plain text and Markdown are both fine.'
        : 'Check what the AI found. The app saves nothing until you approve.'}</p></div></div>
      ${this.steps(this.draft.step)}${this.errorBanner()}${body}`;
  }

  writeStep() {
    const draft = this.draft;
    if (draft.busy === 'analyze') return `<section class="panel"><div class="loading" role="status"><span class="spinner"></span>The AI reads your text and searches your portfolio for similar experiences…</div></section>`;
    const editor = draft.tab === 'write'
      ? `<textarea id="experience-text" class="editor" data-field="text" maxlength="4000" aria-label="Your experience" placeholder="Example: At Acme Corp I led the build of Atlas, an analytics dashboard, from March 2022 to June 2023…">${Text.escape(draft.text)}</textarea>`
      : `<div class="preview-box markdown" aria-label="Markdown preview">${draft.text.trim() ? Markdown.render(draft.text) : '<p class="preview-empty">Nothing to preview. Write some text first.</p>'}</div>`;
    return `<section class="panel">
      <div class="panel-heading"><h2>Your experience</h2>
        <div class="tabs" role="tablist" aria-label="Editor mode">
          <button type="button" role="tab" aria-selected="${draft.tab === 'write'}" data-action="tab" data-tab="write"><i data-icon="pencil" data-size="13"></i> Write</button>
          <button type="button" role="tab" aria-selected="${draft.tab === 'preview'}" data-action="tab" data-tab="preview"><i data-icon="eye" data-size="13"></i> Preview</button>
        </div>
        <span class="hint">Markdown is supported: <code>## heading</code>, <code>**bold**</code>, <code>- list</code></span></div>
      ${editor}
      <div class="editor-footer"><button type="button" class="text-button" data-action="sample"><i data-icon="file" data-size="14"></i> Insert sample text</button>
        <span class="hint" id="count">${draft.text.length} / 4000</span></div>
      <div class="actions"><button type="button" class="text-button" data-action="cancel">Cancel</button><span class="spacer"></span>
        <button type="button" class="primary-button" data-action="analyze"${draft.text.trim() ? '' : ' disabled'}><i data-icon="sparkles" data-size="16"></i> Analyze</button></div>
    </section>`;
  }

  duplicateBanner() {
    const { duplicates } = this.draft;
    if (!duplicates.length) return `<div class="clear-note" role="status"><i data-icon="check" data-size="15"></i> The app found no similar experience in your portfolio.</div>`;
    const count = duplicates.length === 1 ? '1 similar experience' : `${duplicates.length} similar experiences`;
    return `<section class="duplicate-banner" role="status" aria-label="Possible duplicates">
      <h2><i data-icon="alert" data-size="16"></i> Possible duplicate: ${count} in your portfolio</h2>
      <p>Open an entry to compare it. You can still save this experience.</p>
      <ul class="duplicate-list">${duplicates.map(({ item, level, reason }) => `<li><button type="button" class="duplicate-link" data-action="open-item" data-id="${item.id}">
        <span><strong>${Text.escape(item.title)}</strong><small>${Text.escape(item.company)} · ${Text.period(item)} · ${reason}</small></span>
        <span class="match ${level}">${level === 'high' ? 'Very similar' : 'Some overlap'}</span><i data-icon="right" data-size="15"></i></button></li>`).join('')}</ul>
    </section>`;
  }

  fieldInput(name, label, placeholder, full = false) {
    const value = this.draft.fields[name];
    return `<div class="field${full ? ' full' : ''}"><label for="field-${name}">${label}${value ? '' : '<span class="missing">Not found. Add it if you know it.</span>'}</label>
      <input id="field-${name}" data-field="${name}" class="${value ? '' : 'is-missing'}" value="${Text.escape(value)}" placeholder="${placeholder}"/></div>`;
  }

  reviewStep() {
    const draft = this.draft;
    const { fields } = draft;
    const textTag = draft.improvedInUse
      ? '<span class="status-tag ai"><i data-icon="sparkles" data-size="11"></i> Improved by AI</span>'
      : '<span class="status-tag"><i data-icon="check" data-size="11"></i> Your original text, unchanged</span>';
    const textActions = draft.improvedInUse
      ? `<button type="button" class="text-button" data-action="restore-original"><i data-icon="undo" data-size="14"></i> Restore my original text</button>`
      : `<button type="button" class="text-button" data-action="edit-text"><i data-icon="pencil" data-size="14"></i> Edit text</button>`;
    return `${this.duplicateBanner()}
      <div class="review-layout">
        <section class="panel" aria-label="Extracted information">
          <div class="panel-heading"><h2>Extracted information</h2><span class="status-tag ai"><i data-icon="sparkles" data-size="11"></i> Found by AI</span></div>
          <p class="hint" style="margin-bottom:16px">The app uses these fields to index the experience. Correct them if necessary.</p>
          <div class="field-grid">
            ${this.fieldInput('title', 'Title', 'Example: Atlas analytics dashboard', true)}
            <div class="field full"><span class="label" id="type-label">Type</span>
              <div class="segmented" role="group" aria-labelledby="type-label">
                <button type="button" aria-pressed="${fields.type === 'PROJECT'}" data-action="type" data-type="PROJECT">Project</button>
                <button type="button" aria-pressed="${fields.type === 'WORK'}" data-action="type" data-type="WORK">Work experience</button></div></div>
            ${this.fieldInput('company', 'Company', 'Example: Acme Corp', true)}
            ${this.fieldInput('startDate', 'Start date', 'YYYY-MM')}
            ${this.fieldInput('endDate', 'End date', 'Empty for current work')}
            <div class="field full"><label for="skill-input">Skills</label>
              <div class="skill-box">${fields.skills.map((skill, index) => `<span class="chip">${Text.escape(skill)}<button type="button" aria-label="Remove ${Text.escape(skill)}" data-action="remove-skill" data-index="${index}"><i data-icon="x" data-size="11"></i></button></span>`).join('')}
                <input id="skill-input" data-field="skill" placeholder="Add a skill, then press Enter"/></div></div>
          </div>
        </section>
        <section class="panel" aria-label="Experience text">
          <div class="panel-heading"><h2>Experience text</h2>${textTag}</div>
          <div class="markdown">${Markdown.render(draft.text)}</div>
          <div class="editor-footer">${textActions}
            ${draft.improveOpen ? '' : `<button type="button" class="outline-button" data-action="open-improve"><i data-icon="sparkles" data-size="15"></i> Improve with AI</button>`}</div>
        </section>
      </div>
      ${draft.improveOpen ? this.improvePanel() : ''}
      <div class="actions"><button type="button" class="text-button" data-action="cancel">Cancel</button><span class="spacer"></span>
        <span class="hint">The app saves the text and the fields above.</span>
        <button type="button" class="primary-button" data-action="save"${draft.busy || draft.proposal ? ' disabled' : ''}><i data-icon="check" data-size="16"></i> Approve &amp; save</button></div>`;
  }

  improvePanel() {
    const draft = this.draft;
    const suggestions = ['Make the results measurable', 'Make it shorter', 'Use strong action verbs'];
    let result = '';
    if (draft.busy === 'improve') result = `<div class="loading" role="status"><span class="spinner"></span>The AI improves your text…</div>`;
    else if (draft.proposal) result = `<div class="compare">
        <div class="compare-side"><div class="compare-label">ORIGINAL</div><div class="markdown">${Markdown.render(draft.original)}</div></div>
        <div class="compare-side improved"><div class="compare-label"><i data-icon="sparkles" data-size="12"></i> IMPROVED</div><div class="markdown">${Markdown.render(draft.proposal)}</div></div></div>
      <p class="ai-note"><i data-icon="shield" data-size="14"></i><span>The AI does not add new facts. It marks a place where a number from you helps.</span></p>
      <div class="actions"><button type="button" class="text-button" data-action="keep-original">Keep original</button>
        <button type="button" class="text-button" data-action="improve"><i data-icon="undo" data-size="14"></i> Try again</button><span class="spacer"></span>
        <button type="button" class="primary-button" data-action="use-improved"><i data-icon="check" data-size="16"></i> Use improved version</button></div>`;
    return `<section class="panel improve-panel" aria-label="Improve with AI" style="margin-top:16px">
      <div class="panel-heading"><h2>Improve with AI</h2><span class="hint">Optional. You compare the result before you accept it.</span>
        <button type="button" class="icon-button" aria-label="Close Improve with AI" data-action="close-improve"><i data-icon="x" data-size="16"></i></button></div>
      <div class="improve-row"><input id="instruction" data-field="instruction" aria-label="Instruction for the AI" maxlength="300"
          placeholder="Optional instruction, for example: Make the results measurable" value="${Text.escape(draft.instruction)}"/>
        <button type="button" class="primary-button" data-action="improve"${draft.busy ? ' disabled' : ''}><i data-icon="sparkles" data-size="16"></i> Improve</button></div>
      <div class="suggestions">${suggestions.map(text => `<button type="button" data-action="suggest" data-text="${text}">${text}</button>`).join('')}</div>
      ${result}</section>`;
  }

  itemView() {
    const item = this.items.find(entry => entry.id === this.openItemId);
    const back = this.draft ? `<div class="draft-return"><i data-icon="pencil" data-size="15"></i><span>Your new experience is not saved yet.</span>
      <button type="button" class="outline-button" data-action="back-to-draft"><i data-icon="left" data-size="14"></i> Back to your draft</button></div>` : '';
    return `${this.breadcrumb('Portfolio', Text.escape(item.title))}
      <div class="page-title"><div><h1>${Text.escape(item.title)}</h1><p>Saved ${item.saved}</p></div>
        ${this.draft ? '' : `<button type="button" class="outline-button" data-action="go-list"><i data-icon="left" data-size="14"></i> All experiences</button>`}</div>
      ${back}
      <section class="panel"><dl class="detail-fields">
        <div><dt>TYPE</dt><dd>${this.typeBadge(item.type)}</dd></div>
        <div><dt>COMPANY</dt><dd>${Text.escape(item.company || '—')}</dd></div>
        <div><dt>START DATE</dt><dd>${Text.month(item.startDate) || '—'}</dd></div>
        <div><dt>END DATE</dt><dd>${Text.month(item.endDate) || 'Present'}</dd></div></dl>
        <div class="pf-chips">${item.skills.map(skill => `<span class="chip">${Text.escape(skill)}</span>`).join('')}</div></section>
      <section class="panel"><div class="panel-heading"><h2>Experience text</h2></div><div class="markdown">${Markdown.render(item.text)}</div></section>`;
  }
}

new PortfolioMockup(document.getElementById('view'));
