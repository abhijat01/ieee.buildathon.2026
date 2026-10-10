/* Mockup for issue #2. Sample data only. No server calls. */

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
    send: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
    save: '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7M7 3v4a1 1 0 0 0 1 1h7"/>',
    list: '<path d="M3 12h.01M3 18h.01M3 6h.01M8 12h13M8 18h13M8 6h13"/>',
    tags: '<path d="m15 5 6.3 6.3a2.4 2.4 0 0 1 0 3.4L17 19"/><path d="M9.586 5.586A2 2 0 0 0 8.172 5H3a1 1 0 0 0-1 1v5.172a2 2 0 0 0 .586 1.414L8.29 18.29a2.426 2.426 0 0 0 3.42 0l3.58-3.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="6.5" cy="9.5" r=".5" fill="currentColor"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
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

/** Sample portfolio items. The real app reads them from the server. */
class SampleData {
  static items() {
    return [
      { id: 'a1', title: 'Atlas reporting dashboard', type: 'PROJECT', company: 'Acme Corp', startDate: '2022-03', endDate: '2023-03',
        skills: ['Python', 'React', 'PostgreSQL'], saved: 'Sep 12',
        text: '## Atlas reporting dashboard\n\nI built the first version of the Atlas dashboard at **Acme Corp**. The work went on until the middle of 2023.\n\n- Python data pipeline\n- React UI for the sales team\n- Deployed it on Kubernetes with Docker' },
      { id: 'a2', title: 'Sales data pipeline', type: 'PROJECT', company: 'Acme Corp', startDate: '2021-06', endDate: '2022-02',
        skills: ['Python'], saved: 'Aug 30',
        text: '## Sales data pipeline\n\nI built a nightly pipeline that moves sales data into the warehouse.\n\n- Python and Airflow\n- 40 source tables' },
      { id: 'a3', title: 'Senior Software Engineer', type: 'WORK', company: 'Northwind Labs', startDate: '2019-01', endDate: '2021-05',
        skills: ['Java', 'Kubernetes'], saved: 'Aug 30',
        text: 'I worked in the platform team at **Northwind Labs**.\n\n- Moved 12 services to Kubernetes\n- Mentoring for 3 junior engineers' },
    ];
  }
}

/** A scripted assistant. It simulates the AI agent of the real app. It reads the current form values. */
class ScriptedAssistant {
  static actions = [
    { id: 'improve', icon: 'sparkles', label: 'Improve the text', prompt: 'Improve the text.' },
    { id: 'skills', icon: 'tags', label: 'Suggest skills', prompt: 'Suggest skills for this experience.' },
    { id: 'fields', icon: 'refresh', label: 'Update the fields', prompt: 'Update the fields from the text.' },
    { id: 'facts', icon: 'help', label: 'Ask me for missing facts', prompt: 'Ask me for missing facts.' },
    { id: 'bullets', icon: 'list', label: 'Write resume bullets', prompt: 'Write resume bullets.' },
  ];
  static knownSkills = ['Kubernetes', 'Docker', 'Python', 'React', 'PostgreSQL', 'Airflow', 'Java', 'TypeScript', 'Mentoring'];
  static rewrites = [['I built', 'Built'], ['I worked', 'Worked'], ['went on', 'continued'], ['- Python data pipeline', '- Built the data pipeline with Python'],
    ['- React UI', '- Built the React UI'], ['- Deployed it', '- Deployed the dashboard'], ['- Python and Airflow', '- Used Python and Airflow'],
    ['- Mentoring for', '- Mentored'], ['- Moved', '- Migrated']];

  static answer(request, form, awaitsFacts) {
    const words = request.toLowerCase();
    if (awaitsFacts) return ScriptedAssistant.useFacts(request, form);
    if (words.includes('skill')) return ScriptedAssistant.skills(form);
    if (words.includes('field') || words.includes('date')) return ScriptedAssistant.fields(form);
    if (words.includes('fact') || words.includes('missing')) return ScriptedAssistant.askFacts();
    if (words.includes('bullet') || words.includes('resume')) return ScriptedAssistant.bullets(form);
    if (words.includes('short')) return ScriptedAssistant.shorter(form);
    if (/improve|better|rewrite|text|clear/.test(words)) return ScriptedAssistant.improve(form);
    return { text: 'I can improve the text, suggest skills, update the fields, ask you for missing facts, or write resume bullets. Tell me what you want to change.' };
  }

  static improve(form) {
    const value = ScriptedAssistant.rewrites.reduce((text, [from, to]) => text.replace(from, to), form.text);
    if (value === form.text) return { text: 'The text is already clear and active. I have no proposal.' };
    return { text: 'I made the text more active. I kept each fact and added none.',
      proposal: { kind: 'text', label: 'Improved text', why: 'More active verbs. The facts are the same.', value } };
  }

  static shorter(form) {
    const lines = form.text.split('\n').filter((line, index, all) => !line.trim() || /^(#|-|\*\*)/.test(line.trim()) || index === all.findIndex(entry => entry.trim() && !/^(#|-)/.test(entry.trim())));
    const value = lines.join('\n').replace(/\n{3,}/g, '\n\n').replace(/ The work (went on|continued) until the middle of 2023\./, '');
    if (value === form.text) return { text: 'The text is already short. I have no proposal.' };
    return { text: 'I made the text shorter. Check that no important fact is gone.',
      proposal: { kind: 'text', label: 'Shorter text', why: 'Fewer words. The list is the same.', value } };
  }

  static skills(form) {
    const have = form.skills.map(skill => skill.toLowerCase());
    const values = ScriptedAssistant.knownSkills.filter(skill => form.text.toLowerCase().includes(skill.toLowerCase()) && !have.includes(skill.toLowerCase()));
    if (!values.length) return { text: 'Your skill list already contains each skill that the text names.' };
    return { text: `The text names ${values.length === 1 ? '1 skill that is' : `${values.length} skills that are`} not in your list: ${values.join(', ')}.`,
      proposal: { kind: 'skills', values } };
  }

  static fields(form) {
    const changes = {};
    if (form.text.includes('middle of 2023') && form.endDate !== '2023-06') changes.endDate = { value: '2023-06', why: 'The text says: “until the middle of 2023”.' };
    const heading = (form.text.match(/^#+\s+(.+)$/m) || [])[1];
    if (heading && heading.trim() !== form.title.trim()) changes.title = { value: heading.trim(), why: 'The heading of the text has this title.' };
    const names = Object.keys(changes);
    if (!names.length) return { text: 'The fields agree with the text. I have no proposal.' };
    return { text: `I found ${names.length === 1 ? '1 field that does' : `${names.length} fields that do`} not agree with the text.`, proposal: { kind: 'fields', changes } };
  }

  static askFacts() {
    return { awaitsFacts: true, text: 'A result can make this experience stronger. For example: how many people used your work, or what became faster? Answer in your own words. I use only what you tell me.' };
  }

  static useFacts(answer, form) {
    const fact = answer.trim().replace(/\s+/g, ' ');
    const sentence = fact.charAt(0).toUpperCase() + fact.slice(1) + (/[.!?]$/.test(fact) ? '' : '.');
    return { text: 'Thank you. I added your answer as a result line. I did not change your words.',
      proposal: { kind: 'text', label: 'Text with your result', why: 'One new line with the fact that you gave.', value: `${form.text.trim()}\n\n**Result:** ${sentence}` } };
  }

  static bullets(form) {
    if (form.text.includes('### Resume bullets')) return { text: 'The text already has a section with resume bullets.' };
    const lines = form.text.split('\n').filter(line => /^\s*-\s+/.test(line)).slice(0, 3)
      .map(line => ScriptedAssistant.rewrites.reduce((text, [from, to]) => text.replace(from, to), line));
    const place = form.company ? ` at ${form.company}` : '';
    const bullets = lines.length ? lines.map((line, index) => index === 0 ? `${line}${place}` : line) : [`- Delivered ${form.title}${place}`];
    return { text: `I wrote ${bullets.length} resume bullets from your list. They go in a new section at the end of the text.`,
      proposal: { kind: 'text', label: 'Text with resume bullets', why: 'A new section at the end. The other text is the same.', value: `${form.text.trim()}\n\n### Resume bullets\n\n${bullets.join('\n')}` } };
  }
}

class EditMockup {
  constructor(root, overlay) {
    this.root = root;
    this.overlay = overlay;
    this.items = SampleData.items();
    this.view = 'list';
    this.failAi = false;
    this.aiOff = false;
    this.savedNotice = false;
    this.confirm = null;
    document.addEventListener('click', event => this.onClick(event));
    document.addEventListener('input', event => this.onInput(event));
    document.addEventListener('keydown', event => this.onKey(event));
    this.applyTheme(this.storedTheme());
    Icons.hydrate(document.body);
    this.render();
  }

  // ---------- state ----------

  storedTheme() { try { return localStorage.getItem('mockup-theme') || 'light'; } catch { return 'light'; } }

  applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('mockup-theme', theme); } catch { /* storage is optional */ }
    document.querySelectorAll('[data-action="theme"]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.themeValue === theme)));
  }

  open(id) {
    const item = this.items.find(entry => entry.id === id);
    this.item = item;
    this.form = { title: item.title, type: item.type, company: item.company, startDate: item.startDate, endDate: item.endDate, skills: [...item.skills], text: item.text };
    this.tab = 'write';
    this.proposals = { text: null, skills: [], fields: {} };
    this.messages = [];
    this.draft = '';
    this.busy = false;
    this.awaitsFacts = false;
    this.sheetOpen = false;
    this.savedNotice = false;
    this.view = 'item';
  }

  dirty() {
    const { item, form } = this;
    return ['title', 'type', 'company', 'startDate', 'endDate', 'text'].some(name => (item[name] || '') !== (form[name] || ''))
      || item.skills.join('|') !== form.skills.join('|');
  }

  pendingCount() { return (this.proposals.text ? 1 : 0) + this.proposals.skills.length + Object.keys(this.proposals.fields).length; }

  save() {
    Object.assign(this.item, { ...this.form, skills: [...this.form.skills], saved: 'Today' });
    this.savedNotice = true;
  }

  leave() {
    if (this.view === 'item' && this.dirty()) this.confirm = 'leave';
    else this.view = 'list';
  }

  // ---------- assistant ----------

  send(request) {
    const text = request.trim();
    if (!text || this.busy || this.aiOff) return;
    this.messages.push({ role: 'user', text });
    this.draft = '';
    this.ask(text);
  }

  ask(request) {
    this.busy = true;
    this.render();
    setTimeout(() => {
      if (this.failAi) {
        this.busy = false;
        this.messages.push({ role: 'ai', error: true, request, text: 'The assistant could not answer. Your changes are safe.' });
        return this.render();
      }
      const answer = ScriptedAssistant.answer(request, this.form, this.awaitsFacts);
      this.awaitsFacts = Boolean(answer.awaitsFacts);
      const message = { role: 'ai', text: '', activity: null };
      this.messages.push(message);
      this.stream(message, answer);
    }, 900);
  }

  /** Shows the answer word by word, as the real agent streams it. */
  stream(message, answer) {
    const words = answer.text.split(/(?<= )/);
    const timer = setInterval(() => {
      message.text += words.shift();
      const node = document.querySelector('.msg.streaming p');
      if (node) { node.innerHTML = Markdown.inline(message.text); this.scrollConversation(); } else this.render();
      if (words.length) return;
      clearInterval(timer);
      this.busy = false;
      if (answer.proposal) this.propose(answer.proposal, message);
      this.render();
    }, 28);
    this.render();
  }

  propose(proposal, message) {
    const labels = { text: 'Proposed a new text', skills: 'Proposed skills', fields: 'Proposed field changes' };
    message.activity = { kind: proposal.kind, label: labels[proposal.kind], state: 'pending' };
    if (proposal.kind === 'text') {
      if (this.proposals.text) this.close(this.proposals.text.message, 'Replaced by a newer proposal');
      this.proposals.text = { ...proposal, message };
      this.tab = 'write';
    }
    if (proposal.kind === 'skills') proposal.values.forEach(value => { if (!this.proposals.skills.some(entry => entry.value === value)) this.proposals.skills.push({ value, message }); });
    if (proposal.kind === 'fields') Object.entries(proposal.changes).forEach(([name, change]) => { this.proposals.fields[name] = { ...change, message }; });
    this.focusProposal = proposal.kind;
  }

  close(message, label) { if (message.activity) message.activity = { ...message.activity, state: 'done', label }; }

  /** Updates the chat line of a message when no proposal of that message waits for a decision. */
  settle(message, label) {
    const open = this.proposals.text?.message === message || this.proposals.skills.some(entry => entry.message === message)
      || Object.values(this.proposals.fields).some(entry => entry.message === message);
    if (!open) this.close(message, label);
  }

  decideText(accept) {
    const proposal = this.proposals.text;
    if (accept) this.form.text = proposal.value;
    this.proposals.text = null;
    this.settle(proposal.message, accept ? 'You accepted the new text' : 'You rejected the new text');
  }

  decideSkill(index, accept) {
    const [proposal] = this.proposals.skills.splice(index, 1);
    if (accept) this.form.skills.push(proposal.value);
    this.settle(proposal.message, 'You reviewed the skills');
  }

  decideField(name, accept) {
    const proposal = this.proposals.fields[name];
    if (accept) this.form[name] = proposal.value;
    delete this.proposals.fields[name];
    this.settle(proposal.message, 'You reviewed the field changes');
  }

  showProposal(kind) {
    this.sheetOpen = false;
    this.render();
    const target = document.querySelector(`[data-proposal="${kind}"]`);
    if (!target) return;
    const wide = window.matchMedia('(min-width: 1101px)').matches;
    target.scrollIntoView({ behavior: 'smooth', block: wide ? 'center' : 'start' });
    target.classList.add('flash');
  }

  scrollConversation() {
    const box = document.querySelector('.conversation');
    if (box) box.scrollTop = box.scrollHeight;
  }

  // ---------- events ----------

  onClick(event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    if (target.tagName === 'A') event.preventDefault();
    const data = target.dataset;
    const actions = {
      'theme': () => this.applyTheme(data.themeValue),
      'toggle-error': () => { this.failAi = !this.failAi; target.setAttribute('aria-pressed', String(this.failAi)); },
      'toggle-off': () => { this.aiOff = !this.aiOff; target.setAttribute('aria-pressed', String(this.aiOff)); },
      'go-list': () => this.leave(),
      'open-item': () => this.open(data.id),
      'tab': () => { this.tab = data.tab; },
      'type': () => { this.form.type = data.type; },
      'remove-skill': () => { this.form.skills.splice(Number(data.index), 1); },
      'save': () => this.save(),
      'discard': () => { this.confirm = 'discard'; },
      'confirm-yes': () => { const leave = this.confirm === 'leave'; this.confirm = null; if (leave) this.view = 'list'; else this.open(this.item.id); },
      'confirm-no': () => { this.confirm = null; },
      'dismiss-saved': () => { this.savedNotice = false; },
      'quick': () => this.send(ScriptedAssistant.actions.find(action => action.id === data.id).prompt),
      'send': () => this.send(this.draft),
      'retry': () => { this.messages.splice(Number(data.index), 1); this.ask(data.request); },
      'text-accept': () => this.decideText(true),
      'text-reject': () => this.decideText(false),
      'skill-accept': () => this.decideSkill(Number(data.index), true),
      'skill-reject': () => this.decideSkill(Number(data.index), false),
      'skills-accept-all': () => { while (this.proposals.skills.length) this.decideSkill(0, true); },
      'field-accept': () => this.decideField(data.name, true),
      'field-reject': () => this.decideField(data.name, false),
      'show-proposal': () => this.showProposal(data.kind),
      'open-sheet': () => { this.sheetOpen = true; },
      'close-sheet': () => { this.sheetOpen = false; },
    };
    const action = actions[data.action];
    if (!action) return;
    action();
    if (!['theme', 'quick', 'send', 'retry', 'show-proposal'].includes(data.action)) this.render();
    if (data.action === 'open-sheet') document.getElementById('composer')?.focus();
  }

  onInput(event) {
    const { field } = event.target.dataset;
    if (!field || this.view !== 'item') return;
    if (field === 'composer') { this.draft = event.target.value; this.sizeComposer(); document.querySelector('[data-action="send"]').disabled = !this.draft.trim() || this.busy; return; }
    if (field === 'skill') return;
    this.form[field] = event.target.value;
    this.syncHeader();
  }

  onKey(event) {
    if (event.key === 'Escape' && this.confirm) { this.confirm = null; return this.render(); }
    if (event.key !== 'Enter' || this.view !== 'item') return;
    if (event.target.dataset.field === 'skill' && event.target.value.trim()) {
      event.preventDefault();
      this.form.skills.push(event.target.value.trim());
      this.render();
      document.getElementById('skill-input')?.focus();
    }
    if (event.target.dataset.field === 'composer' && !event.shiftKey) { event.preventDefault(); this.send(this.draft); }
  }

  sizeComposer() {
    const box = document.getElementById('composer');
    if (!box) return;
    box.style.height = 'auto';
    box.style.height = `${box.scrollHeight}px`;
  }

  /** Updates the save controls without a full render, so that the text field keeps the focus. */
  syncHeader() {
    const dirty = this.dirty();
    document.querySelectorAll('[data-needs-change]').forEach(button => { button.disabled = !dirty; });
    document.querySelectorAll('.unsaved-tag').forEach(tag => { tag.hidden = !dirty; });
    const context = document.getElementById('assistant-context');
    if (context) context.textContent = this.contextLine();
  }

  // ---------- views ----------

  render() {
    const composerFocused = document.activeElement?.id === 'composer';
    this.root.innerHTML = this.view === 'list' ? this.listView() : this.itemView();
    this.overlay.innerHTML = this.confirm ? this.confirmDialog() : '';
    Icons.hydrate(this.root);
    Icons.hydrate(this.overlay);
    this.scrollConversation();
    this.sizeComposer();
    if (composerFocused) document.getElementById('composer')?.focus();
    if (this.focusProposal && window.matchMedia('(min-width: 1101px)').matches) {
      document.querySelector(`[data-proposal="${this.focusProposal}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    this.focusProposal = null;
    if (this.confirm) this.overlay.querySelector('[data-action="confirm-no"]')?.focus();
  }

  breadcrumb(current) {
    return `<div class="breadcrumb"><i data-icon="grid" data-size="13"></i> Workspace <span>/</span>${current
      ? `<a href="#" data-action="go-list">Portfolio</a><span>/</span><strong>${Text.escape(current)}</strong>` : '<strong>Portfolio</strong>'}</div>`;
  }

  typeBadge(type) {
    return type === 'PROJECT' ? '<span class="type-badge project">Project</span>' : '<span class="type-badge work">Work experience</span>';
  }

  listView() {
    const cards = this.items.map(item => `<button type="button" class="pf-card" data-action="open-item" data-id="${item.id}">
        <div class="pf-card-top">${this.typeBadge(item.type)}<span class="pf-new-label" style="color:var(--muted);font-weight:500">Saved ${item.saved}</span></div>
        <h3>${Text.escape(item.title)}</h3>
        <div class="pf-meta"><span><i data-icon="building" data-size="13"></i>${Text.escape(item.company || 'No company')}</span>
          <span><i data-icon="calendar" data-size="13"></i>${Text.period(item)}</span></div>
        <div class="pf-chips">${item.skills.map(skill => `<span class="chip">${Text.escape(skill)}</span>`).join('')}</div>
      </button>`).join('');
    return `${this.breadcrumb()}
      <div class="page-title"><div><h1>Portfolio</h1><p>Select an experience to change it. The assistant helps you on the next screen.</p></div>
        <button type="button" class="primary-button"><i data-icon="plus" data-size="16"></i> Add experience</button></div>
      <div class="section-title"><h2>Your experiences <span class="count-badge">${this.items.length}</span></h2></div>
      <div class="pf-grid">${cards}</div>`;
  }

  itemView() {
    const dirty = this.dirty();
    const pending = this.pendingCount();
    return `${this.breadcrumb(this.item.title)}
      <div class="page-title"><div><h1>Edit experience</h1>
          <p class="title-meta">Saved ${this.item.saved}<span class="unsaved-tag"${dirty ? '' : ' hidden'}>Unsaved changes</span>
            ${pending ? `<span class="status-tag ai"><i data-icon="sparkles" data-size="11"></i> ${pending} ${pending === 1 ? 'proposal' : 'proposals'} to review</span>` : ''}</p></div>
        <div class="header-actions"><button type="button" class="outline-button" data-action="discard" data-needs-change${dirty ? '' : ' disabled'}><i data-icon="undo" data-size="14"></i> Discard</button>
          <button type="button" class="primary-button" data-action="save" data-needs-change${dirty ? '' : ' disabled'}><i data-icon="save" data-size="16"></i> Save changes</button></div></div>
      ${this.savedNotice ? `<div class="success-banner" role="status"><i data-icon="check" data-size="16"></i><span>The app saved your changes.</span>
        <button type="button" class="icon-button" aria-label="Dismiss message" data-action="dismiss-saved"><i data-icon="x" data-size="15"></i></button></div>` : ''}
      <div class="edit-layout"><div class="edit-main">${this.detailsPanel()}${this.textPanel()}</div>${this.assistantPane()}</div>
      <div class="sheet-backdrop${this.sheetOpen ? ' open' : ''}" data-action="close-sheet"></div>
      <button type="button" class="assistant-fab" data-action="open-sheet"><i data-icon="sparkles" data-size="17"></i> Assistant${this.busy ? '<span class="fab-badge">…</span>' : ''}</button>`;
  }

  fieldProposal(name) {
    const proposal = this.proposals.fields[name];
    if (!proposal) return '';
    return `<div class="field-proposal" data-proposal="fields"><i data-icon="sparkles" data-size="13"></i><span>The assistant proposes <strong>${Text.escape(proposal.value)}</strong>. ${Text.escape(proposal.why)}</span>
      <span class="proposal-buttons"><button type="button" class="small-button" data-action="field-reject" data-name="${name}">Reject</button>
      <button type="button" class="small-button accept" data-action="field-accept" data-name="${name}"><i data-icon="check" data-size="13"></i> Accept</button></span></div>`;
  }

  fieldInput(name, label, placeholder, full = false) {
    return `<div class="field${full ? ' full' : ''}"><label for="field-${name}">${label}</label>
      <input id="field-${name}" data-field="${name}" value="${Text.escape(this.form[name] || '')}" placeholder="${placeholder}"/>${this.fieldProposal(name)}</div>`;
  }

  detailsPanel() {
    const { form, proposals } = this;
    const proposed = proposals.skills.map((proposal, index) => `<span class="chip proposed">+ ${Text.escape(proposal.value)}
      <button type="button" aria-label="Accept ${Text.escape(proposal.value)}" title="Accept" data-action="skill-accept" data-index="${index}"><i data-icon="check" data-size="12"></i></button>
      <button type="button" aria-label="Reject ${Text.escape(proposal.value)}" title="Reject" data-action="skill-reject" data-index="${index}"><i data-icon="x" data-size="12"></i></button></span>`).join('');
    return `<section class="panel" aria-label="Details">
      <div class="panel-heading"><h2>Details</h2></div>
      <div class="field-grid">
        ${this.fieldInput('title', 'Title', 'Example: Atlas analytics dashboard', true)}
        <div class="field full"><span class="label" id="type-label">Type</span>
          <div class="segmented" role="group" aria-labelledby="type-label">
            <button type="button" aria-pressed="${form.type === 'PROJECT'}" data-action="type" data-type="PROJECT">Project</button>
            <button type="button" aria-pressed="${form.type === 'WORK'}" data-action="type" data-type="WORK">Work experience</button></div></div>
        ${this.fieldInput('company', 'Company', 'Example: Acme Corp', true)}
        ${this.fieldInput('startDate', 'Start date', 'YYYY-MM')}
        ${this.fieldInput('endDate', 'End date', 'Empty for current work')}
        <div class="field full"${proposals.skills.length ? ' data-proposal="skills"' : ''}><label for="skill-input">Skills</label>
          <div class="skill-box">${form.skills.map((skill, index) => `<span class="chip">${Text.escape(skill)}<button type="button" aria-label="Remove ${Text.escape(skill)}" data-action="remove-skill" data-index="${index}"><i data-icon="x" data-size="11"></i></button></span>`).join('')}${proposed}
            <input id="skill-input" data-field="skill" placeholder="Add a skill, then press Enter"/></div>
          ${proposals.skills.length ? `<div class="skill-proposal-note"><i data-icon="sparkles" data-size="13"></i><span>The assistant proposes the skills with a dashed line. Accept or reject each skill.</span>
            <button type="button" class="small-button" data-action="skills-accept-all">Accept all</button></div>` : ''}</div>
      </div></section>`;
  }

  textPanel() {
    const { form, proposals, tab } = this;
    const proposal = proposals.text;
    const block = proposal ? `<div class="proposal-block" data-proposal="text">
        <div class="proposal-head"><i data-icon="sparkles" data-size="14"></i> Proposal from the assistant · ${Text.escape(proposal.label)}</div>
        <p class="proposal-why">${Text.escape(proposal.why)}</p>
        <div class="compare"><div class="compare-side"><div class="compare-label">CURRENT</div><div class="markdown">${Markdown.render(form.text)}</div></div>
          <div class="compare-side improved"><div class="compare-label"><i data-icon="sparkles" data-size="12"></i> PROPOSED</div><div class="markdown">${Markdown.render(proposal.value)}</div></div></div>
        <div class="proposal-actions"><button type="button" class="small-button" data-action="text-reject">Reject</button>
          <button type="button" class="small-button accept" data-action="text-accept"><i data-icon="check" data-size="13"></i> Accept</button></div></div>` : '';
    const editor = tab === 'write'
      ? `<textarea class="editor" data-field="text" maxlength="4000" aria-label="Experience text">${Text.escape(form.text)}</textarea>`
      : `<div class="preview-box markdown" aria-label="Markdown preview">${Markdown.render(form.text)}</div>`;
    return `<section class="panel" aria-label="Experience text">
      <div class="panel-heading"><h2>Experience text</h2>
        <div class="tabs" role="tablist" aria-label="Editor mode">
          <button type="button" role="tab" aria-selected="${tab === 'write'}" data-action="tab" data-tab="write"><i data-icon="pencil" data-size="13"></i> Write</button>
          <button type="button" role="tab" aria-selected="${tab === 'preview'}" data-action="tab" data-tab="preview"><i data-icon="eye" data-size="13"></i> Preview</button></div>
        <span class="hint">Markdown is supported.</span></div>
      ${block}${editor}</section>`;
  }

  contextLine() { return `Works on: ${this.form.title || 'this experience'}${this.dirty() ? ' · sees your unsaved changes' : ''}`; }

  message(message, index) {
    if (message.role === 'user') return `<div class="msg user"><span class="msg-label">You</span><p>${Text.escape(message.text)}</p></div>`;
    if (message.error) return `<div class="msg ai"><span class="msg-label">Assistant</span><div class="msg-error" role="alert"><span>${message.text}</span>
      <button type="button" data-action="retry" data-index="${index}" data-request="${Text.escape(message.request)}">Try again</button></div></div>`;
    const streaming = this.busy && index === this.messages.length - 1;
    const activity = message.activity;
    const line = !activity ? '' : activity.state === 'pending'
      ? `<div class="msg-activity"><i data-icon="sparkles" data-size="13"></i><span>${activity.label}</span><button type="button" data-action="show-proposal" data-kind="${activity.kind}">Show in the form</button></div>`
      : `<div class="msg-activity done" style="padding-right:12px"><i data-icon="check" data-size="13"></i><span>${activity.label}</span></div>`;
    return `<div class="msg ai${streaming ? ' streaming' : ''}"><span class="msg-label">Assistant</span><p>${Markdown.inline(message.text)}</p>${line}</div>`;
  }

  assistantPane() {
    const actions = ScriptedAssistant.actions;
    const off = this.aiOff;
    const intro = `<div class="assistant-intro"><h3>How can I help with this experience?</h3>
        <p>I read the fields and the text on this page. I show each change as a proposal. You decide.</p>
        ${off ? '<div class="assistant-off" role="status">The assistant is not available at this time. You can still change and save the experience.</div>'
          : `<div class="intro-actions">${actions.map(action => `<button type="button" data-action="quick" data-id="${action.id}"><i data-icon="${action.icon}" data-size="15"></i>${action.label}<i data-icon="right" data-size="14"></i></button>`).join('')}</div>`}</div>`;
    const thinking = this.busy && this.messages[this.messages.length - 1]?.role === 'user'
      ? '<div class="thinking" role="status"><span></span><span></span><span></span><span>The assistant reads your experience…</span></div>' : '';
    const conversation = this.messages.length ? this.messages.map((message, index) => this.message(message, index)).join('') + thinking
      + (off ? '<div class="assistant-off" role="status">The assistant is not available at this time. You can still change and save the experience.</div>' : '') : intro;
    const quick = this.messages.length && !off ? `<div class="quick-actions" aria-label="Quick actions">${actions.map(action =>
      `<button type="button" data-action="quick" data-id="${action.id}"${this.busy ? ' disabled' : ''}><i data-icon="${action.icon}" data-size="12"></i>${action.label}</button>`).join('')}</div>` : '';
    const placeholder = off ? 'The assistant is not available' : this.awaitsFacts ? 'Type your answer…' : 'Ask the assistant to change something…';
    return `<aside class="assistant${this.sheetOpen ? ' open' : ''}" aria-label="Portfolio assistant">
      <div class="assistant-header"><span class="assistant-symbol"><i data-icon="sparkles" data-size="18"></i></span>
        <div><h2>Portfolio assistant</h2><p id="assistant-context">${Text.escape(this.contextLine())}</p></div>
        <button type="button" class="icon-button assistant-close" aria-label="Close the assistant" data-action="close-sheet"><i data-icon="x" data-size="17"></i></button></div>
      <div class="conversation" aria-live="polite">${conversation}</div>
      <div class="assistant-footer">${quick}
        <div class="composer"><textarea id="composer" rows="1" data-field="composer" aria-label="Message to the assistant" placeholder="${placeholder}"${off ? ' disabled' : ''}>${Text.escape(this.draft)}</textarea>
          <button type="button" class="send-button" aria-label="Send message" data-action="send"${!this.draft.trim() || this.busy || off ? ' disabled' : ''}><i data-icon="send" data-size="15"></i></button></div>
        <p class="assistant-note">The assistant cannot save. Only you save the changes.</p></div></aside>`;
  }

  confirmDialog() {
    const leave = this.confirm === 'leave';
    return `<div class="modal-backdrop"><section class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <h2 id="confirm-title">Discard your changes?</h2>
      <p>${leave ? 'You have unsaved changes. If you leave this page, the app does not keep them.' : 'The app restores the saved version of this experience. The conversation with the assistant also starts new.'}</p>
      <div class="actions"><button type="button" class="outline-button" data-action="confirm-no">Keep editing</button>
        <button type="button" class="primary-button" data-action="confirm-yes">Discard changes</button></div></section></div>`;
  }
}

new EditMockup(document.getElementById('view'), document.getElementById('overlay'));
