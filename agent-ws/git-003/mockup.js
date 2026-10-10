/* Mockup for issue #3. Sample data only. No server calls. */

class Icons {
  static shapes = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8M16 13H8M16 17H8"/>',
    briefcase: '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect x="2" y="6" width="20" height="14" rx="2"/>',
    scroll: '<path d="M15 12h-5"/><path d="M15 8h-5"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4M22 5h-4"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    left: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
    code: '<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
    calendar: '<path d="M8 2v4M16 2v4M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
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
    if (!value) return 'Present';
    const [year, month] = value.split('-');
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${names[Number(month) - 1]} ${year}`;
  }

  static period(item) { return `${Text.month(item.startDate)} - ${Text.month(item.endDate)}`; }
}

/** A small, safe Markdown renderer: headings, lists, bold, and italic. */
class Markdown {
  static render(source) {
    const blocks = [];
    let items = [];
    let paragraph = [];
    const closeParagraph = () => { if (paragraph.length) { blocks.push(`<p>${paragraph.join('<br/>')}</p>`); paragraph = []; } };
    const closeList = () => { if (items.length) { blocks.push(`<ul>${items.join('')}</ul>`); items = []; } };
    for (const line of String(source).split('\n')) {
      const heading = line.match(/^(#{1,3})\s+(.*)$/);
      const bullet = line.match(/^\s*-\s+(.*)$/);
      if (heading) { closeParagraph(); closeList(); blocks.push(`<h${heading[1].length}>${Markdown.inline(heading[2])}</h${heading[1].length}>`); }
      else if (bullet) { closeParagraph(); items.push(`<li>${Markdown.inline(bullet[1])}</li>`); }
      else if (!line.trim()) { closeParagraph(); closeList(); }
      else { closeList(); paragraph.push(Markdown.inline(line)); }
    }
    closeParagraph(); closeList();
    return blocks.join('');
  }

  static inline(text) {
    return Text.escape(text).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[\s(])_([^_]+)_/g, '$1<em>$2</em>');
  }
}

/** Sample data and simulated AI results. The real app gets these from the server. */
class SampleData {
  static jobDescription = `Senior Full-Stack Engineer, Data Products
Contoso Analytics · Remote

We build analytics products for retail teams. You will design and build data products from the pipeline to the user interface.

What you will do
- Build data pipelines with Python, SQL, and Airflow
- Build user interfaces with React and TypeScript
- Run services on Kubernetes in AWS
- Lead projects and mentor engineers

What you bring
- 5 or more years of software engineering experience
- Strong Python and SQL (PostgreSQL)
- Experience with REST APIs
- Nice to have: Snowflake and dbt`;

  static job = {
    title: 'Senior Full-Stack Engineer, Data Products',
    company: 'Contoso Analytics · Remote',
    requirements: [
      'Build data pipelines with Python, SQL, and Airflow',
      'Build user interfaces with React and TypeScript',
      'Run services on Kubernetes in AWS',
      'Lead projects and mentor engineers',
      '5 or more years of software engineering experience',
    ],
    keywords: ['Python', 'SQL', 'PostgreSQL', 'React', 'TypeScript', 'Data pipelines', 'Airflow', 'Kubernetes', 'REST APIs', 'Mentoring', 'AWS', 'Snowflake', 'dbt'],
  };

  /** Portfolio items with the review of the agent: relevance, reason, matched keywords, and improved text. */
  static items = [
    { id: 'p1', type: 'PROJECT', title: 'Atlas analytics dashboard', company: 'Acme Corp', startDate: '2022-03', endDate: '2023-06',
      skills: ['Python', 'PostgreSQL', 'React', 'TypeScript', 'Team lead'],
      relevance: 'high', reason: 'Shows Python, PostgreSQL, React, and TypeScript in one data product. Shows team lead work.',
      keywords: ['Python', 'SQL', 'PostgreSQL', 'React', 'TypeScript', 'Data pipelines'],
      original: 'At **Acme Corp** I led the build of Atlas, an internal analytics dashboard.\n\n- Built the data pipeline with Python and PostgreSQL\n- Made the UI with React and TypeScript\n- Worked with 4 engineers and 1 designer',
      improved: '- Led 4 engineers and 1 designer to build Atlas, an internal analytics dashboard\n- Built the data pipeline with Python and SQL (PostgreSQL)\n- Delivered the user interface with React and TypeScript' },
    { id: 'p2', type: 'PROJECT', title: 'Sales data pipeline', company: 'Acme Corp', startDate: '2021-06', endDate: '2022-02',
      skills: ['Python', 'Airflow'],
      relevance: 'high', reason: 'Shows data pipelines with Python and Airflow. The job asks for both.',
      keywords: ['Python', 'Airflow', 'Data pipelines'],
      original: 'A nightly pipeline that moves sales data into the warehouse.\n\n- Python and Airflow\n- 40 source tables',
      improved: '- Built a nightly data pipeline with Python and Airflow that loads sales data into the warehouse\n- Integrated 40 source tables' },
    { id: 'w1', type: 'WORK', title: 'Senior Software Engineer', company: 'Northwind Labs', startDate: '2019-01', endDate: '2021-05',
      skills: ['Java', 'Kubernetes', 'Mentoring'],
      relevance: 'medium', reason: 'Shows Kubernetes and mentoring. The main language is Java, not Python.',
      keywords: ['Kubernetes', 'Mentoring'],
      original: 'I worked in the platform team at **Northwind Labs**.\n\n- Moved 12 services to Kubernetes\n- Mentored 3 junior engineers',
      improved: '- Migrated 12 services to Kubernetes in the platform team\n- Mentored 3 junior engineers' },
    { id: 'w2', type: 'WORK', title: 'Software Engineer', company: 'Fabrikam Retail', startDate: '2016-07', endDate: '2018-12',
      skills: ['JavaScript', 'SQL', 'REST APIs'],
      relevance: 'medium', reason: 'Shows SQL and REST APIs. The work is older and does not use React.',
      keywords: ['SQL', 'REST APIs'],
      original: 'I built features for the online store at **Fabrikam Retail**.\n\n- REST APIs and SQL reports\n- JavaScript front end',
      improved: '- Built REST APIs and SQL reports for the online store\n- Developed front-end features with JavaScript' },
    { id: 'p3', type: 'PROJECT', title: 'Student branch website', company: 'IEEE Student Branch', startDate: '2015-09', endDate: '2016-05',
      skills: ['WordPress', 'PHP'],
      relevance: 'low', reason: 'The job does not ask for WordPress or PHP.',
      keywords: [],
      original: 'I made the website of the student branch.\n\n- WordPress theme and PHP plugins\n- 300 visitors each month',
      improved: '- Built the website of the student branch with WordPress and PHP\n- Reached 300 visitors each month' },
  ];

  static atsChecks = [
    'Standard section headings: Summary, Skills, Work Experience, Projects',
    'One column. No tables, images, or text boxes',
    'Plain bullets and plain dates',
    'Job keywords in the Skills section and in the descriptions',
  ];
}

/** Builds the Markdown resume and the keyword check from the included items. */
class ResumeWriter {
  constructor(job, items) { this.job = job; this.items = items; }

  /** Splits the job keywords: in the resume, in the portfolio but not in the resume, and missing. */
  keywordCheck(allItems) {
    const inResume = new Set(this.items.flatMap(item => item.keywords));
    const inPortfolio = new Set(allItems.flatMap(item => item.keywords));
    return {
      covered: this.job.keywords.filter(word => inResume.has(word)),
      unused: this.job.keywords.filter(word => !inResume.has(word) && inPortfolio.has(word)),
      missing: this.job.keywords.filter(word => !inPortfolio.has(word)),
    };
  }

  skills(covered) {
    const known = new Set(covered.map(word => word.toLowerCase()));
    const other = this.items.flatMap(item => item.skills).filter(skill => !known.has(skill.toLowerCase()) && known.add(skill.toLowerCase()));
    return [...covered, ...other];
  }

  section(heading, type) {
    const entries = this.items.filter(item => item.type === type).sort((a, b) => b.startDate.localeCompare(a.startDate));
    if (!entries.length) return [];
    return [`## ${heading}`, '', ...entries.flatMap(item => [`### ${item.title} | ${item.company}`, Text.period(item), '', item.improved, ''])];
  }

  markdown(covered) {
    const first = covered.slice(0, 5);
    const top = first.length > 1 ? `${first.slice(0, -1).join(', ')}, and ${first.at(-1)}` : first.join('');
    return ['# Abhijat', '[Email] | [Phone] | [City] | [LinkedIn]', '',
      '## Summary', '', `Software engineer with experience in ${top}.`, '',
      '## Skills', '', this.skills(covered).join(', '), '',
      ...this.section('Work Experience', 'WORK'), ...this.section('Projects', 'PROJECT')].join('\n').trim() + '\n';
  }
}

class ResumeMockup {
  constructor(root) {
    this.root = root;
    this.emptyPortfolio = false;
    this.failAi = false;
    this.restart();
    document.addEventListener('click', event => this.onClick(event));
    document.addEventListener('input', event => this.onInput(event));
    this.applyTheme(this.storedTheme());
    Icons.hydrate(document.body);
    this.render();
  }

  // ---------- state changes ----------

  restart() {
    this.step = 'job'; this.jobText = ''; this.busy = null; this.error = null;
    this.included = new Set(); this.tab = 'preview'; this.openCompare = new Set(); this.copied = false;
  }

  storedTheme() {
    try { return localStorage.getItem('mockup-theme') || 'light'; } catch { return 'light'; }
  }

  applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('mockup-theme', theme); } catch { /* storage is optional */ }
    document.querySelectorAll('[data-action="theme"]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.themeValue === theme)));
  }

  proposed(item) { return item.relevance !== 'low'; }
  includedItems() { return SampleData.items.filter(item => this.included.has(item.id)); }

  /** Simulates one AI call. It shows the loading state, then the result or an error. */
  runAi(name, failure, onSuccess) {
    this.busy = name; this.error = null; this.render();
    setTimeout(() => {
      this.busy = null;
      if (this.failAi) this.error = failure; else onSuccess();
      this.render();
    }, 1400);
  }

  analyze() {
    this.runAi('analyze', 'The AI could not analyze the job description. Your text is safe. Try again.', () => {
      this.included = new Set(SampleData.items.filter(item => this.proposed(item)).map(item => item.id));
      this.step = 'select';
    });
  }

  write() {
    this.runAi('write', 'The AI could not write the resume. Your selection is safe. Try again.', () => {
      this.step = 'resume'; this.tab = 'preview'; this.openCompare = new Set();
    });
  }

  resume() {
    const writer = new ResumeWriter(SampleData.job, this.includedItems());
    const check = writer.keywordCheck(SampleData.items);
    return { check, markdown: writer.markdown(check.covered) };
  }

  copy() {
    navigator.clipboard?.writeText(this.resume().markdown).catch(() => { /* the mockup shows the result anyway */ });
    this.copied = true; this.render();
    setTimeout(() => { this.copied = false; this.render(); }, 2000);
  }

  download() {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([this.resume().markdown], { type: 'text/markdown' }));
    link.download = 'resume-contoso-analytics.md';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  toggle(set, id) { if (set.has(id)) set.delete(id); else set.add(id); }

  // ---------- events ----------

  onClick(event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    if (target.tagName === 'A') event.preventDefault();
    const actions = {
      'theme': () => this.applyTheme(target.dataset.themeValue),
      'toggle-empty': () => { this.emptyPortfolio = !this.emptyPortfolio; target.setAttribute('aria-pressed', String(this.emptyPortfolio)); this.restart(); this.render(); },
      'toggle-error': () => { this.failAi = !this.failAi; target.setAttribute('aria-pressed', String(this.failAi)); },
      'restart': () => { this.restart(); this.render(); },
      'sample': () => { this.jobText = SampleData.jobDescription; this.render(); },
      'analyze': () => this.analyze(),
      'dismiss-error': () => { this.error = null; this.render(); },
      'include': () => { this.toggle(this.included, target.dataset.id); this.render(); document.querySelector(`[data-action="include"][data-id="${target.dataset.id}"]`)?.focus(); },
      'back-to-job': () => { this.step = 'job'; this.error = null; this.render(); },
      'write': () => this.write(),
      'back-to-select': () => { this.step = 'select'; this.error = null; this.render(); },
      'tab': () => { this.tab = target.dataset.tab; this.render(); },
      'compare': () => { this.toggle(this.openCompare, target.dataset.id); this.render(); },
      'copy': () => this.copy(),
      'download': () => this.download(),
    };
    actions[target.dataset.action]?.();
  }

  onInput(event) {
    if (event.target.dataset.field !== 'job') return;
    this.jobText = event.target.value;
    document.querySelector('[data-action="analyze"]').disabled = !this.jobText.trim();
    document.getElementById('count').textContent = `${this.jobText.length} / 8000`;
  }

  // ---------- views ----------

  render() {
    const views = { job: () => this.jobStep(), select: () => this.selectStep(), resume: () => this.resumeStep() };
    const intro = { job: 'Paste a job description. The AI builds a resume from your portfolio.',
      select: 'Check the review of the AI. Select the portfolio items for the resume.',
      resume: 'Your resume is ready. The app does not store it. Copy or download it.' }[this.step];
    this.root.innerHTML = `<div class="breadcrumb"><i data-icon="grid" data-size="13"></i> Workspace <span>/</span><strong>Resume</strong></div>
      <div class="page-title"><div><h1>Resume</h1><p>${intro}</p></div></div>
      ${this.emptyPortfolio ? this.emptyView() : `${this.steps()}${this.errorBanner()}${views[this.step]()}`}`;
    Icons.hydrate(this.root);
  }

  emptyView() {
    return `<div class="notes-empty"><span class="empty-icon"><i data-icon="briefcase" data-size="23"></i></span>
      <div><h3>Your portfolio is empty.</h3><p>The AI builds a resume from your portfolio items. Add an experience first.</p></div>
      <button type="button" class="outline-button"><i data-icon="briefcase" data-size="15"></i> Open Portfolio</button></div>`;
  }

  steps() {
    const names = ['Job description', 'Select items', 'Resume'];
    const index = { job: 0, select: 1, resume: 2 }[this.step];
    return `<ol class="steps" aria-label="Progress">${names.map((name, position) => `<li class="${position === index ? 'current' : position < index ? 'done' : ''}"${position === index ? ' aria-current="step"' : ''}>
      <span class="step-number">${position < index ? '<i data-icon="check" data-size="12"></i>' : position + 1}</span><span class="step-text">${name}</span></li>`).join('')}</ol>`;
  }

  errorBanner() {
    return this.error ? `<div class="error-banner" role="alert"><span>${this.error}</span>
      <button type="button" class="icon-button" aria-label="Dismiss error" data-action="dismiss-error"><i data-icon="x" data-size="15"></i></button></div>` : '';
  }

  loading(text) { return `<section class="panel"><div class="loading" role="status"><span class="spinner"></span>${text}</div></section>`; }

  typeBadge(type) {
    return type === 'PROJECT' ? '<span class="type-badge project">Project</span>' : '<span class="type-badge work">Work experience</span>';
  }

  jobStep() {
    if (this.busy === 'analyze') return this.loading(`The AI reads the job description and reviews your ${SampleData.items.length} portfolio items…`);
    return `<section class="panel">
      <div class="panel-heading"><h2>Job description</h2><span class="hint">Paste the full text of the job post.</span></div>
      <textarea class="editor" data-field="job" maxlength="8000" aria-label="Job description" placeholder="Paste the job description here…">${Text.escape(this.jobText)}</textarea>
      <div class="editor-footer"><button type="button" class="text-button" data-action="sample"><i data-icon="file" data-size="14"></i> Insert sample text</button>
        <span class="hint" id="count">${this.jobText.length} / 8000</span></div>
      <p class="ai-note"><i data-icon="shield" data-size="14"></i><span>The AI uses only the facts in your portfolio. It does not change your portfolio items.</span></p>
      <div class="actions"><span class="spacer"></span>
        <button type="button" class="primary-button" data-action="analyze"${this.jobText.trim() ? '' : ' disabled'}><i data-icon="sparkles" data-size="16"></i> Analyze</button></div>
    </section>`;
  }

  itemRow(item) {
    const included = this.included.has(item.id);
    const level = { high: 'High relevance', medium: 'Medium relevance', low: 'Low relevance' }[item.relevance];
    const changed = included !== this.proposed(item);
    const tag = changed ? '<span class="status-tag">Changed by you</span>'
      : `<span class="status-tag ai"><i data-icon="sparkles" data-size="11"></i> ${included ? 'Proposed by AI' : 'Not proposed by AI'}</span>`;
    return `<li class="rs-item ${included ? 'is-included' : 'is-excluded'}">
      <button type="button" class="switch-button" role="switch" aria-checked="${included}" aria-label="Include ${Text.escape(item.title)}" data-action="include" data-id="${item.id}"><span class="switch"></span></button>
      <div class="rs-item-body">
        <div class="rs-item-top">${this.typeBadge(item.type)}<span class="rel ${item.relevance}">${level}</span>${tag}</div>
        <h3>${Text.escape(item.title)}</h3>
        <div class="pf-meta"><span><i data-icon="building" data-size="13"></i>${Text.escape(item.company)}</span>
          <span><i data-icon="calendar" data-size="13"></i>${Text.period(item)}</span></div>
        <p class="rs-reason">${Text.escape(item.reason)}</p>
        ${item.keywords.length ? `<div class="pf-chips">${item.keywords.map(word => `<span class="chip ok">${Text.escape(word)}</span>`).join('')}</div>` : ''}
      </div></li>`;
  }

  selectStep() {
    if (this.busy === 'write') return this.loading('The AI improves the descriptions and writes your resume…');
    const { job } = SampleData;
    const count = this.included.size;
    return `<div class="review-layout">
        <section class="panel rs-job" aria-label="What the job needs">
          <div class="panel-heading"><h2>What the job needs</h2><span class="status-tag ai"><i data-icon="sparkles" data-size="11"></i> Found by AI</span></div>
          <h3>${Text.escape(job.title)}</h3><p class="rs-company">${Text.escape(job.company)}</p>
          <div class="rs-label">MAIN REQUIREMENTS</div>
          <ul class="rs-requirements">${job.requirements.map(line => `<li>${Text.escape(line)}</li>`).join('')}</ul>
          <div class="rs-label">KEYWORDS</div>
          <div class="pf-chips" style="margin-top:0">${job.keywords.map(word => `<span class="chip">${Text.escape(word)}</span>`).join('')}</div>
        </section>
        <section class="panel" aria-label="Your portfolio items">
          <div class="panel-heading"><h2>Your portfolio items</h2><span class="count-badge">${SampleData.items.length}</span>
            <span class="hint">${count} of ${SampleData.items.length} included</span></div>
          <ul class="rs-items">${SampleData.items.map(item => this.itemRow(item)).join('')}</ul>
        </section>
      </div>
      <div class="actions"><button type="button" class="text-button" data-action="back-to-job"><i data-icon="left" data-size="14"></i> Change the job description</button><span class="spacer"></span>
        <span class="hint">${count ? 'The resume uses only the included items.' : 'Include one item or more.'}</span>
        <button type="button" class="primary-button" data-action="write"${count ? '' : ' disabled'}><i data-icon="sparkles" data-size="16"></i> Write resume</button></div>`;
  }

  keywordGroup(label, words, style, note) {
    if (!words.length) return '';
    return `<div class="rs-label">${label}</div>
      <div class="pf-chips" style="margin-top:0">${words.map(word => `<span class="chip ${style}">${Text.escape(word)}</span>`).join('')}</div>
      ${note ? `<p class="rs-note">${note}</p>` : ''}`;
  }

  atsPanel(check) {
    const total = SampleData.job.keywords.length;
    return `<section class="panel" aria-label="ATS check">
      <div class="panel-heading"><h2>ATS check</h2><span class="hint">Applicant Tracking Systems</span></div>
      <div class="meter-row"><strong>${check.covered.length} of ${total}</strong><span>job keywords are in the resume</span></div>
      <div class="meter" aria-hidden="true"><span style="width:${Math.round(check.covered.length / total * 100)}%"></span></div>
      ${this.keywordGroup('IN THE RESUME', check.covered, 'ok')}
      ${this.keywordGroup('IN ITEMS THAT YOU EXCLUDED', check.unused, '', 'Include the item to add these keywords.')}
      ${this.keywordGroup('NOT IN YOUR PORTFOLIO', check.missing, 'warn', 'The AI did not add these keywords. Add an experience to your portfolio if you have these skills.')}
      <div class="rs-label">FORMAT</div>
      <ul class="ats-list">${SampleData.atsChecks.map(line => `<li><i data-icon="check" data-size="14"></i><span>${line}</span></li>`).join('')}</ul>
    </section>`;
  }

  improvedPanel() {
    const rows = this.includedItems().map(item => {
      const open = this.openCompare.has(item.id);
      return `<li><button type="button" class="improved-toggle" aria-expanded="${open}" data-action="compare" data-id="${item.id}">
          <strong>${Text.escape(item.title)}</strong><small>${Text.escape(item.company)}</small><i data-icon="down" data-size="15"></i></button>
        ${open ? `<div class="compare">
          <div class="compare-side"><div class="compare-label">IN YOUR PORTFOLIO</div><div class="markdown">${Markdown.render(item.original)}</div></div>
          <div class="compare-side improved"><div class="compare-label"><i data-icon="sparkles" data-size="12"></i> IN THE RESUME</div><div class="markdown">${Markdown.render(item.improved)}</div></div></div>` : ''}</li>`;
    }).join('');
    return `<section class="panel" aria-label="Improved descriptions" style="margin-top:16px">
      <div class="panel-heading"><h2>Improved descriptions</h2><span class="hint">Open an item to compare the two versions.</span></div>
      <ul class="improved-list">${rows}</ul>
      <p class="ai-note"><i data-icon="shield" data-size="14"></i><span>The AI changes the words for the job. It does not add or change facts. Your portfolio stays unchanged.</span></p>
    </section>`;
  }

  resumeStep() {
    const { check, markdown } = this.resume();
    const body = this.tab === 'preview'
      ? `<div class="resume-paper markdown" aria-label="Resume preview">${Markdown.render(markdown)}</div>`
      : `<pre class="md-source" aria-label="Resume Markdown">${Text.escape(markdown)}</pre>`;
    return `<div class="resume-layout">
        <section class="panel" aria-label="Your resume">
          <div class="panel-heading"><h2>Your resume</h2>
            <div class="tabs" role="tablist" aria-label="Resume view">
              <button type="button" role="tab" aria-selected="${this.tab === 'preview'}" data-action="tab" data-tab="preview"><i data-icon="eye" data-size="13"></i> Preview</button>
              <button type="button" role="tab" aria-selected="${this.tab === 'markdown'}" data-action="tab" data-tab="markdown"><i data-icon="code" data-size="13"></i> Markdown</button>
            </div>
            <div class="resume-tools">
              <button type="button" class="outline-button" data-action="copy"><i data-icon="${this.copied ? 'check' : 'copy'}" data-size="14"></i> ${this.copied ? 'Copied' : 'Copy Markdown'}</button>
              <button type="button" class="primary-button" data-action="download"><i data-icon="download" data-size="15"></i> Download .md</button>
            </div></div>
          ${body}
        </section>
        ${this.atsPanel(check)}
      </div>
      ${this.improvedPanel()}
      <div class="actions"><button type="button" class="text-button" data-action="back-to-select"><i data-icon="left" data-size="14"></i> Change the selection</button><span class="spacer"></span>
        <button type="button" class="outline-button" data-action="restart">Start a new resume</button></div>`;
  }
}

new ResumeMockup(document.getElementById('view'));
