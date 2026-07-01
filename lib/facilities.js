/*
  lib/facilities.js: 设施系统 (GSG树形结构)
  机房为根节点（自带），所有设施mk1依赖机房，mkn依赖mkn-1。
  包含设施类、效果常量、升级逻辑和UI交互。
*/

/* ===== 设施树定义常量 ===== */
// { id: { name, desc, icon, maxLevel } }
// 机房为根节点，始终拥有；其他设施初始0级（未建造），升级后获得对应mk等级
const FACILITY_DEFS = {
  computer_room: { name: '机房', desc: '核心设施，所有其他设施的前置条件', icon: '', maxLevel: 1 },
  computer:      { name: '计算机', desc: '训练效果提升乘区', icon: '', maxLevel: 4 },
  network:       { name: '网络', desc: '模拟赛效果提升', icon: '', maxLevel: 3 },
  fan:           { name: '电扇', desc: '提升舒适度', icon: '', maxLevel: 1 },
  ac:            { name: '空调', desc: '提升舒适度，缓解极端天气影响', icon: '', maxLevel: 2 },
  library:       { name: '资料库', desc: '提供额外备选题目 + 训练效果提升', icon: '', maxLevel: 4 }
};

/* ===== 设施效果常量（临时数值，后续可调整） ===== */

/* 计算机：训练效果（思维/代码）乘区增量。index=等级, mk1=0%加成, mk4=+30% */
const COMPUTER_EFFECT = [0, 0.00, 0.10, 0.20, 0.30];

/* 网络：模拟赛收益乘区增量。index=等级, mk1=+8%, mk3=+25% */
const NETWORK_MOCK_EFFECT = [0, 0.08, 0.16, 0.25];

/* 电扇：舒适度加成。index=等级, mk1=+6 */
const FAN_COMFORT = [0, 6.0];

/* 空调：舒适度加成。index=等级, mk1=+8, mk2=+14 */
const AC_COMFORT = [0, 8.0, 14.0];

/* 资料库：额外备选题目数量。index=等级, mk1=+1题, mk4=+4题 */
const LIBRARY_EXTRA_TASKS = [0, 1, 2, 3, 4];

/* 资料库：训练效果（知识）乘区增量。index=等级, mk1=+0%, mk4=+20% */
const LIBRARY_EFFECT = [0, 0.00, 0.08, 0.14, 0.20];

/* 极端天气舒适度惩罚（分级，取决于制冷设施等级） */
const WEATHER_PENALTY_NONE   = 22.0;  /* 无电扇无空调 */
const WEATHER_PENALTY_FAN    = 16.0;  /* 仅有电扇 */
const WEATHER_PENALTY_AC_MK1 = 10.0;  /* 空调mk1 */
const WEATHER_PENALTY_AC_MK2 = 4.0;   /* 空调mk2 */

/* 极端天气训练压力因子（分级） */
const WEATHER_FACTOR_NONE   = 1.50;  /* 无电扇无空调 */
const WEATHER_FACTOR_FAN    = 1.35;  /* 仅有电扇 */
const WEATHER_FACTOR_AC_MK1 = 1.20;  /* 空调mk1 */
const WEATHER_FACTOR_AC_MK2 = 1.00;  /* 空调mk2完全抵消 */

/* ===== 维护费用常量（临时数值） ===== */
// 基础维护费：除空调外，总维护费 = sum(level × base)；空调特殊见下方
const MAINTENANCE_BASE = {
  computer_room: 50,   /* 机房固定维护费 */
  computer: 120,       /* 计算机每级 +120 */
  network: 150,        /* 网络每级 +150 */
  fan: 40,             /* 电扇固定维护费 */
  ac: 200,             /* 空调基础维护费（但等级越高越低，见 AC_MAINTENANCE_DECAY） */
  library: 80          /* 资料库每级 +80 */
};

/* 空调维护费递减系数：维护费 = MAINTENANCE_BASE.ac * (AC_MAINTENANCE_DECAY ^ (level-1)) */
/* mk1 = 200, mk2 = 200 * 0.65 = 130 */
const AC_MAINTENANCE_DECAY = 0.65;

/* ===== 升级费用常量（临时数值） ===== */
// 升级到下一级的费用 = base * (growth ^ currentLevel)
// currentLevel=0 时费用为 base（即从无到mk1）
const UPGRADE_COST_BASE = {
  computer: 20000,
  network: 25000,
  fan: 5000,
  ac: 15000,
  library: 15000
};
const UPGRADE_COST_GROWTH = {
  computer: 1.6,
  network: 1.7,
  fan: 1.0,     /* 电扇仅1级，growth无实际作用 */
  ac: 1.4,
  library: 1.5
};

/* ===== 向后兼容别名（旧存档/代码可能引用旧常量名） ===== */
const MAX_COMPUTER_LEVEL = FACILITY_DEFS.computer.maxLevel;
const MAX_LIBRARY_LEVEL = FACILITY_DEFS.library.maxLevel;
const MAX_OTHER_FACILITY_LEVEL = Math.max(
  FACILITY_DEFS.network.maxLevel,
  FACILITY_DEFS.fan.maxLevel,
  FACILITY_DEFS.ac.maxLevel
);
/* 旧常量（保留以兼容 models.js 中的引用） */
const WEATHER_PENALTY_NO_AC = WEATHER_PENALTY_NONE;
const WEATHER_PENALTY_WITH_AC = WEATHER_PENALTY_AC_MK1;
/* 旧方法名别名（在类中定义） */


/* ===== Facilities 类 ===== */
class Facilities {
  constructor() {
    /* 机房始终为1（自带，不可拆除） */
    this.computer_room = 1;
    /* 其余设施初始为0（未建造）；升级后依次对应 mk1, mk2, ... */
    this.computer = 0;
    this.network = 0;
    this.fan = 0;
    this.ac = 0;
    this.library = 0;
  }

  /* ---- 等级获取 ---- */
  getLevel(fac) {
    const map = {
      computer_room: this.computer_room,
      computer: this.computer,
      network: this.network,
      fan: this.fan,
      ac: this.ac,
      library: this.library
    };
    return (fac in map) ? map[fac] : 0;
  }

  getMaxLevel(fac) {
    const def = FACILITY_DEFS[fac];
    return def ? def.maxLevel : 0;
  }

  getCurrentLevel(fac) { return this.getLevel(fac); }  /* 向后兼容 */

  /* ---- 效果计算 ---- */

  /** 计算机：训练效果乘数（思维/代码加成） */
  getComputerMultiplier() {
    return 1.0 + (COMPUTER_EFFECT[this.computer] || 0);
  }

  /** 网络：模拟赛收益乘数 */
  getNetworkMockMultiplier() {
    return 1.0 + (NETWORK_MOCK_EFFECT[this.network] || 0);
  }

  /** 资料库：训练效果乘数（知识加成） */
  getLibraryMultiplier() {
    return 1.0 + (LIBRARY_EFFECT[this.library] || 0);
  }

  /** 资料库：额外备选题目数 */
  getLibraryExtraTasks() {
    return LIBRARY_EXTRA_TASKS[this.library] || 0;
  }

  /** 总舒适度加成（电扇 + 空调） */
  getComfortBonus() {
    return (FAN_COMFORT[this.fan] || 0) + (AC_COMFORT[this.ac] || 0);
  }

  /** 极端天气舒适度惩罚值 */
  getWeatherPenalty() {
    if (this.ac >= 2) return WEATHER_PENALTY_AC_MK2;
    if (this.ac >= 1) return WEATHER_PENALTY_AC_MK1;
    if (this.fan >= 1) return WEATHER_PENALTY_FAN;
    return WEATHER_PENALTY_NONE;
  }

  /** 极端天气训练压力因子（用于乘到 base_pressure 上） */
  getWeatherFactor() {
    if (this.ac >= 2) return WEATHER_FACTOR_AC_MK2;
    if (this.ac >= 1) return WEATHER_FACTOR_AC_MK1;
    if (this.fan >= 1) return WEATHER_FACTOR_FAN;
    return WEATHER_FACTOR_NONE;
  }

  /* ---- 维护费用 ---- */

  getMaintenanceCost() {
    let total = 0;
    total += MAINTENANCE_BASE.computer_room * this.computer_room;
    total += MAINTENANCE_BASE.computer * this.computer;
    total += MAINTENANCE_BASE.network * this.network;
    total += MAINTENANCE_BASE.fan * this.fan;
    total += MAINTENANCE_BASE.library * this.library;
    /* 空调特殊：等级越高维护越低 */
    if (this.ac >= 1) {
      total += Math.floor(MAINTENANCE_BASE.ac * Math.pow(AC_MAINTENANCE_DECAY, this.ac - 1));
    }
    return total;
  }

  /* ---- 升级逻辑 ---- */

  canUpgrade(fac) {
    if (fac === 'computer_room') return false;
    const current = this.getLevel(fac);
    const max = this.getMaxLevel(fac);
    return current < max;
  }

  getUpgradeCost(fac) {
    if (fac === 'computer_room') return 0;
    const base = UPGRADE_COST_BASE[fac] || 0;
    const growth = UPGRADE_COST_GROWTH[fac] || 1.5;
    const level = this.getLevel(fac);
    return Math.floor(base * Math.pow(growth, level));
  }

  upgrade(fac) {
    if (!this.canUpgrade(fac)) return false;
    if (fac === 'computer') this.computer++;
    else if (fac === 'network') this.network++;
    else if (fac === 'fan') this.fan++;
    else if (fac === 'ac') this.ac++;
    else if (fac === 'library') this.library++;
    else return false;
    return true;
  }

  /* ---- 向后兼容方法 ---- */
  getComputerEfficiency() { return this.getComputerMultiplier(); }
  getLibraryEfficiency() { return this.getLibraryMultiplier(); }
  /* 旧 getCanteenPressureReduction / getDormComfortBonus 不再存在，返回中性值 */
  getCanteenPressureReduction() { return 1.0; }
  getDormComfortBonus() { return 0; }
}

/* ===== 设施升级UI ===== */

/* 设施名称映射 */
const FACILITY_NAMES = {
  computer_room: '机房',
  computer: '计算机',
  network: '网络',
  fan: '电扇',
  ac: '空调',
  library: '资料库'
};

function upgradeFacility(f) {
  let current = game.facilities.getLevel(f);
  let max = game.facilities.getMaxLevel(f);
  if (current >= max) { alert('已达最高等级'); return; }
  let cost = game.facilities.getUpgradeCost(f);
  const mult = (game.getExpenseMultiplier ? game.getExpenseMultiplier() : 1);
  const costAdj = Math.round(cost * mult);
  const name = FACILITY_NAMES[f] || f;

  const modalHtml = `
    <h3>升级设施：${name}</h3>
    <div class="small" style="margin-top:6px">升级到 mk${current + 1} 将扣款 <strong>¥${costAdj}</strong></div>
    <div class="modal-actions" style="margin-top:8px">
      <button class="btn btn-ghost" id="upgrade-cancel">取消</button>
      <button class="btn" id="upgrade-confirm">确认升级</button>
    </div>`;

  showModal(modalHtml);

  const cancelBtn = document.getElementById('upgrade-cancel');
  const confirmBtn = document.getElementById('upgrade-confirm');
  if (cancelBtn) cancelBtn.onclick = () => { try { closeModal(); } catch (e) {} };
  if (confirmBtn) confirmBtn.onclick = () => {
    try {
      if (game.budget < costAdj) { alert('经费不足'); closeModal(); return; }
      game.recordExpense(costAdj, '设施升级：' + name);
      game.facilities.upgrade(f);
      log('设施升级：' + name + ' 到 mk' + (current + 1) + '（基础 ¥' + cost + '，调整后 ¥' + costAdj + '）');
      closeModal();
      renderAll();
    } catch (e) { console.error('upgrade confirm handler error', e); }
  };
}

function showFacilityUpgradeModal() {
  const maintCost = game.facilities.getMaintenanceCost();
  const budget = game.budget;

  /* ===== 树结构定义 ===== */
  // 每行设施的 mk 链: facility_id -> [mk1, mk2, ...]
  const facilityChains = [
    { id: 'computer', mks: [1, 2, 3, 4] },
    { id: 'network',  mks: [1, 2, 3] },
    { id: 'fan',      mks: [1] },
    { id: 'ac',       mks: [1, 2] },
    { id: 'library',  mks: [1, 2, 3, 4] }
  ];

  // 最大列数（机房列 + maxMks）
  const maxMks = Math.max(...facilityChains.map(c => c.mks.length));

  /* ===== 构建节点数据 ===== */
  // 每个节点: { col, row, facId(非机房), mkLevel, status, def, cardId }
  const nodes = [];

  // 机房节点
  const rootNode = {
    col: 0, row: 0,
    facId: 'computer_room', mkLevel: 0,
    status: 'built',
    def: FACILITY_DEFS.computer_room,
    cardId: 'tree-card-root'
  };
  nodes.push(rootNode);

  // 按列(纵列)构建节点，每列对应mk等级
  const mult = (game.getExpenseMultiplier ? game.getExpenseMultiplier() : 1);

  for (let colIdx = 0; colIdx < maxMks; colIdx++) {
    const mkLevel = colIdx + 1; // mk1, mk2, ...
    let rowIdx = 0;
    for (const chain of facilityChains) {
      if (colIdx >= chain.mks.length) continue; // 此链没有这个mk等级
      const facId = chain.id;
      const currentMk = game.facilities.getLevel(facId);
      const def = FACILITY_DEFS[facId];

      let status;
      if (currentMk >= mkLevel) {
        status = 'built';
      } else if (currentMk === mkLevel - 1) {
        status = 'available';
      } else {
        status = 'locked';
      }

      const cost = game.facilities.getUpgradeCost(facId);
      const costAdj = Math.round(cost * mult);

      nodes.push({
        col: colIdx + 1, // col 1..maxMks
        row: rowIdx,
        facId: facId,
        mkLevel: mkLevel,
        status: status,
        def: def,
        cardId: 'tree-card-' + facId + '-' + mkLevel,
        costAdj: costAdj
      });
      rowIdx++;
    }
  }

  /* 最大行数（用于设置包装器高度） */
  const maxRows = Math.max(
    ...facilityChains.map((c, i) => {
      let count = 0;
      for (let col = 0; col < maxMks; col++) {
        if (col < c.mks.length) count++;
      }
      return count;
    })
  );
  // 实际最大行数 = 各列的最大行数
  const rowsPerCol = [1]; // col 0: just root
  for (let col = 0; col < maxMks; col++) {
    let cnt = 0;
    for (const chain of facilityChains) {
      if (col < chain.mks.length) cnt++;
    }
    rowsPerCol.push(cnt);
  }

  /* ===== 构建 HTML ===== */
  let colsHtml = '';

  // 列0: 机房
  const rootDef = FACILITY_DEFS.computer_room;
  colsHtml += `
    <div class="facility-tree-col" data-col="0">
      <div class="facility-tree-col-label">根节点</div>
      <div class="facility-tree-card root-node status-built" id="tree-card-root" data-fac="computer_room" data-mk="0" data-status="built">
        <div class="facility-tree-card-header">
          <span class="facility-tree-card-icon">${rootDef.icon}</span>
          <span class="facility-tree-card-name">${rootDef.name}</span>
        </div>
        <div class="facility-tree-card-level">Lv.1</div>
        <div class="facility-tree-card-desc">${rootDef.desc}</div>
      </div>
    </div>`;

  // 其余列: mk1, mk2, ...
  for (let col = 1; col <= maxMks; col++) {
    let colCardsHtml = '';
    for (const node of nodes) {
      if (node.col !== col) continue;
      const statusLabel = node.status === 'built' ? '已建造' : node.status === 'available' ? '可升级' : '未解锁';
      const statusClass = 'status-' + node.status;
      const mkLabel = 'mk' + node.mkLevel;

      colCardsHtml += `
        <div class="facility-tree-card ${statusClass}" id="${node.cardId}"
             data-fac="${node.facId}" data-mk="${node.mkLevel}" data-status="${node.status}" data-cost="${node.costAdj}">
          <div class="facility-tree-card-header">
            <span class="facility-tree-card-icon">${node.def.icon}</span>
            <span class="facility-tree-card-name">${node.def.name}</span>
          </div>
          <div class="facility-tree-card-level">${mkLabel} · ${statusLabel}</div>
          <div class="facility-tree-card-desc">${node.def.desc}</div>
          ${node.status === 'available' ? '<div class="facility-tree-card-cost">¥' + node.costAdj.toLocaleString() + '</div>' : ''}
          ${node.status === 'built' ? '<div class="facility-tree-card-cost" style="color:#48bb78;">已建造</div>' : ''}
          ${node.status === 'locked' ? '<div class="facility-tree-card-cost" style="color:#a0aec0;">需前置</div>' : ''}
        </div>`;
    }
    const colLabel = 'mk' + col;
    colsHtml += `
      <div class="facility-tree-col" data-col="${col}">
        <div class="facility-tree-col-label">${colLabel}</div>
        ${colCardsHtml}
      </div>`;
  }

  /* ===== 完整弹窗 HTML ===== */
  const modalHtml = `
    <h3 style="margin:0 0 4px 0; font-size:20px; color:#1f2937;">设施升级</h3>
    <div class="small" style="margin-bottom:10px; padding:8px 12px; background:#f0f9ff; border-radius:6px; border:1px solid #bfdbfe; display:flex; gap:20px; flex-wrap:wrap;">
      <span style="color:#1e40af;">当前经费: <strong>¥${budget.toLocaleString()}</strong></span>
      <span style="color:#1e40af;">每周维护费: <strong>¥${maintCost.toLocaleString()}</strong></span>
    </div>
    <div style="margin-bottom:6px; font-size:12px; color:#94a3b8; display:flex; gap:16px; flex-wrap:wrap;">
      <span>🟢 已建造</span><span>🟠 可升级</span><span>⚪ 未解锁</span><span style="color:#2b6cb0;">左键点击选择</span>
    </div>
    <div class="facility-tree-wrapper" id="facility-tree-wrapper">
      <div class="facility-tree-layout" id="facility-tree-layout">
        ${colsHtml}
      </div>
    </div>
    <div class="facility-upgrade-bar" id="facility-upgrade-bar">
      <div class="facility-upgrade-bar-info" id="facility-upgrade-bar-info">
        <span style="color:#a0aec0;">点击左侧卡片选择要升级的设施</span>
      </div>
      <button class="facility-upgrade-btn" id="facility-upgrade-btn" disabled>升级</button>
    </div>
    <div class="modal-actions" style="margin-top:10px; text-align:right;">
      <button class="btn" id="facility-modal-close" style="padding:8px 20px;">关闭</button>
    </div>
  `;

  showModal(modalHtml);

  // 将弹窗设为宽版以容纳树状图
  const dialogEl = document.querySelector('#modal-root .dialog');
  if (dialogEl) dialogEl.classList.add('dialog-wide');

  /* ===== 交互逻辑 ===== */
  let selectedNode = null;

  // 关闭按钮
  const closeBtn = document.getElementById('facility-modal-close');
  if (closeBtn) {
    closeBtn.onclick = () => { closeModal(); };
  }

  // 卡片点击
  const allCards = document.querySelectorAll('.facility-tree-card');
  allCards.forEach(card => {
    card.addEventListener('click', function(e) {
      const status = this.dataset.status;
      if (status === 'locked') return; // 锁定状态不可选

      // 取消所有选中
      allCards.forEach(c => c.classList.remove('selected'));
      // 选中当前
      this.classList.add('selected');
      selectedNode = this;

      // 更新升级栏
      const upgradeBarInfo = document.getElementById('facility-upgrade-bar-info');
      const upgradeBtn = document.getElementById('facility-upgrade-btn');
      const facId = this.dataset.fac;
      const mk = parseInt(this.dataset.mk);
      const cost = parseInt(this.dataset.cost) || 0;
      const def = FACILITY_DEFS[facId];
      const name = def ? def.name : facId;

      if (status === 'built') {
        upgradeBarInfo.innerHTML = '<span class="selected-name">' + name + ' mk' + mk + '</span> 已建造完成，无需升级';
        upgradeBtn.disabled = true;
        upgradeBtn.textContent = '已建造';
        upgradeBtn.classList.remove('cant-afford');
      } else if (status === 'available') {
        const canAfford = budget >= cost;
        upgradeBarInfo.innerHTML = '升级 <span class="selected-name">' + name + '</span> 到 mk' + mk + '，费用 <span class="selected-cost">¥' + cost.toLocaleString() + '</span>';
        upgradeBtn.disabled = false;
        upgradeBtn.textContent = canAfford ? '升级' : '经费不足';
        if (!canAfford) {
          upgradeBtn.classList.add('cant-afford');
        } else {
          upgradeBtn.classList.remove('cant-afford');
        }
      }
    });
  });

  // 升级按钮
  const upgradeBtn = document.getElementById('facility-upgrade-btn');
  if (upgradeBtn) {
    upgradeBtn.onclick = () => {
      if (!selectedNode) return;
      const facId = selectedNode.dataset.fac;
      const cost = parseInt(selectedNode.dataset.cost) || 0;
      if (game.budget < cost) { alert('经费不足！'); return; }
      if (facId === 'computer_room') return;
      closeModal();
      setTimeout(() => upgradeFacility(facId), 100);
    };
  }

  /* ===== 绘制连线 (SVG) ===== */
  const resizeHandler = () => {
    drawFacilityTreeLines(nodes, rootNode);
  };

  setTimeout(() => {
    drawFacilityTreeLines(nodes, rootNode);
  }, 150);

  /* 监听窗口resize重新绘制连线 */
  window.addEventListener('resize', resizeHandler);

  /* 关闭时清理：覆盖modal关闭逻辑 */
  const origCloseModal = window.closeModal;
  window.closeModal = function() {
    window.removeEventListener('resize', resizeHandler);
    window.closeModal = origCloseModal;
    if (origCloseModal) origCloseModal();
  };
}

/* ===== 绘制树状连线 ===== */
function drawFacilityTreeLines(nodes, rootNode) {
  const wrapper = document.getElementById('facility-tree-wrapper');
  const layout = document.getElementById('facility-tree-layout');
  if (!wrapper || !layout) return;

  // 移除旧SVG
  const oldSvg = layout.querySelector('.facility-tree-svg');
  if (oldSvg) oldSvg.remove();

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('facility-tree-svg');
  svg.style.position = 'absolute';
  svg.style.top = '0';
  svg.style.left = '0';
  svg.style.width = layout.scrollWidth + 'px';
  svg.style.height = layout.scrollHeight + 'px';
  svg.style.pointerEvents = 'none';
  layout.style.position = 'relative';
  layout.appendChild(svg);

  const layoutRect = layout.getBoundingClientRect();

  // 辅助函数：获取卡片中心坐标（相对于layout）
  function getCardCenter(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return null;
    const cardRect = card.getBoundingClientRect();
    return {
      x: cardRect.left - layoutRect.left + cardRect.width / 2,
      y: cardRect.top - layoutRect.top + cardRect.height / 2
    };
  }

  // 连线：机房 → 各设施mk1，以及 mk(n) → mk(n+1) 同链
  const lineDefs = [];

  // 机房连接到所有mk1
  for (const node of nodes) {
    if (node.col === 1) {
      lineDefs.push({
        from: rootNode.cardId,
        to: node.cardId,
        status: node.status
      });
    }
  }

  // 同一设施链内连线: mk(n) → mk(n+1)
  for (const node of nodes) {
    if (node.col < 1) continue;
    // 查找同facId的下一级
    const nextNode = nodes.find(n => n.facId === node.facId && n.mkLevel === node.mkLevel + 1);
    if (nextNode) {
      lineDefs.push({
        from: node.cardId,
        to: nextNode.cardId,
        status: nextNode.status
      });
    }
  }

  // 绘制连线
  for (const ld of lineDefs) {
    const from = getCardCenter(ld.from);
    const to = getCardCenter(ld.to);
    if (!from || !to) continue;

    let statusClass = 'conn-locked';
    if (ld.status === 'built') statusClass = 'conn-built';
    else if (ld.status === 'available') statusClass = 'conn-available';

    // 使用path画贝塞尔曲线（从右侧中心到左侧中心）
    const midX = (from.x + to.x) / 2;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`);
    path.classList.add(statusClass);
    path.setAttribute('fill', 'none');
    svg.appendChild(path);
  }
}

/* 旧版兼容UI（保留以兼容 game.js 等旧引用） */
function upgradeFacilitiesUI() {
  showFacilityUpgradeModal();
}

/* 暴露到全局作用域 */
window.showFacilityUpgradeModal = showFacilityUpgradeModal;
window.upgradeFacility = upgradeFacility;
window.upgradeFacilitiesUI = upgradeFacilitiesUI;
