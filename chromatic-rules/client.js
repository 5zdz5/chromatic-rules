window.__ModuleLoader__.load({
  id: '@local/chromatic-rules',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    // ===== ENGINE START =====
    const EMPTY = 0;

    const COLORS = [
      { id: 1, key: 'ruby', hex: '#e0506d', deep: '#9c2542', hi: '#ff9eb1', glow: 'rgba(224, 80, 109, 0.42)', glyph: '◆' },
      { id: 2, key: 'azure', hex: '#3d8bfd', deep: '#1d4fb8', hi: '#9bc5ff', glow: 'rgba(61, 139, 253, 0.42)', glyph: '●' },
      { id: 3, key: 'amber', hex: '#e2a33b', deep: '#966111', hi: '#ffdb8b', glow: 'rgba(226, 163, 59, 0.42)', glyph: '▲' },
      { id: 4, key: 'violet', hex: '#9a6cf5', deep: '#5a2eae', hi: '#d0b4ff', glow: 'rgba(154, 108, 245, 0.42)', glyph: '■' },
      { id: 5, key: 'jade', hex: '#2fbf8f', deep: '#10714e', hi: '#92f0cd', glow: 'rgba(47, 191, 143, 0.42)', glyph: '✦' },
    ];

    const COLOR_BY_ID = {};
    for (let ci = 0; ci < COLORS.length; ci++) COLOR_BY_ID[COLORS[ci].id] = COLORS[ci];

    function parseBoard(rows) {
      const height = rows.length;
      const width = rows[0].length;
      const map = { '.': 0, R: 1, B: 2, A: 3, V: 4, J: 5 };
      const cells = [];
      for (let y = 0; y < height; y++) {
        if (rows[y].length !== width) throw new Error('Row width mismatch at ' + y);
        for (let x = 0; x < width; x++) cells.push(map[rows[y][x]] || 0);
      }
      return { w: width, h: height, cells: cells };
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
      vanished.forEach(function (index) { next[index] = EMPTY; });
      claims.forEach(function (color, index) { next[index] = color; });

      return {
        cells: next,
        vanished: vanished.size,
        spread: claims.size,
        triggered: triggered.size,
      };
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
        return {
          current: current,
          target: 0,
          done: current === 0,
          ratio: Math.max(0, Math.min(1, 1 - current / initial)),
        };
      }
      return {
        current: current,
        target: objective.n,
        done: current >= objective.n,
        ratio: Math.max(0, Math.min(1, current / objective.n)),
      };
    }

    const LEVEL_FIRST = {
      id: 'first',
      campaign: true,
      nameKey: 'level.first.name',
      briefKey: 'level.first.brief',
      hintKey: 'hint.first',
      limit: 8,
      ruleLimit: 2,
      objectives: [{ type: 'clear', color: 1 }],
      ...parseBoard([
        '............',
        '............',
        '...RRRRRR...',
        '...RRRRRR...',
        '...RRBBRR...',
        '...RRBBRR...',
        '...RRRRRR...',
        '...RRRRRR...',
        '............',
      ]),
    };

    const LEVEL_OVERGROWTH = {
      id: 'overgrowth',
      campaign: true,
      nameKey: 'level.overgrowth.name',
      briefKey: 'level.overgrowth.brief',
      hintKey: 'hint.overgrowth',
      limit: 6,
      ruleLimit: 2,
      objectives: [{ type: 'atLeast', color: 5, n: 72 }],
      ...parseBoard([
        '............',
        '....JJ......',
        '....JJ......',
        '..VVVVVVVV..',
        '..V......V..',
        '..V..JJ..V..',
        '..VVVVVVVV..',
        '............',
        '............',
      ]),
    };

    const LEVEL_TWO_FRONTS = {
      id: 'twofronts',
      campaign: true,
      nameKey: 'level.twofronts.name',
      briefKey: 'level.twofronts.brief',
      hintKey: 'hint.twofronts',
      limit: 7,
      ruleLimit: 4,
      objectives: [
        { type: 'clear', color: 1 },
        { type: 'clear', color: 4 },
        { type: 'atLeast', color: 5, n: 8 },
      ],
      ...parseBoard([
        '..............',
        '..RRRRRR......',
        '..RRRRRR......',
        '..RRBBRR...VVV',
        '..RRBBRR..VAAV',
        '..RRRRRR..VAAV',
        '..RRRRRR...VVV',
        '..JJJJ........',
        '..JJJJ........',
        '..............',
      ]),
    };

    const LEVEL_CRITICAL = {
      id: 'critical',
      campaign: true,
      nameKey: 'level.critical.name',
      briefKey: 'level.critical.brief',
      hintKey: 'hint.critical',
      limit: 10,
      ruleLimit: 4,
      objectives: [
        { type: 'clear', color: 1 },
        { type: 'atLeast', color: 2, n: 45 },
        { type: 'atLeast', color: 5, n: 45 },
      ],
      ...parseBoard([
        'RRRRRRRRRRRR',
        'R..........R',
        'R..BB......R',
        'R..BB...JJ.R',
        'R.......JJ.R',
        'R..........R',
        'R..........R',
        'R..........R',
        'RRRRRRRRRRRR',
      ]),
    };

    const LEVEL_SANDBOX = {
      id: 'sandbox',
      campaign: false,
      nameKey: 'level.sandbox.name',
      briefKey: 'level.sandbox.brief',
      hintKey: 'sandbox.hint',
      limit: 0,
      ruleLimit: 6,
      objectives: [],
      ...parseBoard([
        '..............',
        '...RR....BB...',
        '...RR....BB...',
        '......AA......',
        '......AA......',
        '...VV....JJ...',
        '...VV....JJ...',
        '..............',
        '..............',
        '..............',
      ]),
    };

    const LEVELS = [LEVEL_FIRST, LEVEL_OVERGROWTH, LEVEL_TWO_FRONTS, LEVEL_CRITICAL, LEVEL_SANDBOX];
    // ===== ENGINE END =====

    const NS = 'chromatic-rules';
    const PROGRESS_KEY = 'dsh.chromatic-rules.progress.v1';
    const ZH = {
      nav: '色域法则',
      eyebrow: 'CHROMATIC RULES · 规则实验场',
      title: '色域法则',
      subtitle: '在彩色格阵里编写消失与增殖的法则，观察一片颜色如何生长、退场与重组。',
      levelSelect: '选择关卡',
      progress: '已完成 {done}/{total}',
      sandboxTab: '沙盒',
      'level.first.name': '初焰',
      'level.first.brief': '赤色围住了青色核心。让青色生长，把赤色排出棋盘。',
      'level.overgrowth.name': '蔓延',
      'level.overgrowth.brief': '翠色种子被困在紫色围墙里。建立一条可持续的增殖链。',
      'level.twofronts.name': '双前线',
      'level.twofronts.brief': '两片失控色域同时出现。用四条规则，在两个前线完成清除。',
      'level.critical.name': '临界',
      'level.critical.brief': '赤色边框封住了两种颜色。它们会争夺每一格空位。',
      'level.sandbox.name': '沙盒',
      'level.sandbox.brief': '随意绘制色块、编写规则，观察演化。沙盒没有胜负，也没有步数限制。',
      mission: '任务目标',
      objectiveClear: '{color}归零',
      objectiveAtLeast: '{color} ≥ {n}',
      stepLimit: '步数上限',
      ruleBudget: '规则上限',
      best: '最佳 {n} 代',
      hint: '查看提示',
      rules: '规则组合',
      addRule: '添加规则',
      rulesFull: '规则槽已满',
      emptyRules: '还没有规则。添加一条法则，再按下演算。',
      rulePriority: '同代规则同时结算；同一格若同时消失与增殖，消失优先。空位冲突按规则顺序归属。',
      ruleResetNote: '修改规则会重置本轮棋盘。',
      sandboxNote: '沙盒中的规则修改会立即作用在下一轮。',
      subject: '主体',
      action: '动作',
      condition: '条件',
      near: '邻色',
      radius: '半径',
      threshold: '至少',
      areaHint: '{n} 格',
      vanish: '消失',
      spread: '增殖',
      enabled: '启用规则',
      disabled: '停用规则',
      deleteRule: '删除规则',
      moveUp: '上移规则',
      moveDown: '下移规则',
      ruleNo: '规则 {n}',
      simulation: '演算控制',
      stepOnce: '演算 1 步',
      autoRun: '自动演化',
      pause: '暂停',
      resetBoard: '重置棋盘',
      pace: '节奏',
      slow: '慢',
      fast: '快',
      generation: '第 {n} 代',
      stepCounter: '{n} / {limit} 步',
      lastStep: '本代 · {vanish} 格消失 · {spread} 格增殖 · {rules} 条规则触发',
      lastStepNone: '等待第一次演算。',
      stable: '规则已静止：这一代没有任何格变化。',
      statusIdle: '待演算',
      statusRunning: '演化中',
      statusWin: '目标达成',
      statusLose: '步数用尽',
      statusStable: '静止',
      legend: '色块存量',
      paint: '绘制',
      eraser: '橡皮擦',
      clearCanvas: '清空画布',
      sandboxPaintHint: '点击格子绘制；右键可擦除。',
      winTitle: '规则成立',
      winBody: '以 {gen} 代完成目标。',
      loseTitle: '未达成目标',
      loseBody: '步数用尽。调整规则或阈值，再演算一次。',
      nextLevel: '下一关',
      replay: '再演一次',
      tryAgain: '重新演算',
      enterSandbox: '进入沙盒',
      allDone: '全部实验完成',
      'colors.ruby': '赤',
      'colors.azure': '青',
      'colors.amber': '金',
      'colors.violet': '紫',
      'colors.jade': '翠',
      boardAria: '彩色格阵',
      empty: '空',
      ruleConditionSummary: '{subject} {action} · R{radius} · ≥{min} {near}',
      'hint.first': '让青色自行扩张，同时让赤色在接触青色时退场。\n配方：赤色 → 消失（半径 1 · 至少 1 个青色）＋ 青色 → 增殖（半径 1 · 至少 1 个青色）。',
      'hint.overgrowth': '先让翠色形成稳定核心，再清除挡路的紫色。\n配方：翠色 → 增殖（半径 1 · 至少 1 个翠色）＋ 紫色 → 消失（半径 1 · 至少 1 个翠色）。目标为 72 个翠色。',
      'hint.twofronts': '两片前线可以共用相同的规则形状。\n配方：赤色 → 消失（邻青）、青色 → 增殖（邻青）；紫色 → 消失（邻金）、金色 → 增殖（邻金）。',
      'hint.critical': '两种颜色会争夺空位。让规则顺序服务于目标数量。\n配方：赤色 → 消失（邻青 / 邻翠）、青色 → 增殖（邻青）、翠色 → 增殖（邻翠）。',
      'sandbox.hint': '点击色块绘制图案，再添加规则观察它如何演化。\n提示：增殖只会填入空格；空位冲突时排在前面的规则优先。',
    };

    const EN = {
      nav: 'Chromatic Rules',
      eyebrow: 'CHROMATIC RULES · RULE LAB',
      title: 'Chromatic Rules',
      subtitle: 'Write vanish and spread laws for a colored lattice, then watch a palette grow, retreat, and rearrange itself.',
      levelSelect: 'Choose a level',
      progress: '{done}/{total} cleared',
      sandboxTab: 'Sandbox',
      'level.first.name': 'First Flame',
      'level.first.brief': 'Ruby has sealed an azure core. Let azure grow and push ruby off the board.',
      'level.overgrowth.name': 'Overgrowth',
      'level.overgrowth.brief': 'Jade seeds are trapped inside a violet wall. Build a lasting growth chain.',
      'level.twofronts.name': 'Two Fronts',
      'level.twofronts.brief': 'Two color territories are running wild. Clear both fronts with four rules.',
      'level.critical.name': 'Critical Mass',
      'level.critical.brief': 'A ruby border contains two colors. They will compete for every empty cell.',
      'level.sandbox.name': 'Sandbox',
      'level.sandbox.brief': 'Paint cells and compose rules freely. There is no win condition and no step limit.',
      mission: 'OBJECTIVE',
      objectiveClear: 'Clear {color}',
      objectiveAtLeast: '{color} ≥ {n}',
      stepLimit: 'Step cap',
      ruleBudget: 'Rule cap',
      best: 'Best {n} gens',
      hint: 'Show hint',
      rules: 'Rule composition',
      addRule: 'Add rule',
      rulesFull: 'Rule slots full',
      emptyRules: 'No rules yet. Add one, then run the lattice.',
      rulePriority: 'Rules resolve together. If a cell vanishes and spreads at once, vanish wins. Empty-cell conflicts follow rule order.',
      ruleResetNote: 'Editing a rule resets this run to the starting board.',
      sandboxNote: 'In the sandbox, rule edits apply to the next generation immediately.',
      subject: 'Subject',
      action: 'Action',
      condition: 'Condition',
      near: 'Alongside',
      radius: 'Radius',
      threshold: 'At least',
      areaHint: '{n} cells',
      vanish: 'Vanish',
      spread: 'Spread',
      enabled: 'Enable rule',
      disabled: 'Disable rule',
      deleteRule: 'Delete rule',
      moveUp: 'Move rule up',
      moveDown: 'Move rule down',
      ruleNo: 'Rule {n}',
      simulation: 'Simulation',
      stepOnce: 'Step once',
      autoRun: 'Auto evolve',
      pause: 'Pause',
      resetBoard: 'Reset board',
      pace: 'Pace',
      slow: 'Slow',
      fast: 'Fast',
      generation: 'Gen {n}',
      stepCounter: '{n} / {limit} steps',
      lastStep: 'This gen · {vanish} vanished · {spread} spread · {rules} rules triggered',
      lastStepNone: 'Waiting for the first step.',
      stable: 'The rules are at rest: nothing changed this generation.',
      statusIdle: 'Ready',
      statusRunning: 'Evolving',
      statusWin: 'Objective met',
      statusLose: 'Out of steps',
      statusStable: 'At rest',
      legend: 'Palette',
      paint: 'Paint',
      eraser: 'Eraser',
      clearCanvas: 'Clear canvas',
      sandboxPaintHint: 'Click a cell to paint; right-click to erase.',
      winTitle: 'Rule holds',
      winBody: 'Objective met in {gen} generations.',
      loseTitle: 'Objective missed',
      loseBody: 'The step cap ran out. Adjust a rule or threshold and try again.',
      nextLevel: 'Next level',
      replay: 'Run again',
      tryAgain: 'Try again',
      enterSandbox: 'Enter sandbox',
      allDone: 'All experiments complete',
      'colors.ruby': 'Ruby',
      'colors.azure': 'Azure',
      'colors.amber': 'Amber',
      'colors.violet': 'Violet',
      'colors.jade': 'Jade',
      boardAria: 'Colored cell lattice',
      empty: 'Empty',
      ruleConditionSummary: '{subject} {action} · R{radius} · ≥{min} {near}',
      'hint.first': 'Let azure expand on its own, and let ruby retreat whenever it touches azure.\nRecipe: Ruby → Vanish (radius 1 · at least 1 azure) + Azure → Spread (radius 1 · at least 1 azure).',
      'hint.overgrowth': 'Grow a stable jade core first, then remove the violet wall.\nRecipe: Jade → Spread (radius 1 · at least 1 jade) + Violet → Vanish (radius 1 · at least 1 jade). Target: 72 jade.',
      'hint.twofronts': 'Both fronts can share the same rule shape.\nRecipe: Ruby → Vanish (near azure), Azure → Spread (near azure); Violet → Vanish (near amber), Amber → Spread (near amber).',
      'hint.critical': 'Two colors will compete for empty space. Use rule order to serve the target counts.\nRecipe: Ruby → Vanish (near azure / near jade), Azure → Spread (near azure), Jade → Spread (near jade).',
      'sandbox.hint': 'Paint a pattern, add rules, and watch it evolve.\nTip: spread only fills empty cells; when rules claim the same cell, the earlier rule wins.',
    };

    const LOCALE_IDS = ['en', 'zh-CN', 'zh', 'zh-Hans'];
    let localeFace = null;
    let localeBinding = null;

    function formatText(text, vars) {
      if (!vars) return text;
      return String(text).replace(/\{(\w+)\}/g, function (match, key) {
        return vars[key] === undefined || vars[key] === null ? match : String(vars[key]);
      });
    }

    function activeDictionary() {
      let active = '';
      if (localeFace && typeof localeFace.getLocale === 'function') {
        try { active = localeFace.getLocale().active || ''; } catch (error) { active = ''; }
      }
      if (!active && typeof navigator !== 'undefined' && navigator.language) active = navigator.language;
      return String(active).toLowerCase().indexOf('zh') === 0 ? ZH : EN;
    }

    function translate(key, vars) {
      let text = '';
      if (localeBinding) {
        try { text = localeBinding(key); } catch (error) { text = ''; }
      }
      if (!text || text === key) {
        const dict = activeDictionary();
        text = dict[key] || EN[key] || key;
      }
      return formatText(text, vars);
    }

    function useLocaleTick() {
      const [, force] = React.useState(0);
      React.useEffect(function () {
        if (!localeFace || typeof localeFace.subscribe !== 'function') return undefined;
        return localeFace.subscribe(function () {
          force(function (value) { return value + 1; });
        });
      }, []);
    }

    function useT() {
      useLocaleTick();
      return function t(key, vars) { return translate(key, vars); };
    }

    function loadProgress() {
      try {
        if (typeof localStorage === 'undefined') return {};
        const raw = localStorage.getItem(PROGRESS_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || !parsed.completed || typeof parsed.completed !== 'object') return {};
        const clean = {};
        Object.keys(parsed.completed).forEach(function (key) {
          const value = parsed.completed[key];
          if (typeof value === 'number' && isFinite(value) && value > 0) clean[key] = Math.floor(value);
        });
        return clean;
      } catch (error) {
        return {};
      }
    }

    function saveProgress(completed) {
      try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(PROGRESS_KEY, JSON.stringify({ v: 1, completed: completed }));
      } catch (error) {
        /* Persistence is optional. */
      }
    }

    function ColorDot(props) {
      const c = COLOR_BY_ID[props.color] || COLOR_BY_ID[1];
      return h('span', {
        className: 'cr-dot' + (props.className ? ' ' + props.className : ''),
        'aria-hidden': 'true',
        style: {
          '--cr-piece': c.hex,
          '--cr-deep': c.deep,
          '--cr-hi': c.hi,
          '--cr-glow': c.glow,
        },
      });
    }

    function NavGlyph(props) {
      const size = props.size || 20;
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 64 64',
        'aria-hidden': 'true',
        style: { display: 'block', opacity: props.active ? 1 : 0.76 },
      },
        h('rect', { x: 2, y: 2, width: 60, height: 60, rx: 16, fill: '#111827' }),
        h('rect', { x: 24, y: 7, width: 16, height: 16, rx: 4, fill: '#e0506d' }),
        h('rect', { x: 7, y: 24, width: 16, height: 16, rx: 4, fill: '#e2a33b' }),
        h('rect', { x: 41, y: 24, width: 16, height: 16, rx: 4, fill: '#3d8bfd' }),
        h('rect', { x: 24, y: 41, width: 16, height: 16, rx: 4, fill: '#2fbf8f' }),
        h('rect', { x: 24, y: 24, width: 16, height: 16, rx: 4, fill: '#9a6cf5' })
      );
    }

    function ColorPicker(props) {
      const t = props.t;
      return h('div', {
        className: 'cr-swatches',
        role: 'radiogroup',
        'aria-label': props.label,
      }, COLORS.map(function (c) {
        const checked = props.value === c.id;
        return h('button', {
          key: c.id,
          type: 'button',
          role: 'radio',
          'aria-checked': checked,
          className: 'cr-swatch',
          title: t('colors.' + c.key),
          'aria-label': props.label + ': ' + t('colors.' + c.key),
          style: { background: 'linear-gradient(145deg, ' + c.hi + ', ' + c.hex + ' 46%, ' + c.deep + ')' },
          onClick: function () { props.onChange(c.id); },
        });
      }));
    }

    function ActionToggle(props) {
      const t = props.t;
      return h('div', { className: 'cr-seg', role: 'group', 'aria-label': props.label }, [
        h('button', {
          key: 'vanish',
          type: 'button',
          className: 'cr-act-vanish',
          'aria-pressed': props.value === 'vanish',
          onClick: function () { props.onChange('vanish'); },
        }, t('vanish')),
        h('button', {
          key: 'spread',
          type: 'button',
          className: 'cr-act-spread',
          'aria-pressed': props.value === 'spread',
          onClick: function () { props.onChange('spread'); },
        }, t('spread')),
      ]);
    }

    function Switch(props) {
      return h('button', {
        type: 'button',
        role: 'switch',
        className: 'cr-switch',
        'aria-checked': props.checked,
        'aria-label': props.label,
        title: props.label,
        onClick: function () { props.onChange(!props.checked); },
      }, h('span', { className: 'cr-switch-knob' }));
    }

    function RadiusPicker(props) {
      return h('div', { className: 'cr-seg cr-seg-radius', role: 'group', 'aria-label': props.label }, [1, 2, 3].map(function (r) {
        return h('button', {
          key: r,
          type: 'button',
          'aria-pressed': props.value === r,
          title: props.t('areaHint', { n: maxNeighbors(r) }),
          onClick: function () { props.onChange(r); },
        }, 'R' + r);
      }));
    }

    function Stepper(props) {
      return h('div', { className: 'cr-stepper' },
        h('button', {
          type: 'button',
          'aria-label': props.decreaseLabel,
          title: props.decreaseLabel,
          disabled: props.value <= 1,
          onClick: function () { props.onChange(props.value - 1); },
        }, '−'),
        h('span', { 'aria-live': 'polite' }, String(props.value)),
        h('button', {
          type: 'button',
          'aria-label': props.increaseLabel,
          title: props.increaseLabel,
          disabled: props.value >= props.max,
          onClick: function () { props.onChange(props.value + 1); },
        }, '+')
      );
    }

    function RuleCard(props) {
      const t = props.t;
      const rule = props.rule;
      const subject = COLOR_BY_ID[rule.subject] || COLOR_BY_ID[1];
      const near = COLOR_BY_ID[rule.near] || COLOR_BY_ID[1];
      const max = maxNeighbors(rule.radius);
      return h('article', {
        className: 'cr-rule' + (rule.enabled ? '' : ' is-off') + (props.preview ? ' is-preview' : ''),
        onMouseEnter: props.onPreview,
        onMouseLeave: props.onPreviewEnd,
        onFocusCapture: props.onPreview,
        onBlurCapture: function (event) {
          if (!event.currentTarget.contains(event.relatedTarget)) props.onPreviewEnd();
        },
      },
        h('div', { className: 'cr-rule-head' },
          h('span', { className: 'cr-rule-no' }, '#' + String(props.index + 1).padStart(2, '0')),
          h('div', { className: 'cr-rule-summary', 'aria-label': t('ruleNo', { n: props.index + 1 }) },
            h(ColorDot, { color: subject.id }),
            h('span', { className: 'cr-rule-name' }, t('colors.' + subject.key)),
            h('span', { className: 'cr-rule-action cr-act-' + rule.action }, t(rule.action)),
            h('span', { className: 'cr-summary-sep' }, '·'),
            h('span', { className: 'cr-rule-meta' }, 'R' + rule.radius),
            h('span', { className: 'cr-summary-sep' }, '·'),
            h('span', { className: 'cr-rule-meta' }, '≥' + rule.min),
            h(ColorDot, { color: near.id }),
            h('span', { className: 'cr-rule-name' }, t('colors.' + near.key))
          ),
          h('div', { className: 'cr-rule-tools' },
            h('button', {
              type: 'button',
              className: 'cr-icon-btn',
              title: t('moveUp'),
              'aria-label': t('moveUp'),
              disabled: props.index === 0,
              onClick: props.onMoveUp,
            }, '↑'),
            h('button', {
              type: 'button',
              className: 'cr-icon-btn',
              title: t('moveDown'),
              'aria-label': t('moveDown'),
              disabled: props.index === props.count - 1,
              onClick: props.onMoveDown,
            }, '↓'),
            h(Switch, {
              checked: rule.enabled,
              label: t(rule.enabled ? 'enabled' : 'disabled'),
              onChange: props.onToggle,
            }),
            h('button', {
              type: 'button',
              className: 'cr-icon-btn cr-icon-danger',
              title: t('deleteRule'),
              'aria-label': t('deleteRule'),
              onClick: props.onRemove,
            }, '×')
          )
        ),
        h('div', { className: 'cr-rule-controls' },
          h('div', { className: 'cr-field' },
            h('span', { className: 'cr-field-label' }, t('subject')),
            h(ColorPicker, {
              t: t,
              value: rule.subject,
              label: t('subject'),
              onChange: function (value) { props.onChange({ subject: value }); },
            })
          ),
          h('div', { className: 'cr-field' },
            h('span', { className: 'cr-field-label' }, t('action')),
            h(ActionToggle, {
              t: t,
              value: rule.action,
              label: t('action'),
              onChange: function (value) { props.onChange({ action: value }); },
            })
          ),
          h('div', { className: 'cr-field cr-field-condition' },
            h('span', { className: 'cr-field-label' }, t('condition')),
            h(RadiusPicker, {
              t: t,
              value: rule.radius,
              label: t('radius'),
              onChange: function (value) { props.onChange({ radius: value, min: Math.min(rule.min, maxNeighbors(value)) }); },
            }),
            h('span', { className: 'cr-field-caption' }, t('threshold')),
            h(Stepper, {
              value: rule.min,
              max: max,
              decreaseLabel: '− ' + t('threshold'),
              increaseLabel: '+ ' + t('threshold'),
              onChange: function (value) { props.onChange({ min: Math.max(1, Math.min(max, value)) }); },
            }),
            h('span', { className: 'cr-field-caption' }, t('near')),
            h(ColorPicker, {
              t: t,
              value: rule.near,
              label: t('near'),
              onChange: function (value) { props.onChange({ near: value }); },
            }),
            h('span', { className: 'cr-area-note' }, t('areaHint', { n: max }))
          )
        )
      );
    }

    function Board(props) {
      const t = props.t;
      const level = props.level;
      const preview = props.preview;
      const cells = props.board.map(function (color, index) {
        const c = COLOR_BY_ID[color];
        const classes = ['cr-cell'];
        if (preview && preview.sources.has(index)) classes.push('is-preview-source');
        if (preview && preview.targets.has(index)) classes.push('is-preview-target');
        if (props.sandbox) classes.push('is-clickable');
        const style = c ? {
          '--cr-piece': c.hex,
          '--cr-deep': c.deep,
          '--cr-hi': c.hi,
          '--cr-glow': c.glow,
        } : undefined;
        return h('div', {
          key: index,
          className: classes.join(' '),
          role: 'gridcell',
          'aria-label': c ? t('colors.' + c.key) : t('empty'),
          title: c ? t('colors.' + c.key) : t('empty'),
          style: style,
          onClick: props.sandbox ? function () { props.onPaint(index, props.paintColor); } : undefined,
          onContextMenu: props.sandbox ? function (event) { event.preventDefault(); props.onPaint(index, 0); } : undefined,
        },
          c ? h('span', { key: 'piece-' + color, className: 'cr-piece' },
            h('span', { className: 'cr-glyph', 'aria-hidden': 'true' }, c.glyph)
          ) : null,
          preview && preview.targets.has(index) ? h('span', {
            key: 'ghost',
            className: 'cr-ghost',
            style: {
              '--cr-piece': preview.color.hex,
              '--cr-deep': preview.color.deep,
              '--cr-hi': preview.color.hi,
              '--cr-glow': preview.color.glow,
            },
          }) : null
        );
      });
      return h('div', {
        className: 'cr-board' + (props.result === 'win' ? ' is-win' : '') + (props.result === 'lose' ? ' is-lose' : ''),
        role: 'grid',
        'aria-label': t('boardAria'),
        style: { gridTemplateColumns: 'repeat(' + level.w + ', minmax(0, 1fr))' },
      }, cells);
    }

    function Legend(props) {
      const t = props.t;
      return h('div', { className: 'cr-legend', 'aria-label': t('legend') },
        h('span', { className: 'cr-legend-label' }, t('legend')),
        COLORS.map(function (c) {
          const n = countColor(props.board, c.id);
          return h('span', { key: c.id, className: 'cr-legend-item' + (n === 0 ? ' is-empty' : '') },
            h(ColorDot, { color: c.id }),
            h('span', { className: 'cr-legend-name' }, t('colors.' + c.key)),
            h('span', { className: 'cr-legend-count' }, String(n))
          );
        })
      );
    }

    function MissionCard(props) {
      const t = props.t;
      const level = props.level;
      const best = props.completed[level.id];
      return h('section', { className: 'cr-card cr-mission-card' },
        h('div', { className: 'cr-accent', 'aria-hidden': 'true' }),
        h('div', { className: 'cr-card-pad' },
          h('div', { className: 'cr-kicker' }, t('mission')),
          h('h2', { className: 'cr-section-title' }, t(level.nameKey)),
          h('p', { className: 'cr-brief' }, t(level.briefKey)),
          level.objectives.length ? h('div', { className: 'cr-objectives' }, level.objectives.map(function (objective, index) {
            const c = COLOR_BY_ID[objective.color];
            const progress = objectiveProgress(level, props.board, objective);
            return h('div', { key: index, className: 'cr-objective' + (progress.done ? ' is-done' : '') },
              h('div', { className: 'cr-objective-top' },
                h(ColorDot, { color: c.id }),
                h('span', { className: 'cr-objective-name' },
                  objective.type === 'clear'
                    ? t('objectiveClear', { color: t('colors.' + c.key) })
                    : t('objectiveAtLeast', { color: t('colors.' + c.key), n: objective.n })
                ),
                h('span', { className: 'cr-objective-count' }, progress.done ? '✓' : (
                  objective.type === 'clear'
                    ? String(progress.current) + ' → 0'
                    : String(progress.current) + ' / ' + progress.target
                ))
              ),
              h('div', {
                className: 'cr-objective-bar',
                role: 'progressbar',
                'aria-valuemin': 0,
                'aria-valuemax': 100,
                'aria-valuenow': Math.round(progress.ratio * 100),
              }, h('span', {
                className: 'cr-objective-fill',
                style: { width: Math.round(progress.ratio * 100) + '%', background: c.hex },
              }))
            );
          })) : h('div', { className: 'cr-sandbox-note' }, t('level.sandbox.brief')),
          h('div', { className: 'cr-meta' },
            level.campaign
              ? h('span', { className: 'cr-meta-chip' }, t('stepLimit') + ' · ' + level.limit)
              : h('span', { className: 'cr-meta-chip' }, t('generation', { n: '∞' })),
            h('span', { className: 'cr-meta-chip' }, t('ruleBudget') + ' · ' + level.ruleLimit),
            best ? h('span', { className: 'cr-meta-chip cr-meta-best' }, t('best', { n: best })) : null
          ),
          h('details', { className: 'cr-hint' },
            h('summary', null, h('span', { className: 'cr-hint-icon', 'aria-hidden': 'true' }, '◇'), t('hint')),
            h('div', { className: 'cr-hint-body' }, t(level.hintKey))
          )
        )
      );
    }

    function RulesCard(props) {
      const t = props.t;
      const level = props.level;
      const rules = props.rules;
      const canAdd = rules.length < level.ruleLimit;
      return h('section', { className: 'cr-card cr-rules-card' },
        h('div', { className: 'cr-card-pad' },
          h('div', { className: 'cr-section-head' },
            h('h2', { className: 'cr-section-title cr-rules-title' }, t('rules')),
            h('span', { className: 'cr-count-pill' }, rules.length + ' / ' + level.ruleLimit)
          ),
          rules.length === 0
            ? h('div', { className: 'cr-empty-rules' }, t('emptyRules'))
            : h('div', { className: 'cr-rule-list' }, rules.map(function (rule, index) {
              return h(RuleCard, {
                key: rule.id,
                t: t,
                rule: rule,
                index: index,
                count: rules.length,
                preview: props.previewRuleId === rule.id,
                onPreview: function () { props.onPreview(rule.id); },
                onPreviewEnd: function () { props.onPreview(null); },
                onChange: function (patch) { props.onChange(rule.id, patch); },
                onToggle: function () { props.onToggle(rule.id); },
                onRemove: function () { props.onRemove(rule.id); },
                onMoveUp: function () { props.onMove(rule.id, -1); },
                onMoveDown: function () { props.onMove(rule.id, 1); },
              });
            })),
          h('button', {
            type: 'button',
            className: 'cr-add-rule',
            disabled: !canAdd,
            onClick: props.onAdd,
          }, canAdd ? '+ ' + t('addRule') : t('rulesFull')),
          h('div', { className: 'cr-rule-notes' },
            h('p', null, t('rulePriority')),
            level.campaign ? h('p', { className: 'cr-rule-reset-note' }, t('ruleResetNote')) : h('p', { className: 'cr-rule-reset-note' }, t('sandboxNote'))
          )
        )
      );
    }

    function GamePanel() {
      const t = useT();
      const [levelIndex, setLevelIndex] = React.useState(0);
      const level = LEVELS[levelIndex];
      const [board, setBoard] = React.useState(function () { return LEVEL_FIRST.cells.slice(); });
      const [rules, setRules] = React.useState([]);
      const [generation, setGeneration] = React.useState(0);
      const [running, setRunning] = React.useState(false);
      const [speed, setSpeed] = React.useState(620);
      const [result, setResult] = React.useState(null);
      const [lastStep, setLastStep] = React.useState(null);
      const [completed, setCompleted] = React.useState(loadProgress);
      const [paintColor, setPaintColor] = React.useState(1);
      const [previewRuleId, setPreviewRuleId] = React.useState(null);
      const ruleSequence = React.useRef(1);

      const sandbox = !level.campaign;

      function recordWin(gens) {
        const previous = completed[level.id];
        if (previous && previous <= gens) return;
        const next = Object.assign({}, completed);
        next[level.id] = gens;
        setCompleted(next);
        saveProgress(next);
      }

      function advance() {
        if (result) return;
        const outcome = simulateStep(level.w, level.h, board, rules);
        const nextGeneration = generation + 1;
        const stepInfo = {
          generation: nextGeneration,
          vanished: outcome.vanished,
          spread: outcome.spread,
          triggered: outcome.triggered,
        };
        setBoard(outcome.cells);
        setGeneration(nextGeneration);
        setLastStep(stepInfo);
        if (outcome.vanished === 0 && outcome.spread === 0) setRunning(false);

        if (level.objectives.length > 0 && objectivesMet(outcome.cells, level.objectives)) {
          setResult('win');
          setRunning(false);
          recordWin(nextGeneration);
          return;
        }
        if (level.limit > 0 && nextGeneration >= level.limit) {
          setResult('lose');
          setRunning(false);
        }
      }

      React.useEffect(function () {
        if (!running || result) return undefined;
        const timer = setTimeout(function () { advance(); }, speed);
        return function () { clearTimeout(timer); };
      }, [running, result, speed, board, rules, generation, levelIndex]);

      function resetRun() {
        setBoard(level.cells.slice());
        setGeneration(0);
        setResult(null);
        setLastStep(null);
        setRunning(false);
      }

      function selectLevel(index) {
        if (index === levelIndex) return;
        const next = LEVELS[index];
        setLevelIndex(index);
        setBoard(next.cells.slice());
        setRules([]);
        setGeneration(0);
        setResult(null);
        setLastStep(null);
        setRunning(false);
        setPreviewRuleId(null);
        setPaintColor(1);
      }

      function commitRules(nextRules) {
        setRules(nextRules);
        setPreviewRuleId(null);
        setRunning(false);
        setLastStep(null);
        setResult(null);
        if (level.campaign) {
          setBoard(level.cells.slice());
          setGeneration(0);
        }
      }

      function addRule() {
        if (rules.length >= level.ruleLimit) return;
        const counts = {};
        for (let i = 0; i < level.cells.length; i++) {
          const color = level.cells[i];
          if (color) counts[color] = (counts[color] || 0) + 1;
        }
        const ranked = COLORS.map(function (c) { return c.id; })
          .filter(function (id) { return counts[id]; })
          .sort(function (a, b) { return (counts[b] || 0) - (counts[a] || 0); });
        const baseSubject = ranked[0] || 1;
        const baseNear = ranked.filter(function (id) { return id !== baseSubject; })[0] || baseSubject;
        const spread = rules.length % 2 === 1;
        const previous = rules[rules.length - 1];
        const subject = spread ? (previous ? previous.near : baseNear) : baseSubject;
        const near = spread ? subject : baseNear;
        const rule = {
          id: 'rule-' + ruleSequence.current++,
          enabled: true,
          action: spread ? 'spread' : 'vanish',
          subject: subject,
          near: near,
          radius: 1,
          min: 1,
        };
        commitRules(rules.concat(rule));
      }

      function changeRule(id, patch) {
        const next = rules.map(function (rule) {
          if (rule.id !== id) return rule;
          return Object.assign({}, rule, patch);
        });
        commitRules(next);
      }

      function toggleRule(id) {
        const next = rules.map(function (rule) {
          if (rule.id !== id) return rule;
          return Object.assign({}, rule, { enabled: !rule.enabled });
        });
        commitRules(next);
      }

      function removeRule(id) {
        commitRules(rules.filter(function (rule) { return rule.id !== id; }));
      }

      function moveRule(id, direction) {
        const index = rules.findIndex(function (rule) { return rule.id === id; });
        const target = index + direction;
        if (index < 0 || target < 0 || target >= rules.length) return;
        const next = rules.slice();
        const moved = next.splice(index, 1)[0];
        next.splice(target, 0, moved);
        commitRules(next);
      }

      function paintCell(index, color) {
        if (!sandbox || board[index] === color) return;
        const next = board.slice();
        next[index] = color;
        setBoard(next);
        setGeneration(0);
        setResult(null);
        setLastStep(null);
        setRunning(false);
      }

      function clearCanvas() {
        if (!sandbox) return;
        setBoard(new Array(level.w * level.h).fill(0));
        setGeneration(0);
        setResult(null);
        setLastStep(null);
        setRunning(false);
      }

      const preview = React.useMemo(function () {
        if (previewRuleId === null) return null;
        const rule = rules.find(function (item) { return item.id === previewRuleId; });
        if (!rule || !rule.enabled) return null;
        const sources = new Set();
        const targets = new Set();
        for (let i = 0; i < board.length; i++) {
          if (!ruleMatches(board, level.w, level.h, i, rule)) continue;
          sources.add(i);
          if (rule.action !== 'spread') continue;
          const region = regionIndices(level.w, level.h, i, rule.radius);
          for (let k = 0; k < region.length; k++) {
            if (board[region[k]] === EMPTY) targets.add(region[k]);
          }
        }
        return { sources: sources, targets: targets, color: COLOR_BY_ID[rule.subject] };
      }, [previewRuleId, rules, board, level.w, level.h]);

      let statusKey = 'statusIdle';
      if (result === 'win') statusKey = 'statusWin';
      else if (result === 'lose') statusKey = 'statusLose';
      else if (running) statusKey = 'statusRunning';
      else if (lastStep && lastStep.vanished === 0 && lastStep.spread === 0) statusKey = 'statusStable';

      const campaignLevels = LEVELS.filter(function (item) { return item.campaign; });
      const doneCount = campaignLevels.filter(function (item) { return completed[item.id]; }).length;
      const stepInfo = lastStep
        ? (lastStep.vanished === 0 && lastStep.spread === 0
          ? t('stable')
          : t('lastStep', { vanish: lastStep.vanished, spread: lastStep.spread, rules: lastStep.triggered }))
        : t('lastStepNone');

      const nextIndex = levelIndex + 1;
      const hasNext = nextIndex < LEVELS.length;
      const isFinalCampaign = levelIndex === LEVELS.length - 2;

      return h('div', { className: 'cr-page' },
        h('style', null, CSS),
        h('div', { className: 'cr-shell' },
          h('header', { className: 'cr-hero' },
            h('div', { className: 'cr-brandline' },
              h('div', { className: 'cr-logo', 'aria-hidden': 'true' },
                h('span'), h('span'), h('span'), h('span')
              ),
              h('div', { className: 'cr-titleblock' },
                h('div', { className: 'cr-eyebrow' }, t('eyebrow')),
                h('h1', { className: 'cr-title' }, t('title')),
                h('p', { className: 'cr-subtitle' }, t('subtitle'))
              )
            ),
            h('nav', { className: 'cr-levels', 'aria-label': t('levelSelect') },
              LEVELS.map(function (item, index) {
                const done = Boolean(completed[item.id]);
                const active = index === levelIndex;
                return h('button', {
                  key: item.id,
                  type: 'button',
                  className: 'cr-level' + (active ? ' is-active' : '') + (done ? ' is-done' : ''),
                  'aria-current': active ? 'page' : undefined,
                  'aria-label': t(item.nameKey) + (done ? ' · ' + t('progress', { done: 1, total: 1 }) : ''),
                  onClick: function () { selectLevel(index); },
                },
                  h('span', { className: 'cr-level-num' }, item.campaign ? String(index + 1).padStart(2, '0') : '∞'),
                  h('span', { className: 'cr-level-name' }, t(item.nameKey)),
                  done ? h('span', { className: 'cr-level-check', 'aria-hidden': 'true' }, '✓') : null
                );
              })
            )
          ),
          h('div', { className: 'cr-layout' },
            h('section', { className: 'cr-card cr-board-card' },
              h('div', { className: 'cr-board-head' },
                h('div', null,
                  h('div', { className: 'cr-kicker' }, t('progress', { done: doneCount, total: campaignLevels.length })),
                  h('div', { className: 'cr-board-title' }, t(level.nameKey),
                    h('span', { className: 'cr-board-index' }, level.campaign ? String(levelIndex + 1).padStart(2, '0') : '∞')
                  )
                ),
                h('div', { className: 'cr-board-meta' },
                  h('span', { className: 'cr-status cr-status-' + statusKey },
                    h('span', { className: 'cr-status-dot', 'aria-hidden': 'true' }),
                    t(statusKey)
                  ),
                  h('span', { className: 'cr-gen-pill' }, t('generation', { n: generation })),
                  level.limit > 0
                    ? h('span', { className: 'cr-gen-pill' }, t('stepCounter', { n: generation, limit: level.limit }))
                    : h('span', { className: 'cr-gen-pill' }, t('generation', { n: '∞' }))
                )
              ),
              result ? h('div', { className: 'cr-result cr-result-' + result, role: 'status', 'aria-live': 'polite' },
                h('span', { className: 'cr-result-icon', 'aria-hidden': 'true' }, result === 'win' ? '✓' : '!'),
                h('div', { className: 'cr-result-copy' },
                  h('strong', null, t(result === 'win' ? 'winTitle' : 'loseTitle')),
                  h('span', null, result === 'win' ? t('winBody', { gen: generation }) : t('loseBody'))
                ),
                h('div', { className: 'cr-result-actions' },
                  result === 'win' && hasNext ? h('button', {
                    type: 'button',
                    className: 'cr-btn cr-btn-primary',
                    onClick: function () { selectLevel(nextIndex); },
                  }, isFinalCampaign ? t('enterSandbox') : t('nextLevel')) : null,
                  result === 'lose' ? h('button', {
                    type: 'button',
                    className: 'cr-btn cr-btn-primary',
                    onClick: resetRun,
                  }, t('tryAgain')) : null,
                  h('button', {
                    type: 'button',
                    className: 'cr-btn',
                    onClick: resetRun,
                  }, t('replay'))
                )
              ) : null,
              h('div', { className: 'cr-board-wrap' },
                h(Board, {
                  t: t,
                  level: level,
                  board: board,
                  preview: preview,
                  result: result,
                  sandbox: sandbox,
                  paintColor: paintColor,
                  onPaint: paintCell,
                })
              ),
              h('div', { className: 'cr-step-strip', 'aria-live': 'polite' }, stepInfo),
              h(Legend, { t: t, board: board }),
              sandbox ? h('div', { className: 'cr-paintbar' },
                h('span', { className: 'cr-paint-label' }, t('paint')),
                COLORS.map(function (c) {
                  return h('button', {
                    key: c.id,
                    type: 'button',
                    className: 'cr-paint-swatch',
                    'aria-pressed': paintColor === c.id,
                    title: t('colors.' + c.key),
                    'aria-label': t('colors.' + c.key),
                    style: { background: 'linear-gradient(145deg, ' + c.hi + ', ' + c.hex + ' 46%, ' + c.deep + ')' },
                    onClick: function () { setPaintColor(c.id); },
                  });
                }),
                h('button', {
                  type: 'button',
                  className: 'cr-paint-eraser',
                  'aria-pressed': paintColor === 0,
                  title: t('eraser'),
                  onClick: function () { setPaintColor(0); },
                }, t('eraser')),
                h('button', {
                  type: 'button',
                  className: 'cr-clear-canvas',
                  onClick: clearCanvas,
                }, t('clearCanvas')),
                h('span', { className: 'cr-paint-hint' }, t('sandboxPaintHint'))
              ) : null,
              h('div', { className: 'cr-controls' },
                h('button', {
                  type: 'button',
                  className: 'cr-btn cr-btn-primary cr-btn-run',
                  disabled: Boolean(result) || (level.limit > 0 && generation >= level.limit),
                  onClick: advance,
                }, h('span', { className: 'cr-btn-icon', 'aria-hidden': 'true' }, '▶'), t('stepOnce')),
                h('button', {
                  type: 'button',
                  className: 'cr-btn' + (running ? ' is-active' : ''),
                  disabled: Boolean(result),
                  onClick: function () { setRunning(!running); },
                }, h('span', { className: 'cr-btn-icon', 'aria-hidden': 'true' }, running ? 'Ⅱ' : '⟳'), running ? t('pause') : t('autoRun')),
                h('button', {
                  type: 'button',
                  className: 'cr-btn',
                  onClick: resetRun,
                }, h('span', { className: 'cr-btn-icon', 'aria-hidden': 'true' }, '↺'), t('resetBoard')),
                h('div', { className: 'cr-speed' },
                  h('span', null, t('pace')),
                  h('span', { className: 'cr-speed-edge' }, t('slow')),
                  h('input', {
                    type: 'range',
                    min: 180,
                    max: 1400,
                    step: 20,
                    value: speed,
                    'aria-label': t('pace'),
                    onChange: function (event) { setSpeed(Number(event.target.value)); },
                  }),
                  h('span', { className: 'cr-speed-edge' }, t('fast'))
                )
              )
            ),
            h('aside', { className: 'cr-side' },
              h(MissionCard, { t: t, level: level, board: board, completed: completed }),
              h(RulesCard, {
                t: t,
                level: level,
                rules: rules,
                previewRuleId: previewRuleId,
                onPreview: setPreviewRuleId,
                onAdd: addRule,
                onChange: changeRule,
                onToggle: toggleRule,
                onRemove: removeRule,
                onMove: moveRule,
              })
            )
          )
        )
      );
    }

    const CSS = `
      .cr-page {
        height: 100%;
        min-height: 100%;
        overflow: auto;
        box-sizing: border-box;
        padding: 26px 30px 48px;
        color: var(--dsw-alias-label-primary);
        font-family: inherit;
      }
      .cr-page *, .cr-page *::before, .cr-page *::after { box-sizing: border-box; }
      .cr-shell { max-width: 1360px; margin: 0 auto; display: flex; flex-direction: column; gap: 22px; }
      .cr-hero { display: flex; align-items: flex-end; justify-content: space-between; gap: 22px; flex-wrap: wrap; }
      .cr-brandline { display: flex; align-items: flex-start; gap: 15px; min-width: 0; }
      .cr-logo {
        width: 46px; height: 46px; flex: none; border-radius: 14px; padding: 6px;
        display: grid; grid-template-columns: 1fr 1fr; gap: 4px;
        background: var(--dsw-alias-bg-layer-2);
        border: 1px solid var(--dsw-alias-border-l1);
        box-shadow: 0 8px 22px rgba(0, 0, 0, 0.14);
      }
      .cr-logo span { border-radius: 4px; }
      .cr-logo span:nth-child(1) { background: linear-gradient(145deg, #ff9eb1, #e0506d 55%, #9c2542); }
      .cr-logo span:nth-child(2) { background: linear-gradient(145deg, #9bc5ff, #3d8bfd 55%, #1d4fb8); }
      .cr-logo span:nth-child(3) { background: linear-gradient(145deg, #ffdb8b, #e2a33b 55%, #966111); }
      .cr-logo span:nth-child(4) { background: linear-gradient(145deg, #92f0cd, #2fbf8f 55%, #10714e); }
      .cr-titleblock { min-width: 0; }
      .cr-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.16em; color: var(--dsw-alias-label-secondary); margin-bottom: 5px; }
      .cr-title { margin: 0; font-size: 27px; line-height: 1.14; letter-spacing: -0.025em; font-weight: 680; }
      .cr-subtitle { margin: 7px 0 0; max-width: 620px; font-size: 12.5px; line-height: 1.65; color: var(--dsw-alias-label-secondary); }
      .cr-levels {
        display: flex; flex-wrap: wrap; gap: 4px; padding: 5px;
        border-radius: 14px; background: var(--dsw-alias-bg-layer-2);
        border: 1px solid var(--dsw-alias-border-l1);
      }
      .cr-level {
        display: inline-flex; align-items: center; gap: 8px; padding: 7px 10px 7px 8px;
        border-radius: 10px; border: 1px solid transparent; background: transparent;
        color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; font-weight: 560;
        cursor: pointer; transition: background .16s ease, color .16s ease, border-color .16s ease;
        white-space: nowrap;
      }
      .cr-level:hover { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); }
      .cr-level.is-active {
        background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary);
        border-color: var(--dsw-alias-border-l2);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
      }
      .cr-level-num {
        width: 21px; height: 21px; border-radius: 7px; display: inline-flex;
        align-items: center; justify-content: center; font-size: 9.5px; font-weight: 750;
        background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary);
        font-variant-numeric: tabular-nums;
      }
      .cr-level.is-active .cr-level-num { background: var(--dsw-alias-brand-primary); color: var(--dsw-alias-bg-base); }
      .cr-level-check { color: var(--dsw-alias-state-success-primary); font-size: 11px; font-weight: 800; }
      .cr-layout {
        display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(336px, 0.85fr);
        gap: 20px; align-items: start;
      }
      .cr-side { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
      .cr-card {
        background: var(--dsw-alias-bg-layer-1);
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 18px; overflow: hidden;
        box-shadow: 0 1px 0 rgba(255, 255, 255, 0.02), 0 14px 34px rgba(0, 0, 0, 0.08);
      }
      .cr-card-pad { padding: 18px 20px 20px; }
      .cr-accent {
        height: 4px;
        background: linear-gradient(90deg, #e0506d 0%, #3d8bfd 25%, #e2a33b 50%, #9a6cf5 75%, #2fbf8f 100%);
      }
      .cr-kicker { font-size: 9.5px; font-weight: 760; letter-spacing: 0.15em; color: var(--dsw-alias-label-secondary); text-transform: uppercase; }
      .cr-board-head {
        display: flex; align-items: flex-start; justify-content: space-between; gap: 14px;
        padding: 17px 20px 12px;
      }
      .cr-board-title { display: flex; align-items: center; gap: 9px; margin-top: 5px; font-size: 17px; font-weight: 680; letter-spacing: -0.01em; }
      .cr-board-index {
        padding: 2px 6px; border-radius: 6px; font-size: 9.5px; font-weight: 760;
        background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary);
        border: 1px solid var(--dsw-alias-border-l1); font-variant-numeric: tabular-nums;
      }
      .cr-board-meta { display: flex; align-items: center; justify-content: flex-end; gap: 6px; flex-wrap: wrap; }
      .cr-status {
        display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 9px;
        border-radius: 999px; font-size: 10.5px; font-weight: 620;
        color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-bg-layer-2);
        border: 1px solid var(--dsw-alias-border-l1);
      }
      .cr-status-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--dsw-alias-state-idle-primary); }
      .cr-status-statusRunning .cr-status-dot { background: var(--dsw-alias-brand-primary); box-shadow: 0 0 0 3px rgba(61, 139, 253, 0.14); }
      .cr-status-statusWin .cr-status-dot { background: var(--dsw-alias-state-success-primary); }
      .cr-status-statusLose .cr-status-dot { background: var(--dsw-alias-state-error-primary); }
      .cr-status-statusStable .cr-status-dot { background: var(--dsw-alias-state-warn-primary); }
      .cr-gen-pill {
        display: inline-flex; align-items: center; height: 24px; padding: 0 9px;
        border-radius: 999px; font-size: 10.5px; color: var(--dsw-alias-label-secondary);
        background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l1);
        font-variant-numeric: tabular-nums; white-space: nowrap;
      }
      .cr-result {
        display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
        margin: 0 20px 13px; padding: 12px 14px; border-radius: 13px;
        border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2);
        animation: cr-result-in 240ms ease both;
      }
      .cr-result-win { border-color: rgba(47, 191, 143, 0.42); background: linear-gradient(100deg, rgba(47, 191, 143, 0.13), transparent 70%); }
      .cr-result-lose { border-color: rgba(224, 80, 109, 0.44); background: linear-gradient(100deg, rgba(224, 80, 109, 0.12), transparent 70%); }
      .cr-result-icon {
        width: 30px; height: 30px; flex: none; border-radius: 10px;
        display: inline-flex; align-items: center; justify-content: center;
        font-size: 14px; font-weight: 800;
      }
      .cr-result-win .cr-result-icon { color: var(--dsw-alias-state-success-primary); background: rgba(47, 191, 143, 0.14); }
      .cr-result-lose .cr-result-icon { color: var(--dsw-alias-state-error-primary); background: rgba(224, 80, 109, 0.14); }
      .cr-result-copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .cr-result-copy strong { font-size: 12.5px; }
      .cr-result-copy span { font-size: 11.5px; color: var(--dsw-alias-label-secondary); }
      .cr-result-actions { display: flex; gap: 7px; margin-left: auto; flex-wrap: wrap; }
      .cr-board-wrap { padding: 0 20px; }
      .cr-board {
        display: grid; gap: 3px; padding: 10px; width: 100%;
        border-radius: 15px; background: var(--dsw-alias-bg-layer-2);
        border: 1px solid var(--dsw-alias-border-l1);
        transition: box-shadow .2s ease;
      }
      .cr-cell {
        position: relative; aspect-ratio: 1 / 1; min-width: 0; border-radius: 6px;
        background: var(--dsw-alias-bg-layer-1);
        box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l1);
        transition: background .15s ease, box-shadow .15s ease;
      }
      .cr-cell.is-clickable { cursor: crosshair; }
      .cr-cell.is-clickable:hover { background: var(--dsw-alias-bg-overlay); box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l2); }
      .cr-piece {
        position: absolute; inset: 4%; border-radius: 24%;
        display: flex; align-items: center; justify-content: center;
        background:
          radial-gradient(circle at 30% 22%, var(--cr-hi) 0, rgba(255, 255, 255, 0) 38%),
          linear-gradient(145deg, var(--cr-piece) 0%, var(--cr-deep) 100%);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.38),
          inset 0 -2px 4px rgba(0, 0, 0, 0.2),
          0 3px 8px var(--cr-glow);
        animation: cr-piece-in 260ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
      }
      .cr-glyph {
        font-size: clamp(7px, 1.25vw, 13px); line-height: 1; color: rgba(255, 255, 255, 0.72);
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.34); user-select: none; pointer-events: none;
      }
      .cr-cell.is-preview-source .cr-piece { outline: 2px solid var(--dsw-alias-label-primary); outline-offset: 1px; filter: brightness(1.09); }
      .cr-cell.is-preview-target { background: var(--dsw-alias-bg-overlay); }
      .cr-ghost {
        position: absolute; left: 50%; top: 50%; width: 30%; height: 30%;
        transform: translate(-50%, -50%); border-radius: 50%;
        background: var(--cr-piece); box-shadow: 0 0 9px var(--cr-glow); opacity: 0.66;
        animation: cr-ghost-in 220ms ease both; pointer-events: none;
      }
      .cr-board.is-win { box-shadow: 0 0 0 1px var(--dsw-alias-state-success-primary), 0 0 30px rgba(47, 191, 143, 0.16); }
      .cr-board.is-win .cr-piece { animation: cr-win 900ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
      .cr-board.is-lose { opacity: 0.82; }
      .cr-step-strip {
        min-height: 18px; padding: 11px 20px 0; font-size: 11.5px; line-height: 1.5;
        color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums;
      }
      .cr-legend { display: flex; align-items: center; flex-wrap: wrap; gap: 7px 13px; padding: 12px 20px 0; }
      .cr-legend-label { font-size: 9.5px; font-weight: 760; letter-spacing: 0.12em; color: var(--dsw-alias-label-secondary); text-transform: uppercase; margin-right: 2px; }
      .cr-legend-item { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--dsw-alias-label-secondary); }
      .cr-legend-item.is-empty { opacity: 0.58; }
      .cr-legend-count { color: var(--dsw-alias-label-primary); font-weight: 650; font-variant-numeric: tabular-nums; }
      .cr-dot {
        width: 11px; height: 11px; border-radius: 3.5px; flex: none; display: inline-block;
        background: linear-gradient(145deg, var(--cr-hi), var(--cr-piece) 48%, var(--cr-deep));
        box-shadow: 0 1px 3px var(--cr-glow), inset 0 1px 0 rgba(255, 255, 255, 0.34);
      }
      .cr-paintbar { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; padding: 13px 20px 0; }
      .cr-paint-label { font-size: 9.5px; font-weight: 760; letter-spacing: 0.12em; color: var(--dsw-alias-label-secondary); text-transform: uppercase; margin-right: 2px; }
      .cr-paint-swatch {
        width: 27px; height: 27px; padding: 0; border-radius: 8px; border: 2px solid transparent;
        cursor: pointer; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.34);
      }
      .cr-paint-swatch[aria-pressed="true"] { border-color: var(--dsw-alias-label-primary); box-shadow: 0 0 0 2px var(--dsw-alias-bg-layer-1), inset 0 1px 0 rgba(255, 255, 255, 0.34); }
      .cr-paint-eraser, .cr-clear-canvas {
        height: 27px; padding: 0 9px; border-radius: 8px; font: inherit; font-size: 11px;
        border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2);
        color: var(--dsw-alias-label-secondary); cursor: pointer;
      }
      .cr-paint-eraser[aria-pressed="true"] { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-label-primary); }
      .cr-clear-canvas:hover, .cr-paint-eraser:hover { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l2); }
      .cr-paint-hint { font-size: 10.5px; color: var(--dsw-alias-label-secondary); margin-left: 2px; }
      .cr-controls { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 16px 20px 20px; }
      .cr-btn {
        display: inline-flex; align-items: center; justify-content: center; gap: 7px;
        min-height: 38px; padding: 0 14px; border-radius: 10px; font: inherit; font-size: 12px; font-weight: 620;
        border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2);
        color: var(--dsw-alias-label-primary); cursor: pointer;
        transition: background .15s ease, border-color .15s ease, filter .15s ease, opacity .15s ease;
      }
      .cr-btn:hover:not(:disabled) { border-color: var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-overlay); }
      .cr-btn-primary { background: var(--dsw-alias-brand-primary); color: var(--dsw-alias-bg-base); border-color: transparent; }
      .cr-btn-primary:hover:not(:disabled) { filter: brightness(1.06); background: var(--dsw-alias-brand-primary); }
      .cr-btn.is-active { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); }
      .cr-btn:disabled { opacity: 0.42; cursor: not-allowed; }
      .cr-btn-icon { font-size: 10px; line-height: 1; }
      .cr-btn-run { min-width: 110px; }
      .cr-speed { display: flex; align-items: center; gap: 6px; margin-left: auto; font-size: 10.5px; color: var(--dsw-alias-label-secondary); }
      .cr-speed input { width: 96px; accent-color: var(--dsw-alias-brand-primary); }
      .cr-speed-edge { font-size: 9.5px; opacity: 0.7; }
      .cr-section-title { margin: 6px 0 0; font-size: 20px; line-height: 1.2; letter-spacing: -0.02em; font-weight: 680; }
      .cr-rules-title { margin: 0; font-size: 14px; }
      .cr-brief { margin: 8px 0 0; font-size: 12px; line-height: 1.65; color: var(--dsw-alias-label-secondary); }
      .cr-objectives { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
      .cr-objective { display: flex; flex-direction: column; gap: 5px; }
      .cr-objective-top { display: flex; align-items: center; gap: 7px; font-size: 12px; }
      .cr-objective-name { font-weight: 610; }
      .cr-objective-count { margin-left: auto; color: var(--dsw-alias-label-secondary); font-size: 11px; font-variant-numeric: tabular-nums; }
      .cr-objective.is-done .cr-objective-count { color: var(--dsw-alias-state-success-primary); font-weight: 800; }
      .cr-objective.is-done .cr-objective-name { color: var(--dsw-alias-label-secondary); }
      .cr-objective-bar { height: 5px; border-radius: 999px; background: var(--dsw-alias-bg-layer-2); overflow: hidden; box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l1); }
      .cr-objective-fill { display: block; height: 100%; border-radius: 999px; transition: width 260ms ease; }
      .cr-sandbox-note { margin-top: 14px; padding: 10px 12px; border-radius: 10px; background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l1); font-size: 11.5px; line-height: 1.6; color: var(--dsw-alias-label-secondary); }
      .cr-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
      .cr-meta-chip { display: inline-flex; align-items: center; min-height: 23px; padding: 0 8px; border-radius: 7px; font-size: 10.5px; color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l1); }
      .cr-meta-best { color: var(--dsw-alias-state-success-primary); border-color: rgba(47, 191, 143, 0.34); }
      .cr-hint { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--dsw-alias-border-l1); }
      .cr-hint summary { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 11.5px; color: var(--dsw-alias-label-secondary); list-style: none; user-select: none; }
      .cr-hint summary::-webkit-details-marker { display: none; }
      .cr-hint summary:hover { color: var(--dsw-alias-label-primary); }
      .cr-hint-icon { font-size: 10px; }
      .cr-hint-body { margin-top: 9px; padding: 10px 12px; border-radius: 10px; background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l1); font-size: 11.5px; line-height: 1.72; color: var(--dsw-alias-label-secondary); white-space: pre-line; }
      .cr-section-head { display: flex; align-items: center; gap: 9px; margin-bottom: 2px; }
      .cr-count-pill { display: inline-flex; align-items: center; height: 20px; padding: 0 7px; border-radius: 6px; font-size: 10px; font-weight: 650; color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l1); font-variant-numeric: tabular-nums; }
      .cr-empty-rules { margin-top: 12px; padding: 18px 14px; border-radius: 12px; border: 1px dashed var(--dsw-alias-border-l2); text-align: center; font-size: 11.5px; line-height: 1.6; color: var(--dsw-alias-label-secondary); }
      .cr-rule-list { margin-top: 10px; display: flex; flex-direction: column; gap: 8px; }
      .cr-rule {
        padding: 9px 10px 10px; border-radius: 12px;
        background: var(--dsw-alias-bg-layer-2);
        border: 1px solid var(--dsw-alias-border-l1);
        transition: border-color .15s ease, opacity .15s ease;
      }
      .cr-rule.is-preview { border-color: var(--dsw-alias-brand-primary); }
      .cr-rule.is-off { opacity: 0.56; }
      .cr-rule-head { display: flex; align-items: flex-start; gap: 7px; }
      .cr-rule-no { font-size: 9px; font-weight: 750; color: var(--dsw-alias-label-secondary); padding-top: 3px; font-variant-numeric: tabular-nums; }
      .cr-rule-summary { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; min-width: 0; font-size: 11.5px; font-weight: 620; line-height: 1.5; }
      .cr-rule-name { font-weight: 680; }
      .cr-rule-action { font-size: 10px; font-weight: 760; padding: 1px 5px; border-radius: 5px; background: var(--dsw-alias-bg-layer-1); }
      .cr-rule-action.cr-act-vanish { color: var(--dsw-alias-state-error-primary); }
      .cr-rule-action.cr-act-spread { color: var(--dsw-alias-state-success-primary); }
      .cr-rule-meta { color: var(--dsw-alias-label-secondary); font-size: 10.5px; font-weight: 560; }
      .cr-summary-sep { color: var(--dsw-alias-label-secondary); opacity: 0.55; font-size: 9px; }
      .cr-rule-tools { display: flex; align-items: center; gap: 1px; margin-left: auto; flex: none; }
      .cr-icon-btn {
        width: 21px; height: 21px; padding: 0; border-radius: 6px; border: 1px solid transparent;
        background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px;
        line-height: 1; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
      }
      .cr-icon-btn:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); }
      .cr-icon-btn:disabled { opacity: 0.24; cursor: default; }
      .cr-icon-danger:hover:not(:disabled) { color: var(--dsw-alias-state-error-primary); }
      .cr-switch {
        width: 29px; height: 17px; padding: 0; margin: 2px 3px; border: 0; border-radius: 999px;
        background: var(--dsw-alias-border-l2); cursor: pointer; position: relative; flex: none;
        transition: background .15s ease;
      }
      .cr-switch[aria-checked="true"] { background: var(--dsw-alias-brand-primary); }
      .cr-switch-knob {
        position: absolute; top: 2px; left: 2px; width: 13px; height: 13px; border-radius: 50%;
        background: #fff; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.24); transition: transform .15s ease;
      }
      .cr-switch[aria-checked="true"] .cr-switch-knob { transform: translateX(12px); }
      .cr-rule-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 7px 12px; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--dsw-alias-border-l1); }
      .cr-field { display: flex; align-items: center; gap: 6px; min-width: 0; }
      .cr-field-condition { flex-basis: 100%; flex-wrap: wrap; gap: 6px; }
      .cr-field-label { font-size: 9px; font-weight: 740; letter-spacing: 0.1em; color: var(--dsw-alias-label-secondary); text-transform: uppercase; white-space: nowrap; }
      .cr-field-caption { font-size: 10px; color: var(--dsw-alias-label-secondary); white-space: nowrap; }
      .cr-area-note { font-size: 9px; color: var(--dsw-alias-label-secondary); opacity: 0.8; margin-left: auto; white-space: nowrap; }
      .cr-swatches { display: flex; align-items: center; gap: 4px; }
      .cr-swatch {
        width: 19px; height: 19px; padding: 0; border-radius: 5.5px; border: 0; cursor: pointer;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
        transition: transform .12s ease, box-shadow .12s ease;
      }
      .cr-swatch:hover { transform: translateY(-1px); }
      .cr-swatch[aria-checked="true"] {
        box-shadow: 0 0 0 2px var(--dsw-alias-bg-layer-2), 0 0 0 3.5px var(--dsw-alias-label-primary), inset 0 1px 0 rgba(255, 255, 255, 0.35);
      }
      .cr-seg { display: inline-flex; align-items: center; gap: 2px; padding: 2px; border-radius: 7px; background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l1); }
      .cr-seg button {
        height: 21px; padding: 0 6px; border: 0; border-radius: 5px; background: transparent;
        color: var(--dsw-alias-label-secondary); font: inherit; font-size: 10.5px; font-weight: 620; cursor: pointer;
      }
      .cr-seg button:hover { color: var(--dsw-alias-label-primary); }
      .cr-seg button[aria-pressed="true"] { background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); }
      .cr-seg button.cr-act-vanish[aria-pressed="true"] { color: var(--dsw-alias-state-error-primary); }
      .cr-seg button.cr-act-spread[aria-pressed="true"] { color: var(--dsw-alias-state-success-primary); }
      .cr-seg-radius button { font-size: 9.5px; font-variant-numeric: tabular-nums; padding: 0 5px; }
      .cr-stepper { display: inline-flex; align-items: center; border: 1px solid var(--dsw-alias-border-l1); border-radius: 7px; overflow: hidden; background: var(--dsw-alias-bg-layer-1); }
      .cr-stepper button { width: 21px; height: 21px; padding: 0; border: 0; background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 13px; cursor: pointer; }
      .cr-stepper button:hover:not(:disabled) { background: var(--dsw-alias-bg-overlay); color: var(--dsw-alias-label-primary); }
      .cr-stepper button:disabled { opacity: 0.28; cursor: default; }
      .cr-stepper span { min-width: 22px; text-align: center; font-size: 10.5px; font-weight: 650; font-variant-numeric: tabular-nums; }
      .cr-add-rule {
        width: 100%; margin-top: 9px; height: 34px; border-radius: 9px; font: inherit; font-size: 11.5px;
        border: 1px dashed var(--dsw-alias-border-l2); background: transparent; color: var(--dsw-alias-label-secondary);
        cursor: pointer; transition: color .15s ease, border-color .15s ease, background .15s ease;
      }
      .cr-add-rule:hover:not(:disabled) { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-brand-primary); background: var(--dsw-alias-bg-layer-2); }
      .cr-add-rule:disabled { opacity: 0.4; cursor: not-allowed; }
      .cr-rule-notes { margin-top: 12px; display: flex; flex-direction: column; gap: 5px; }
      .cr-rule-notes p { margin: 0; font-size: 10px; line-height: 1.6; color: var(--dsw-alias-label-secondary); }
      .cr-rule-reset-note { opacity: 0.82; }
      @keyframes cr-piece-in {
        0% { transform: scale(0.55); opacity: 0; }
        70% { transform: scale(1.04); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes cr-ghost-in {
        from { transform: translate(-50%, -50%) scale(0.4); opacity: 0; }
        to { transform: translate(-50%, -50%) scale(1); opacity: 0.66; }
      }
      @keyframes cr-result-in {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes cr-win {
        0% { transform: scale(1); }
        38% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
      @media (max-width: 1120px) {
        .cr-layout { grid-template-columns: minmax(0, 1fr); }
        .cr-side { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; }
      }
      @media (max-width: 840px) {
        .cr-page { padding: 18px 16px 36px; }
        .cr-hero { align-items: flex-start; }
        .cr-levels { width: 100%; }
        .cr-side { grid-template-columns: minmax(0, 1fr); }
        .cr-board-head { flex-wrap: wrap; }
        .cr-board-meta { justify-content: flex-start; }
        .cr-speed { margin-left: 0; width: 100%; }
      }
      @media (max-width: 560px) {
        .cr-page { padding: 14px 11px 30px; }
        .cr-shell { gap: 15px; }
        .cr-title { font-size: 23px; }
        .cr-subtitle { font-size: 12px; }
        .cr-card-pad { padding: 15px 14px 17px; }
        .cr-board-head { padding: 14px 14px 10px; }
        .cr-board-wrap { padding: 0 14px; }
        .cr-result { margin: 0 14px 12px; }
        .cr-step-strip, .cr-legend, .cr-paintbar, .cr-controls { padding-left: 14px; padding-right: 14px; }
        .cr-board { gap: 2px; padding: 6px; }
        .cr-cell { border-radius: 4px; }
        .cr-legend { gap: 6px 9px; }
        .cr-legend-name { display: none; }
        .cr-btn { flex: 1 1 auto; }
        .cr-btn-run { min-width: 0; }
        .cr-result-actions { margin-left: 0; width: 100%; }
        .cr-result-actions .cr-btn { flex: 1; }
        .cr-field-condition { gap: 5px; }
        .cr-area-note { margin-left: 0; }
      }
      @media (prefers-reduced-motion: reduce) {
        .cr-piece, .cr-ghost, .cr-result, .cr-board.is-win .cr-piece { animation: none !important; }
        .cr-objective-fill, .cr-switch-knob, .cr-level, .cr-btn { transition: none !important; }
      }
    `;

    return {
      inject: ['slots'],
      apply(ctx) {
        localeFace = ctx.get('locale') || null;
        if (localeFace && typeof localeFace.bind === 'function') {
          try { localeBinding = localeFace.bind(NS); } catch (error) { localeBinding = null; }
        }
        if (localeFace && typeof localeFace.register === 'function') {
          ctx.effect(function () {
            const disposers = [];
            for (let i = 0; i < LOCALE_IDS.length; i++) {
              const localeId = LOCALE_IDS[i];
              const dictionary = localeId === 'en' ? EN : ZH;
              try { disposers.push(localeFace.register(NS, localeId, dictionary)); } catch (error) { /* optional locale */ }
            }
            return function () {
              for (let i = 0; i < disposers.length; i++) {
                try { disposers[i](); } catch (error) { /* already disposed */ }
              }
            };
          }, 'chromatic-rules locale');
        }

        ctx.slots.inject('sidebar.panellist', function () {
          return ctx.slots.register({
            name: 'sidebar.panellist',
            id: 'chromatic-rules',
            order: 20,
            label: function () { return translate('nav'); },
          }, NavGlyph);
        });
        ctx.slots.inject('main', function () {
          return ctx.slots.register({
            name: 'main',
            key: 'chromatic-rules',
          }, GamePanel);
        });
      },
    };
  },
});
