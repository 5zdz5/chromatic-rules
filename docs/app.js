(() => {
  'use strict';

  // ===== ENGINE =====
  const EMPTY = 0;
  const COLORS = [
    { id: 1, key: 'ruby', name: '赤', hex: '#e0506d', deep: '#9c2542', hi: '#ff9eb1', glow: 'rgba(224, 80, 109, 0.42)', glyph: '◆' },
    { id: 2, key: 'azure', name: '青', hex: '#3d8bfd', deep: '#1d4fb8', hi: '#9bc5ff', glow: 'rgba(61, 139, 253, 0.42)', glyph: '●' },
    { id: 3, key: 'amber', name: '金', hex: '#e2a33b', deep: '#966111', hi: '#ffdb8b', glow: 'rgba(226, 163, 59, 0.42)', glyph: '▲' },
    { id: 4, key: 'violet', name: '紫', hex: '#9a6cf5', deep: '#5a2eae', hi: '#d0b4ff', glow: 'rgba(154, 108, 245, 0.42)', glyph: '■' },
    { id: 5, key: 'jade', name: '翠', hex: '#2fbf8f', deep: '#10714e', hi: '#92f0cd', glow: 'rgba(47, 191, 143, 0.42)', glyph: '✦' },
  ];
  const COLOR_BY_ID = {};
  for (let i = 0; i < COLORS.length; i++) COLOR_BY_ID[COLORS[i].id] = COLORS[i];

  function parseBoard(rows) {
    const h = rows.length;
    const w = rows[0].length;
    const map = { '.': 0, R: 1, B: 2, A: 3, V: 4, J: 5 };
    const cells = [];
    for (let y = 0; y < h; y++) {
      if (rows[y].length !== w) throw new Error('Row width mismatch');
      for (let x = 0; x < w; x++) cells.push(map[rows[y][x]] || 0);
    }
    return { w, h, cells };
  }

  function maxNeighbors(radius) {
    return (radius * 2 + 1) * (radius * 2 + 1) - 1;
  }

  function regionIndices(w, h, index, radius) {
    const x = index % w;
    const y = (index / w) | 0;
    const out = [];
    for (let dy = -radius; dy <= radius; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= h) continue;
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        if (nx < 0 || nx >= w) continue;
        out.push(ny * w + nx);
      }
    }
    return out;
  }

  function countColorAround(cells, w, h, index, color, radius) {
    const region = regionIndices(w, h, index, radius);
    let count = 0;
    for (let i = 0; i < region.length; i++) {
      if (cells[region[i]] === color) count++;
    }
    return count;
  }

  function countColor(cells, color) {
    let n = 0;
    for (let i = 0; i < cells.length; i++) if (cells[i] === color) n++;
    return n;
  }

  function ruleMatches(cells, w, h, index, rule) {
    if (cells[index] !== rule.subject) return false;
    return countColorAround(cells, w, h, index, rule.near, rule.radius) >= rule.min;
  }

  function simulateStep(w, h, cells, rules) {
    const vanished = new Set();
    const triggered = new Set();

    for (let i = 0; i < cells.length; i++) {
      for (let r = 0; r < rules.length; r++) {
        const rule = rules[r];
        if (!rule.enabled || rule.action !== 'vanish') continue;
        if (ruleMatches(cells, w, h, i, rule)) {
          vanished.add(i);
          triggered.add(r);
        }
      }
    }

    const claims = new Map();
    for (let i = 0; i < cells.length; i++) {
      if (vanished.has(i)) continue;
      for (let r = 0; r < rules.length; r++) {
        const rule = rules[r];
        if (!rule.enabled || rule.action !== 'spread') continue;
        if (!ruleMatches(cells, w, h, i, rule)) continue;
        triggered.add(r);
        const region = regionIndices(w, h, i, rule.radius);
        for (let k = 0; k < region.length; k++) {
          const target = region[k];
          if (cells[target] !== EMPTY || vanished.has(target) || claims.has(target)) continue;
          claims.set(target, cells[i]);
        }
      }
    }

    const next = cells.slice();
    vanished.forEach((index) => { next[index] = EMPTY; });
    claims.forEach((color, index) => { next[index] = color; });
    return { cells: next, vanished: vanished.size, spread: claims.size, triggered: triggered.size };
  }

  function objectivesMet(cells, objectives) {
    for (let i = 0; i < objectives.length; i++) {
      const objective = objectives[i];
      const current = countColor(cells, objective.color);
      if (objective.type === 'clear') {
        if (current !== 0) return false;
      } else if (current < objective.n) {
        return false;
      }
    }
    return true;
  }

  function objectiveProgress(level, board, objective) {
    const current = countColor(board, objective.color);
    if (objective.type === 'clear') {
      const initial = countColor(level.cells, objective.color) || 1;
      return { current, target: 0, done: current === 0, ratio: Math.max(0, Math.min(1, 1 - current / initial)) };
    }
    return { current, target: objective.n, done: current >= objective.n, ratio: Math.max(0, Math.min(1, current / objective.n)) };
  }

  const LEVELS = [
    {
      id: 'first', campaign: true, name: '初焰', brief: '赤色围住了青色核心。让青色生长，把赤色排出棋盘。',
      hint: '让青色自行扩张，同时让赤色在接触青色时退场。\n配方：赤色 → 消失（半径 1 · 至少 1 个青色）＋ 青色 → 增殖（半径 1 · 至少 1 个青色）。',
      limit: 8, ruleLimit: 2, objectives: [{ type: 'clear', color: 1 }],
      ...parseBoard([
        '............', '............', '...RRRRRR...', '...RRRRRR...', '...RRBBRR...',
        '...RRBBRR...', '...RRRRRR...', '...RRRRRR...', '............',
      ]),
    },
    {
      id: 'overgrowth', campaign: true, name: '蔓延', brief: '翠色种子被困在紫色围墙里。建立一条可持续的增殖链。',
      hint: '先让翠色形成稳定核心，再清除挡路的紫色。\n配方：翠色 → 增殖（半径 1 · 至少 1 个翠色）＋ 紫色 → 消失（半径 1 · 至少 1 个翠色）。目标为 72 个翠色。',
      limit: 6, ruleLimit: 2, objectives: [{ type: 'atLeast', color: 5, n: 72 }],
      ...parseBoard([
        '............', '....JJ......', '....JJ......', '..VVVVVVVV..', '..V......V..',
        '..V..JJ..V..', '..VVVVVVVV..', '............', '............',
      ]),
    },
    {
      id: 'twofronts', campaign: true, name: '双前线', brief: '两片失控色域同时出现。用四条规则，在两个前线完成清除。',
      hint: '两片前线可以共用相同的规则形状。\n配方：赤色 → 消失（邻青）、青色 → 增殖（邻青）；紫色 → 消失（邻金）、金色 → 增殖（邻金）。',
      limit: 7, ruleLimit: 4,
      objectives: [{ type: 'clear', color: 1 }, { type: 'clear', color: 4 }, { type: 'atLeast', color: 5, n: 8 }],
      ...parseBoard([
        '..............', '..RRRRRR......', '..RRRRRR......', '..RRBBRR...VVV', '..RRBBRR..VAAV',
        '..RRRRRR..VAAV', '..RRRRRR...VVV', '..JJJJ........', '..JJJJ........', '..............',
      ]),
    },
    {
      id: 'critical', campaign: true, name: '临界', brief: '赤色边框封住了两种颜色。它们会争夺每一格空位。',
      hint: '两种颜色会争夺空位。让规则顺序服务于目标数量。\n配方：赤色 → 消失（邻青 / 邻翠）、青色 → 增殖（邻青）、翠色 → 增殖（邻翠）。',
      limit: 10, ruleLimit: 4,
      objectives: [{ type: 'clear', color: 1 }, { type: 'atLeast', color: 2, n: 45 }, { type: 'atLeast', color: 5, n: 45 }],
      ...parseBoard([
        'RRRRRRRRRRRR', 'R..........R', 'R..BB......R', 'R..BB...JJ.R', 'R.......JJ.R',
        'R..........R', 'R..........R', 'R..........R', 'RRRRRRRRRRRR',
      ]),
    },
    {
      id: 'sandbox', campaign: false, name: '沙盒', brief: '随意绘制色块、编写规则，观察演化。没有胜负，也没有步数限制。',
      hint: '点击色块绘制图案，再添加规则观察它如何演化。\n提示：增殖只会填入空格；空位冲突时排在前面的规则优先。',
      limit: 0, ruleLimit: 6, objectives: [],
      ...parseBoard([
        '..............', '...RR....BB...', '...RR....BB...', '......AA......', '......AA......',
        '...VV....JJ...', '...VV....JJ...', '..............', '..............', '..............',
      ]),
    },
  ];

  // ===== STATE =====
  const PROGRESS_KEY = 'chromatic-rules.pages.progress.v1';
  const THEME_KEY = 'chromatic-rules.pages.theme.v1';

  const state = {
    levelIndex: 0,
    board: LEVELS[0].cells.slice(),
    rules: [],
    gen: 0,
    running: false,
    speed: 620,
    result: null,
    lastStep: null,
    completed: loadProgress(),
    paintColor: 1,
    previewRuleId: null,
    seq: 1,
  };

  let timer = null;
  let els = {};

  const currentLevel = () => LEVELS[state.levelIndex];
  const isSandbox = () => !currentLevel().campaign;

  function loadProgress() {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.completed) return {};
      const clean = {};
      Object.keys(parsed.completed).forEach((key) => {
        const value = parsed.completed[key];
        if (typeof value === 'number' && Number.isFinite(value) && value > 0) clean[key] = Math.floor(value);
      });
      return clean;
    } catch (error) {
      return {};
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({ v: 1, completed: state.completed }));
    } catch (error) { /* optional */ }
  }

  function recordWin(level, gens) {
    const previous = state.completed[level.id];
    if (previous && previous <= gens) return;
    state.completed[level.id] = gens;
    saveProgress();
  }

  // ===== RENDERING HELPERS =====
  function dotHTML(color) {
    const c = COLOR_BY_ID[color];
    return `<span class="dot" style="--dot:${c.hex};--dot-deep:${c.deep};--dot-hi:${c.hi};--dot-glow:${c.glow}" aria-hidden="true"></span>`;
  }

  function swatchStyle(c) {
    return `background:linear-gradient(145deg, ${c.hi}, ${c.hex} 46%, ${c.deep})`;
  }

  function countText(n) {
    return String(n);
  }

  function renderLevels() {
    const campaign = LEVELS.filter((level) => level.campaign);
    const done = campaign.filter((level) => state.completed[level.id]).length;
    els.progressLabel.textContent = `已完成 ${done} / ${campaign.length}`;
    els.levels.innerHTML = LEVELS.map((level, index) => {
      const isDone = Boolean(state.completed[level.id]);
      const active = index === state.levelIndex;
      return `
        <button type="button" class="level${active ? ' is-active' : ''}" data-action="level" data-level="${index}" aria-current="${active ? 'page' : 'false'}">
          <span class="level-num">${level.campaign ? String(index + 1).padStart(2, '0') : '∞'}</span>
          <span class="level-name">${level.name}</span>
          ${isDone ? '<span class="level-check" aria-hidden="true">✓</span>' : ''}
        </button>`;
    }).join('');
  }

  function computePreview() {
    if (state.previewRuleId === null) return null;
    const level = currentLevel();
    const rule = state.rules.find((item) => item.id === state.previewRuleId);
    if (!rule || !rule.enabled) return null;
    const sources = new Set();
    const targets = new Set();
    for (let i = 0; i < state.board.length; i++) {
      if (!ruleMatches(state.board, level.w, level.h, i, rule)) continue;
      sources.add(i);
      if (rule.action !== 'spread') continue;
      const region = regionIndices(level.w, level.h, i, rule.radius);
      for (let k = 0; k < region.length; k++) {
        if (state.board[region[k]] === EMPTY) targets.add(region[k]);
      }
    }
    return { sources, targets, color: COLOR_BY_ID[rule.subject] };
  }

  function syncBoard(forceRebuild) {
    const level = currentLevel();
    const preview = computePreview();
    const rebuild = forceRebuild || els.board.dataset.level !== level.id || els.board.children.length !== state.board.length;

    if (rebuild) {
      els.board.innerHTML = '';
      els.board.dataset.level = level.id;
      els.board.style.gridTemplateColumns = `repeat(${level.w}, minmax(0, 1fr))`;
      for (let i = 0; i < state.board.length; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = String(i);
        cell.setAttribute('role', 'gridcell');
        els.board.appendChild(cell);
      }
    }

    const sandbox = isSandbox();
    for (let i = 0; i < state.board.length; i++) {
      const cell = els.board.children[i];
      const color = state.board[i];
      const c = COLOR_BY_ID[color];
      const isSource = Boolean(preview && preview.sources.has(i));
      const isTarget = Boolean(preview && preview.targets.has(i));
      const classes = ['cell'];
      if (sandbox) classes.push('is-clickable');
      if (isSource) classes.push('is-preview-source');
      if (isTarget) classes.push('is-preview-target');
      cell.className = classes.join(' ');

      if (c) {
        cell.style.setProperty('--piece', c.hex);
        cell.style.setProperty('--piece-deep', c.deep);
        cell.style.setProperty('--piece-hi', c.hi);
        cell.style.setProperty('--piece-glow', c.glow);
      } else {
        cell.style.removeProperty('--piece');
        cell.style.removeProperty('--piece-deep');
        cell.style.removeProperty('--piece-hi');
        cell.style.removeProperty('--piece-glow');
      }

      const isNew = rebuild || cell.dataset.color !== String(color);
      let html = '';
      if (c) {
        html += `<span class="piece${isNew ? ' is-new' : ''}"><span class="glyph">${c.glyph}</span></span>`;
      }
      if (isTarget && preview) {
        html += `<span class="ghost" style="background:${preview.color.hex};color:${preview.color.hex}"></span>`;
      }
      cell.innerHTML = html;
      cell.dataset.color = String(color);
      cell.setAttribute('aria-label', c ? c.name : '空');
    }

    els.board.classList.toggle('is-win', state.result === 'win');
    els.board.classList.toggle('is-lose', state.result === 'lose');
  }

  function renderMission() {
    const level = currentLevel();
    const details = els.mission.querySelector('details');
    const wasOpen = details ? details.open : false;
    const best = state.completed[level.id];

    let objectivesHTML = '';
    if (level.objectives.length) {
      objectivesHTML = `<div class="objectives">${level.objectives.map((objective) => {
        const c = COLOR_BY_ID[objective.color];
        const progress = objectiveProgress(level, state.board, objective);
        const count = progress.done
          ? '✓'
          : objective.type === 'clear'
            ? `${progress.current} → 0`
            : `${progress.current} / ${progress.target}`;
        return `
          <div class="objective${progress.done ? ' is-done' : ''}">
            <div class="objective-top">
              ${dotHTML(c.id)}
              <span class="objective-name">${objective.type === 'clear' ? `${c.name}归零` : `${c.name} ≥ ${objective.n}`}</span>
              <span class="objective-count">${count}</span>
            </div>
            <div class="objective-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress.ratio * 100)}">
              <span class="objective-fill" style="width:${Math.round(progress.ratio * 100)}%;background:${c.hex}"></span>
            </div>
          </div>`;
      }).join('')}</div>`;
    } else {
      objectivesHTML = `<div class="sandbox-note">${level.brief}</div>`;
    }

    els.mission.innerHTML = `
      <div class="accent" aria-hidden="true"></div>
      <div class="card-pad">
        <p class="kicker">任务目标</p>
        <h2 class="section-title">${level.name}</h2>
        <p class="brief">${level.brief}</p>
        ${objectivesHTML}
        <div class="meta">
          ${level.campaign ? `<span class="meta-chip">步数上限 · ${level.limit}</span>` : '<span class="meta-chip">无步数限制</span>'}
          <span class="meta-chip">规则上限 · ${level.ruleLimit}</span>
          ${best ? `<span class="meta-chip meta-best">最佳 ${best} 代</span>` : ''}
        </div>
        <details class="hint"${wasOpen ? ' open' : ''}>
          <summary><span class="hint-icon" aria-hidden="true">◇</span>查看提示</summary>
          <div class="hint-body">${level.hint}</div>
        </details>
      </div>`;
  }

  function swatchesHTML(rule, field, value) {
    return `<div class="swatches" role="group" aria-label="${field === 'subject' ? '主体' : '邻色'}">${COLORS.map((c) => `
      <button type="button" class="swatch" data-action="rule-${field}" data-rule-id="${rule.id}" data-value="${c.id}"
        aria-pressed="${value === c.id}" title="${c.name}" aria-label="${c.name}" style="${swatchStyle(c)}"></button>`).join('')}</div>`;
  }

  function renderRules() {
    const level = currentLevel();
    const rules = state.rules;
    const canAdd = rules.length < level.ruleLimit;

    const cards = rules.map((rule, index) => {
      const subject = COLOR_BY_ID[rule.subject];
      const near = COLOR_BY_ID[rule.near];
      const max = maxNeighbors(rule.radius);
      return `
        <article class="rule${rule.enabled ? '' : ' is-off'}" data-rule-id="${rule.id}">
          <div class="rule-head">
            <span class="rule-no">#${String(index + 1).padStart(2, '0')}</span>
            <div class="rule-summary">
              ${dotHTML(subject.id)}<span class="rule-name">${subject.name}</span>
              <span class="rule-action act-${rule.action}">${rule.action === 'vanish' ? '消失' : '增殖'}</span>
              <span class="summary-sep">·</span><span class="rule-meta">R${rule.radius}</span>
              <span class="summary-sep">·</span><span class="rule-meta">≥${rule.min}</span>
              ${dotHTML(near.id)}<span class="rule-name">${near.name}</span>
            </div>
            <div class="rule-tools">
              <button type="button" class="icon-btn" data-action="rule-up" data-rule-id="${rule.id}" aria-label="上移规则" title="上移规则" ${index === 0 ? 'disabled' : ''}>↑</button>
              <button type="button" class="icon-btn" data-action="rule-down" data-rule-id="${rule.id}" aria-label="下移规则" title="下移规则" ${index === rules.length - 1 ? 'disabled' : ''}>↓</button>
              <button type="button" class="switch" role="switch" aria-checked="${rule.enabled}" aria-label="${rule.enabled ? '停用规则' : '启用规则'}" data-action="rule-toggle" data-rule-id="${rule.id}"><span class="switch-knob"></span></button>
              <button type="button" class="icon-btn is-danger" data-action="rule-remove" data-rule-id="${rule.id}" aria-label="删除规则" title="删除规则">×</button>
            </div>
          </div>
          <div class="rule-controls">
            <div class="field"><span class="field-label">主体</span>${swatchesHTML(rule, 'subject', rule.subject)}</div>
            <div class="field"><span class="field-label">动作</span><div class="seg" role="group" aria-label="动作">
              <button type="button" class="act-vanish" data-action="rule-action" data-rule-id="${rule.id}" data-value="vanish" aria-pressed="${rule.action === 'vanish'}">消失</button>
              <button type="button" class="act-spread" data-action="rule-action" data-rule-id="${rule.id}" data-value="spread" aria-pressed="${rule.action === 'spread'}">增殖</button>
            </div></div>
            <div class="field field-condition">
              <span class="field-label">条件</span>
              <div class="seg seg-radius" role="group" aria-label="半径">
                ${[1, 2, 3].map((r) => `<button type="button" data-action="rule-radius" data-rule-id="${rule.id}" data-value="${r}" aria-pressed="${rule.radius === r}" title="${maxNeighbors(r)} 格">R${r}</button>`).join('')}
              </div>
              <span class="field-caption">至少</span>
              <div class="stepper">
                <button type="button" data-action="rule-min-dec" data-rule-id="${rule.id}" aria-label="减少阈值" ${rule.min <= 1 ? 'disabled' : ''}>−</button>
                <span>${rule.min}</span>
                <button type="button" data-action="rule-min-inc" data-rule-id="${rule.id}" aria-label="增加阈值" ${rule.min >= max ? 'disabled' : ''}>+</button>
              </div>
              <span class="field-caption">邻色</span>
              ${swatchesHTML(rule, 'near', rule.near)}
              <span class="area-note">${max} 格</span>
            </div>
          </div>
        </article>`;
    }).join('');

    els.rules.innerHTML = `
      <div class="section-head">
        <h2 class="rules-title">规则组合</h2>
        <span class="count-pill">${rules.length} / ${level.ruleLimit}</span>
      </div>
      ${rules.length ? `<div class="rule-list">${cards}</div>` : '<div class="empty-rules">还没有规则。添加一条法则，再按下演算。</div>'}
      <button type="button" class="add-rule" data-action="add-rule" ${canAdd ? '' : 'disabled'}>${canAdd ? '+ 添加规则' : '规则槽已满'}</button>
      <div class="rule-notes">
        <p>同代规则同时结算；同一格若同时消失与增殖，消失优先。空位冲突按规则顺序归属。</p>
        <p class="rule-reset-note">${level.campaign ? '修改规则会重置本轮棋盘。' : '沙盒中的规则修改会立即作用在下一轮。'}</p>
      </div>`;

    els.rules.querySelectorAll('.rule').forEach((card) => {
      const id = card.dataset.ruleId;
      const enter = () => {
        if (state.previewRuleId === id) return;
        state.previewRuleId = id;
        els.rules.querySelectorAll('.rule').forEach((item) => item.classList.toggle('is-preview', item.dataset.ruleId === id));
        syncBoard(false);
      };
      const leave = () => {
        if (state.previewRuleId !== id) return;
        state.previewRuleId = null;
        card.classList.remove('is-preview');
        syncBoard(false);
      };
      card.addEventListener('pointerenter', enter);
      card.addEventListener('pointerleave', leave);
      card.addEventListener('focusin', enter);
      card.addEventListener('focusout', (event) => {
        if (!card.contains(event.relatedTarget)) leave();
      });
    });
  }

  function renderLegend() {
    els.legend.innerHTML = `<span class="legend-label">色块存量</span>${COLORS.map((c) => {
      const n = countColor(state.board, c.id);
      return `<span class="legend-item${n === 0 ? ' is-empty' : ''}">${dotHTML(c.id)}<span class="legend-name">${c.name}</span><span class="legend-count">${n}</span></span>`;
    }).join('')}`;
  }

  function renderPaintbar() {
    if (!isSandbox()) {
      els.paintbar.hidden = true;
      els.paintbar.innerHTML = '';
      return;
    }
    els.paintbar.hidden = false;
    els.paintbar.innerHTML = `
      <span class="paint-label">绘制</span>
      ${COLORS.map((c) => `<button type="button" class="paint-swatch" data-action="paint-color" data-value="${c.id}" aria-pressed="${state.paintColor === c.id}" aria-label="${c.name}" title="${c.name}" style="${swatchStyle(c)}"></button>`).join('')}
      <button type="button" class="paint-eraser" data-action="paint-color" data-value="0" aria-pressed="${state.paintColor === 0}">橡皮擦</button>
      <button type="button" class="clear-canvas" data-action="clear-canvas">清空画布</button>
      <span class="paint-hint">点击格子绘制；右键可擦除。</span>`;
  }

  function renderStatus() {
    const level = currentLevel();
    let kind = 'idle';
    let text = '待演算';
    if (state.result === 'win') { kind = 'win'; text = '目标达成'; }
    else if (state.result === 'lose') { kind = 'lose'; text = '步数用尽'; }
    else if (state.running) { kind = 'running'; text = '演化中'; }
    else if (state.lastStep && state.lastStep.vanished === 0 && state.lastStep.spread === 0) { kind = 'stable'; text = '静止'; }

    els.status.dataset.kind = kind;
    els.statusText.textContent = text;
    els.genPill.textContent = `第 ${state.gen} 代`;
    els.stepPill.textContent = level.limit > 0 ? `${state.gen} / ${level.limit} 步` : '无步数限制';
    els.board.classList.toggle('is-win', state.result === 'win');
    els.board.classList.toggle('is-lose', state.result === 'lose');
  }

  function renderStepStrip() {
    if (!state.lastStep) {
      els.stepStrip.textContent = '等待第一次演算。';
      return;
    }
    if (state.lastStep.vanished === 0 && state.lastStep.spread === 0) {
      els.stepStrip.textContent = '规则已静止：这一代没有任何格变化。';
      return;
    }
    els.stepStrip.textContent = `本代 · ${state.lastStep.vanished} 格消失 · ${state.lastStep.spread} 格增殖 · ${state.lastStep.triggered} 条规则触发`;
  }

  function renderControls() {
    const level = currentLevel();
    const limitReached = level.limit > 0 && state.gen >= level.limit;
    els.stepButton.disabled = Boolean(state.result) || limitReached;
    els.autoButton.disabled = Boolean(state.result);
    els.autoButton.classList.toggle('is-active', state.running);
    els.autoLabel.textContent = state.running ? '暂停' : '自动演化';
  }

  function renderResult() {
    if (!state.result) {
      els.result.innerHTML = '';
      return;
    }
    const level = currentLevel();
    const isWin = state.result === 'win';
    const hasNext = state.levelIndex < LEVELS.length - 1;
    const nextLabel = state.levelIndex === LEVELS.length - 2 ? '进入沙盒' : '下一关';
    const actions = [];
    if (isWin && hasNext) actions.push(`<button type="button" class="button primary" data-action="next">${nextLabel}</button>`);
    if (!isWin) actions.push('<button type="button" class="button primary" data-action="reset">重新演算</button>');
    actions.push(`<button type="button" class="button" data-action="reset">${isWin ? '再演一次' : '重置棋盘'}</button>`);
    els.result.innerHTML = `
      <div class="result ${isWin ? 'is-win' : 'is-lose'}" role="status">
        <span class="result-icon" aria-hidden="true">${isWin ? '✓' : '!'}</span>
        <div class="result-copy">
          <strong>${isWin ? '规则成立' : '未达成目标'}</strong>
          <span>${isWin ? `以 ${state.gen} 代完成目标。` : '步数用尽。调整规则或阈值，再演算一次。'}</span>
        </div>
        <div class="result-actions">${actions.join('')}</div>
      </div>`;
    void level;
  }

  function renderAll(forceBoard) {
    const level = currentLevel();
    renderLevels();
    els.progressLabel.textContent = (() => {
      const campaign = LEVELS.filter((item) => item.campaign);
      const done = campaign.filter((item) => state.completed[item.id]).length;
      return `已完成 ${done} / ${campaign.length}`;
    })();
    els.levelTitle.innerHTML = `${level.name}<span class="board-index">${level.campaign ? String(state.levelIndex + 1).padStart(2, '0') : '∞'}</span>`;
    renderBoard(forceBoard);
    renderMission();
    renderRules();
    renderLegend();
    renderPaintbar();
    renderStatus();
    renderControls();
    renderResult();
    renderStepStrip();
  }

  function renderBoard(forceBoard) {
    syncBoard(forceBoard);
  }

  // ===== ACTIONS =====
  function clearTimer() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function schedule() {
    clearTimer();
    if (!state.running || state.result) return;
    timer = setTimeout(() => {
      timer = null;
      advance();
      if (state.running && !state.result) schedule();
    }, state.speed);
  }

  function stopAuto() {
    state.running = false;
    clearTimer();
    renderControls();
    renderStatus();
  }

  function advance() {
    if (state.result) return;
    const level = currentLevel();
    const outcome = simulateStep(level.w, level.h, state.board, state.rules);
    const nextGeneration = state.gen + 1;
    state.board = outcome.cells;
    state.gen = nextGeneration;
    state.lastStep = {
      vanished: outcome.vanished,
      spread: outcome.spread,
      triggered: outcome.triggered,
    };
    if (outcome.vanished === 0 && outcome.spread === 0) state.running = false;

    if (level.objectives.length > 0 && objectivesMet(outcome.cells, level.objectives)) {
      state.result = 'win';
      state.running = false;
      clearTimer();
      recordWin(level, nextGeneration);
      renderLevels();
    } else if (level.limit > 0 && nextGeneration >= level.limit) {
      state.result = 'lose';
      state.running = false;
      clearTimer();
    }

    syncBoard(false);
    renderLegend();
    renderMission();
    renderStatus();
    renderControls();
    renderResult();
    renderStepStrip();
  }

  function manualStep() {
    if (state.result) return;
    advance();
    if (state.running && !state.result) schedule();
  }

  function resetRun() {
    const level = currentLevel();
    clearTimer();
    state.running = false;
    state.board = level.cells.slice();
    state.gen = 0;
    state.result = null;
    state.lastStep = null;
    state.previewRuleId = null;
    renderAll(true);
  }

  function selectLevel(index) {
    if (index === state.levelIndex) return;
    clearTimer();
    state.levelIndex = index;
    state.running = false;
    state.board = LEVELS[index].cells.slice();
    state.rules = [];
    state.gen = 0;
    state.result = null;
    state.lastStep = null;
    state.previewRuleId = null;
    state.paintColor = 1;
    renderAll(true);
  }

  function commitRules(nextRules) {
    const level = currentLevel();
    state.rules = nextRules;
    state.previewRuleId = null;
    state.running = false;
    clearTimer();
    state.lastStep = null;
    state.result = null;
    if (level.campaign) {
      state.board = level.cells.slice();
      state.gen = 0;
    }
    syncBoard(level.campaign);
    renderRules();
    renderLegend();
    renderMission();
    renderPaintbar();
    renderStatus();
    renderControls();
    renderResult();
    renderStepStrip();
  }

  function addRule() {
    const level = currentLevel();
    if (state.rules.length >= level.ruleLimit) return;
    const counts = {};
    for (let i = 0; i < level.cells.length; i++) {
      const color = level.cells[i];
      if (color) counts[color] = (counts[color] || 0) + 1;
    }
    const ranked = COLORS.map((c) => c.id)
      .filter((id) => counts[id])
      .sort((a, b) => (counts[b] || 0) - (counts[a] || 0));
    const baseSubject = ranked[0] || 1;
    const baseNear = ranked.find((id) => id !== baseSubject) || baseSubject;
    const spread = state.rules.length % 2 === 1;
    const previous = state.rules[state.rules.length - 1];
    const subject = spread ? (previous ? previous.near : baseNear) : baseSubject;
    const near = spread ? subject : baseNear;
    commitRules(state.rules.concat({
      id: `rule-${state.seq++}`,
      enabled: true,
      action: spread ? 'spread' : 'vanish',
      subject,
      near,
      radius: 1,
      min: 1,
    }));
  }

  function updateRule(id, patch) {
    commitRules(state.rules.map((rule) => (rule.id === id ? Object.assign({}, rule, patch) : rule)));
  }

  function findRule(id) {
    return state.rules.find((rule) => rule.id === id);
  }

  function moveRule(id, direction) {
    const index = state.rules.findIndex((rule) => rule.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= state.rules.length) return;
    const next = state.rules.slice();
    const moved = next.splice(index, 1)[0];
    next.splice(target, 0, moved);
    commitRules(next);
  }

  function paintCell(index, color) {
    if (!isSandbox() || state.board[index] === color) return;
    state.running = false;
    clearTimer();
    const next = state.board.slice();
    next[index] = color;
    state.board = next;
    state.gen = 0;
    state.result = null;
    state.lastStep = null;
    syncBoard(false);
    renderLegend();
    renderMission();
    renderStatus();
    renderControls();
    renderResult();
    renderStepStrip();
  }

  function clearCanvas() {
    if (!isSandbox()) return;
    state.running = false;
    clearTimer();
    state.board = new Array(currentLevel().w * currentLevel().h).fill(0);
    state.gen = 0;
    state.result = null;
    state.lastStep = null;
    syncBoard(true);
    renderLegend();
    renderMission();
    renderStatus();
    renderControls();
    renderResult();
    renderStepStrip();
  }

  function handleAction(event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    const ruleId = target.dataset.ruleId;

    if (action === 'level') {
      selectLevel(Number(target.dataset.level));
      return;
    }
    if (action === 'theme') {
      toggleTheme();
      return;
    }
    if (action === 'step') {
      manualStep();
      return;
    }
    if (action === 'auto') {
      if (state.result) return;
      state.running = !state.running;
      if (state.running) schedule();
      else clearTimer();
      renderControls();
      renderStatus();
      return;
    }
    if (action === 'reset') {
      resetRun();
      return;
    }
    if (action === 'next') {
      if (state.levelIndex < LEVELS.length - 1) selectLevel(state.levelIndex + 1);
      return;
    }
    if (action === 'add-rule') {
      addRule();
      return;
    }
    if (action === 'paint-color') {
      state.paintColor = Number(target.dataset.value);
      renderPaintbar();
      return;
    }
    if (action === 'clear-canvas') {
      clearCanvas();
      return;
    }

    const rule = ruleId ? findRule(ruleId) : null;
    if (!rule) return;

    if (action === 'rule-remove') {
      commitRules(state.rules.filter((item) => item.id !== rule.id));
    } else if (action === 'rule-toggle') {
      updateRule(rule.id, { enabled: !rule.enabled });
    } else if (action === 'rule-up') {
      moveRule(rule.id, -1);
    } else if (action === 'rule-down') {
      moveRule(rule.id, 1);
    } else if (action === 'rule-subject') {
      updateRule(rule.id, { subject: Number(target.dataset.value) });
    } else if (action === 'rule-near') {
      updateRule(rule.id, { near: Number(target.dataset.value) });
    } else if (action === 'rule-action') {
      updateRule(rule.id, { action: target.dataset.value });
    } else if (action === 'rule-radius') {
      const radius = Number(target.dataset.value);
      updateRule(rule.id, { radius, min: Math.min(rule.min, maxNeighbors(radius)) });
    } else if (action === 'rule-min-dec') {
      updateRule(rule.id, { min: Math.max(1, rule.min - 1) });
    } else if (action === 'rule-min-inc') {
      updateRule(rule.id, { min: Math.min(maxNeighbors(rule.radius), rule.min + 1) });
    }
  }

  // ===== THEME =====
  function readTheme() {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch (error) { /* optional */ }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    return 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = theme === 'dark' ? '☾' : '☀';
    const button = document.getElementById('theme-toggle');
    if (button) button.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (error) { /* optional */ }
  }

  // ===== INIT =====
  function init() {
    els = {
      levels: document.getElementById('levels'),
      progressLabel: document.getElementById('progress-label'),
      levelTitle: document.getElementById('level-title'),
      status: document.getElementById('status'),
      statusText: document.getElementById('status-text'),
      genPill: document.getElementById('gen-pill'),
      stepPill: document.getElementById('step-pill'),
      result: document.getElementById('result'),
      board: document.getElementById('board'),
      stepStrip: document.getElementById('step-strip'),
      legend: document.getElementById('legend'),
      paintbar: document.getElementById('paintbar'),
      mission: document.getElementById('mission'),
      rules: document.getElementById('rules'),
      stepButton: document.getElementById('step-button'),
      autoButton: document.getElementById('auto-button'),
      autoLabel: document.getElementById('auto-label'),
      speed: document.getElementById('speed'),
    };

    applyTheme(readTheme());

    document.querySelector('.page').addEventListener('click', handleAction);
    els.board.addEventListener('click', (event) => {
      const cell = event.target.closest('.cell');
      if (!cell || !isSandbox()) return;
      paintCell(Number(cell.dataset.index), state.paintColor);
    });
    els.board.addEventListener('contextmenu', (event) => {
      const cell = event.target.closest('.cell');
      if (!cell || !isSandbox()) return;
      event.preventDefault();
      paintCell(Number(cell.dataset.index), 0);
    });
    els.speed.addEventListener('input', (event) => {
      state.speed = Number(event.target.value);
      if (state.running) schedule();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && state.running) stopAuto();
    });

    renderAll(true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
