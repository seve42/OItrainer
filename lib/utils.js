/* utils.js - 随机/辅助/名字生成函数 */

// ========== 可种子化的随机数生成器 ==========
// 基于 xorshift128+ 算法的简单伪随机数生成器
class SeededRandom {
  constructor(seed) {
    // 当 seed === -1 时，表示显式要求使用原生 Math.random()
    this.useNative = (seed === -1);
    // 如果未指定种子或为 null/undefined，则使用当前时间
    this.seed = (seed === undefined || seed === null) ? Date.now() : seed;
    // 对于非原生模式，使用种子初始化状态
    if (!this.useNative) {
      this.state0 = this.seed ^ 0x12345678;
      this.state1 = (this.seed * 0x9E3779B9) ^ 0x87654321;
    }
  }
  
  next() {
    // 如果构造时选择了原生随机，则直接返回 Math.random()
    if (this.useNative) return Math.random();

    let s1 = this.state0;
    let s0 = this.state1;
    this.state0 = s0;
    s1 ^= s1 << 23;
    s1 ^= s1 >> 17;
    s1 ^= s0;
    s1 ^= s0 >> 26;
    this.state1 = s1;
    const result = (this.state0 + this.state1) >>> 0;
    return result / 0x100000000;
  }
}

// 全局随机数生成器实例
let _globalRng = null;

// 设置全局种子
function setRandomSeed(seed) {
  if (seed !== null && seed !== undefined) {
    // 允许通过 -1 明确请求使用原生 Math.random()
    _globalRng = new SeededRandom(seed);
    if (seed === -1) {
      console.log('[Random] 已设置为使用原生 Math.random()（种子 -1）');
    } else {
      console.log(`[Random] 随机种子已设置: ${seed}`);
    }
  } else {
    _globalRng = null;
    console.log(`[Random] 使用默认随机数生成器`);
  }
}

// 获取随机数（0-1之间）
function getRandom() {
  if (_globalRng) {
    return _globalRng.next();
  }
  return Math.random();
}

function uniform(min, max){ return min + getRandom()*(max-min); }
function uniformInt(min, max){ return Math.floor(min + getRandom()*(max - min + 1)); }
function normal(mean=0, stddev=1){
  let u=0,v=0;
  while(u===0) u=getRandom();
  while(v===0) v=getRandom();
  let z=Math.sqrt(-2.0*Math.log(u))*Math.cos(2*Math.PI*v);
  return z*stddev + mean;
}
function clamp(val,min,max){ return Math.max(min,Math.min(max,val)); }
function clampInt(v,min,max){ return Math.max(min,Math.min(max,Math.round(v))); }
function sigmoid(x){ return 1.0 / (1.0 + Math.exp(-x)); }

/* 今日挑战：根据日期生成种子和挑战参数 */
function getDailyChallengeParams() {
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  
  // 使用日期字符串作为种子生成随机数
  function seededRandom(seed) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }
  
  const seed = parseInt(dateStr);
  
  // 使用种子生成省份（1-33之间）
  const provinceId = Math.floor(seededRandom(seed) * 33) + 1;
  
  // 使用种子生成初始随机种子（用于游戏内RNG）
  const gameSeed = Math.floor(seededRandom(seed + 1) * 1000000);
  
  return {
    date: dateStr,
    provinceId: provinceId,
    difficulty: 2, // 固定普通难度
    seed: gameSeed,
    displayDate: `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`
  };
}

function getLetterGradeAbility(val){
    return getLetterGrade(val / 2);
}

function getLetterGrade(val) {
  // 更细化的字母等级，包含带+的中间值。阈值略微上调以匹配数值显示
  // 等级（从低到高）： E, E+, D, D+, C, C+, B, B+, A, A+, S, S+, SS, SS+, SSS
  if (val < 8) return 'E';
  if (val < 16) return 'E+';
  if (val < 30) return 'D';
  if (val < 40) return 'D+';
  if (val < 50) return 'C';
  if (val < 60) return 'C+';
  if (val < 68) return 'B';
  if (val < 76) return 'B+';
  if (val < 82) return 'A';
  if (val < 88) return 'A+';
  if (val < 92) return 'S';
  if (val < 96) return 'S+';
  if (val < 99) return 'SS';
  if (val < 100) return 'SS+';
  // 保持 100 为 SSS，且在 100 之后扩展为不封顶的 U 级别：U1e ... U1sss, U2e ...
  const n = Math.floor(val);
  if (n === 100) return 'SSS';
  if (n > 100) {
    const subs = ['e','e+','d','d+','c','c+','b','b+','a','a+','s','s+','ss','ss+','sss'];
    const v = Number(val);
    // 保留 101-109 的向后兼容整数步进映射（原有行为）
    if (v > 100 && v < 110) {
      const offset = n - 101; // 0-based offset after 100
      const tier = Math.floor(offset / subs.length) + 1;
      const idx = offset % subs.length;
      return `U${tier}${subs[idx]}`;
    }
    // 从 110 起，每个 100 的区间对应 U1, U2, U3...，区间内按 subs 均匀映射
    if (v >= 110) {
      const tier = Math.floor((v - 110) / 100) + 1; // 110-209.999 -> tier 1, 210-309.999 -> tier 2
      const rangeStart = 110 + (tier - 1) * 100;
      const rel = (v - rangeStart) / 100.0; // [0,1)
      let idx = Math.floor(rel * subs.length);
      if (idx < 0) idx = 0;
      if (idx >= subs.length) idx = subs.length - 1;
      return `U${tier}${subs[idx]}`;
    }
    // 兜底：保留原有按整数步进的映射
    const offset = n - 101;
    const tier = Math.floor(offset / subs.length) + 1;
    const idx = offset % subs.length;
    return `U${tier}${subs[idx]}`;
  }
  return 'SSS';
}

// 名字生成（基于 ./data/result.csv）
// 支持在 Node 环境下读取文件并构建按省份加权的姓名池。
// 解析逻辑对输入格式做了容错处理：示例行可能包含额外年份字段，分数列位置会尝试多个候选索引。

const provinceNames = [
  "安徽","北京","福建","甘肃","广东","广西","贵州","海南","河北","河南","黑龙江","湖北","湖南","吉林","江苏","江西","辽宁","内蒙古","山东","山西","陕西","上海","四川","天津","新疆","浙江","重庆","宁夏","云南","澳门","香港","青海","西藏","台湾"
];

// 内部存储：按省份 id 映射到 [{name, weight}]
let _namePoolsByProvince = {};
let _globalNamePool = [];

function _parseParticipationField(partStr){
  if(!partStr || typeof partStr !== 'string') return [];
  return partStr.split('/').map(seg => {
    const toks = seg.split(':');
    // expected: [matchId, schoolId, score, rank, provinceId, unknown]
    const matchId = toks[0] ? parseInt(toks[0],10) : NaN;
    const provinceId = (toks[4] !== undefined) ? parseInt(toks[4],10) : NaN;
    return { matchId: isNaN(matchId) ? null : matchId, provinceId: isNaN(provinceId) ? null : provinceId };
  }).filter(x => x && x.matchId !== null);
}

function buildNamePoolsFromResultCsv(filePath='./data/result.csv'){
  // attempt Node fs read; in browser this is a no-op and returns false
  try{
  const fs = require('fs');
  try{ console.debug('[buildNamePoolsFromResultCsv] reading file:', filePath); }catch(e){}
    if(!fs.existsSync(filePath)) return false;
    const raw = fs.readFileSync(filePath, 'utf8');
    return parseResultCsvContent(raw);
  }catch(e){
    // not running in Node or fs not available
    try{ console.error('[buildNamePoolsFromResultCsv] error:', e && e.stack ? e.stack : e); }catch(_){}
    return false;
  }
}

// Parse CSV text content and populate _namePoolsByProvince/_globalNamePool
function parseResultCsvContent(raw){
  try{
    const lines = String(raw).split(/\r?\n/).map(l=>l.trim()).filter(l=>l.length>0);
    // first pass: gather all participation match ids to find max
    let allMatchIds = [];
    // console.log(11121);
    // console.log(lines);
    // console.log(111);
    const rows = [];
    for(const line of lines){
      const parts = line.split(',').map(p=>p.trim());
      const partField = parts[parts.length - 1] || '';
      const partsParsed = _parseParticipationField(partField);
      for(const p of partsParsed) if(p.matchId !== null) allMatchIds.push(p.matchId);
      rows.push({ parts, partsParsed });
    }

    let maxMatchId = 0;
    if(allMatchIds.length){ for(const v of allMatchIds){ if(typeof v === 'number' && v > maxMatchId) maxMatchId = v; } }
    const threshold = Math.max(maxMatchId - 9,0);

    // clear pools
    _namePoolsByProvince = {};
    _globalNamePool = [];
    for(const row of rows){
      const parts = row.parts;
      const partsParsed = row.partsParsed;
      if(partsParsed.length === 0) continue;
      const hasRecent = partsParsed.some(p => (p.matchId !== null && p.matchId >= threshold));
      if(!hasRecent) continue;
      const name = (parts[2] && parts[2].length>0) ? parts[2] : (parts[1] || '').trim();
      if(!name) continue;
      let score = NaN; const candidateScoreIdx = [5,4,6,3];
      for(const idx of candidateScoreIdx){ if(idx < parts.length){ const v = parseFloat(parts[idx]); if(!isNaN(v)){ score = v; break; } } }
      if(isNaN(score)) continue;
      // 支持多个省份：将同一条记录加入所有相关省份的池中
      const weight = Math.pow(Math.max(0, Number(score) || 0), 0.9);
      const provSet = new Set();
      for (const p of partsParsed) {
        if (p.provinceId === null || isNaN(p.provinceId)) continue;
        const prov = Number(p.provinceId);
        // 数据保证为规范的 0-based 省份 id：直接使用，不做 1-based -> 0-based 的兼容处理
        if (prov >= 0 && prov < provinceNames.length) provSet.add(prov);
      }
      if (provSet.size === 0) continue;
      for (const provId of provSet) {
        _namePoolsByProvince[provId] = _namePoolsByProvince[provId] || [];
        const pool = _namePoolsByProvince[provId];
        if (pool.length >= 150) continue;
        // 避免在同一省份池中插入重复姓名
        if (!pool.some(item => item && item.name === name)) {
          pool.push({ name, weight });
        }
      }
      _globalNamePool.push({ name, weight: Math.pow(Math.max(0, Number(score) || 0),0.9) });
    }
    for(const k of Object.keys(_namePoolsByProvince)){ const arr = _namePoolsByProvince[k]; arr._weightSum = arr.reduce((s,a)=>s + (a.weight||0), 0);}
    _globalNamePool._weightSum = _globalNamePool.reduce((s,a)=>s + (a.weight||0), 0);
    // simple summary log
    try{
      const totalNames = Object.values(_namePoolsByProvince).reduce((s,a)=>s + (Array.isArray(a)?a.length:0), 0);
      console.info('[parseResultCsvContent] loaded name pools. totalNames=', totalNames, 'provincesWithNames=', Object.keys(_namePoolsByProvince).length);
    }catch(e){}
    try{ if(typeof window !== 'undefined') window._namePoolsByProvince = _namePoolsByProvince; }catch(e){}
    return true;
  }catch(e){ try{ console.error('[parseResultCsvContent] error:', e && e.stack ? e.stack : e); }catch(_){ } return false; }
}

/**
 * preloadNamePools(source)
 * - source can be:
 *    - string containing CSV text (synchronous)
 *    - Node file path string (will attempt to read fs) when run in Node
 *    - Browser File object (returns Promise)
 * Returns: boolean (sync) or Promise<boolean> for File.
 */
function preloadNamePools(source){
  try{ console.debug('[preloadNamePools] called with source type:', typeof source); }catch(e){}
  // Browser File -> async
  if(typeof File !== 'undefined' && source instanceof File){
    return new Promise((resolve, reject)=>{
      const reader = new FileReader();
      reader.onload = function(e){ try{ const ok = parseResultCsvContent(String(e.target.result||'')); resolve(Boolean(ok)); }catch(err){ reject(err); } };
      reader.onerror = function(err){ reject(err); };
      reader.readAsText(source, 'utf-8');
    });
  }
  // If string contains newline, treat as CSV content
  if(typeof source === 'string' && source.indexOf('\n') !== -1){
    try{ console.debug('[preloadNamePools] parsing CSV text source, length=', source.length); }catch(e){}
    return parseResultCsvContent(source);
  }
  // If Node path and in Node, delegate to buildNamePoolsFromResultCsv
  if(typeof source === 'string' && (typeof require === 'function' && typeof process !== 'undefined' && process.versions && process.versions.node)){
    try{ console.debug('[preloadNamePools] treating source as file path:', source); }catch(e){}
    return buildNamePoolsFromResultCsv(source);
  }
  // In browser, if given a URL path string, try fetching it asynchronously and parse
  if(typeof source === 'string' && typeof window !== 'undefined' && typeof fetch === 'function'){
    try{ console.debug('[preloadNamePools] fetching CSV from URL:', source); }catch(e){}
    return fetch(source, {cache: 'no-cache'})
      .then(resp => { if(!resp.ok) return false; return resp.text(); })
      .then(text => { if(!text) return false; return parseResultCsvContent(text); })
      .catch(err => { try{ console.warn('[preloadNamePools] fetch failed', err); }catch(_){}; return false; });
  }
  return false;
}

function _weightedPick(list, used){
  if(!Array.isArray(list) || list.length===0) return null;
  const sum = list._weightSum || list.reduce((s,a)=>s + (a.weight||0), 0);
  if(sum <= 0){ // fallback to uniform
    // pick random unused
    const avail = list.map(x=>x.name).filter(n => !used || !used.has(n));
    if(avail.length === 0) return null;
    return avail[Math.floor(getRandom()*avail.length)];
  }
  let r = getRandom() * sum;
  let acc = 0;
  for(const p of list){
    acc += (p.weight || 0);
    if(r <= acc){ if(!used || !used.has(p.name)) return p.name; else break; }
  }
  // if chosen name used, fallback to deterministic scan for unused
  for(const p of list){ if(!used || !used.has(p.name)) return p.name; }
  return null;
}

function generateNameByProvince(provinceId, used = new Set()){
  // ensure pools exist; if not, attempt to build from default path (Node only)
  if(Object.keys(_namePoolsByProvince).length === 0){ 
    // If pools empty, try to auto-build.
    // In Node: try fs read. In browser: as a last-resort attempt a synchronous same-origin fetch of ./data/result.csv
    if(typeof require === 'function' && typeof process !== 'undefined' && process.versions && process.versions.node){
      buildNamePoolsFromResultCsv('./data/result.csv') || buildNamePoolsFromResultCsv('./data/result.csv');
    } else {
      // Browser environment: try synchronous XHR to same-origin ./data/result.csv as a last-resort (only works when served from same host)
      try{ _buildPoolsFromUrlSync('./data/result.csv') || _buildPoolsFromUrlSync('data/result.csv'); }catch(e){}
    }
    // In browser, do NOT attempt synchronous XHR/fetch here; instead the page should call preloadNamePools() or use the local-file UI provided below.
  }
  // clamp province; accept either 0-based or 1-based provinceId
  let provKey = provinceId;
  if(typeof provKey !== 'number' || !(provKey in _namePoolsByProvince)){
    // try 1-based -> 0-based conversion
    if(typeof provKey === 'number' && (provKey - 1) in _namePoolsByProvince){ provKey = provKey - 1; }
  }
  if(typeof provKey !== 'number' || !(provKey in _namePoolsByProvince)){
    // fallback: global pool
    try{ console.debug('[generateNameByProvince] province missing or invalid, falling back to global pool. requestedProvince=', provinceId, 'resolvedKey=', provKey); }catch(e){}
    const name = _weightedPick(_globalNamePool, used);
    if(name){ used.add(name); return name; }
    // pools empty -> synthetic fallback
    const synth = _syntheticName(used);
    try{ console.info('[generateNameByProvince] using synthetic fallback name=', synth); }catch(e){}
    used.add(synth);
    return synth;
  }
  // use resolved provKey (handles 1-based -> 0-based fallback)
  const pk = (typeof provKey === 'number') ? provKey : parseInt(provKey, 10);
  const pool = _namePoolsByProvince[pk] || [];
  const name = _weightedPick(pool, used) || _weightedPick(_globalNamePool, used);
  if(name) used.add(name);
  return name;
}

// attempt to auto-build when running in Node: try relative ./data first, then absolute ./data
try{
  // Only attempt in Node-like environment where require is defined
  if(typeof require === 'function' && typeof process !== 'undefined' && process.versions && process.versions.node){
    const tried = buildNamePoolsFromResultCsv('./data/result.csv') || buildNamePoolsFromResultCsv('./data/result.csv');
    if(!tried) {
      try{ console.debug('[buildNamePools] no data file found at ./data/result.csv or ./data/result.csv'); }catch(e){}
    }
  }
}catch(e){}

// export
try{ if(typeof window !== 'undefined'){ window.generateNameByProvince = generateNameByProvince; window.buildNamePoolsFromResultCsv = buildNamePoolsFromResultCsv; window._namePoolsByProvince = _namePoolsByProvince; } }catch(e){}
try{ if(typeof window !== 'undefined'){ window.preloadNamePools = preloadNamePools; } }catch(e){}

// Browser synchronous fetch helper (used only as last-resort during init)
function _buildPoolsFromUrlSync(url){
  try{
    if(typeof window === 'undefined' || typeof XMLHttpRequest === 'undefined') return false;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, false); // synchronous
    xhr.send(null);
    if(xhr.status === 200 || xhr.status === 0){
      return parseResultCsvContent(xhr.responseText);
    }
  }catch(e){ try{ console.warn('[buildPoolsFromUrlSync] failed to fetch', url, e); }catch(_){}}
  return false;
}


const OIERDB_PROVINCES=["安徽","北京","福建","甘肃","广东","广西","贵州","海南","河北","河南","黑龙江","湖北","湖南","吉林","江苏","江西","辽宁","内蒙古","山东","山西","陕西","上海","四川","天津","新疆","浙江","重庆","宁夏","云南","澳门","香港","青海","西藏","台湾"];
// Backwards compatible generateName() used by game.js: pick from global pool or random province
function generateName(province=-1,used = new Set()){
  // ensure pools built in Node (do not attempt in browser)
  if(Object.keys(_namePoolsByProvince).length === 0){ 
    if(typeof require === 'function' && typeof process !== 'undefined' && process.versions && process.versions.node){
      try{ buildNamePoolsFromResultCsv('./data/result.csv') || buildNamePoolsFromResultCsv('./data/result.csv'); }catch(e){}
    } else {
      try{ _buildPoolsFromUrlSync('./data/result.csv') || _buildPoolsFromUrlSync('data/result.csv'); }catch(e){}
    }
    // In browser, avoid sync network calls; rely on explicit preload or local-file loader UI.
  }
  // prefer global pool if non-empty
  // otherwise pick random province then pick
  const provKeys = Object.keys(_namePoolsByProvince).map(k=>parseInt(k,10)).filter(n=>!isNaN(n));
  if(provKeys.length===0){
    const synth = _syntheticName(used);
    try{ console.info('[generateName] no province keys available, using synthetic fallback:', synth); }catch(e){}
    used.add(synth);
    return synth;
  }
  let oierdb_province;
  if(province<0)oierdb_province=Math.floor(getRandom()*provKeys.length);
  else oierdb_province=OIERDB_PROVINCES.indexOf(PROVINCES[province]['name']);
  const pid = provKeys[oierdb_province];
  try{ console.debug('[generateName] falling back to random province pick pid=', pid); }catch(e){}
  const name = generateNameByProvince(pid, used);
  return name;
}

try{ if(typeof window !== 'undefined'){ window.generateName = generateName; window._globalNamePool = _globalNamePool; } }catch(e){}

// synthetic fallback generator (ensure existence)
function _syntheticName(used){
  return "????"+String(Math.random());
}