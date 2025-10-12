// quick test to verify mock_start only triggers in mock contests
const path = require('path');
const fs = require('fs');
// load the talent and contest-integration files in a vm to simulate browser window
const vm = require('vm');
const window = { console: console, log: console.log };
const sandbox = { window: window, console: console, log: console.log };

function loadFileRel(p){
  const code = fs.readFileSync(p,'utf8');
  new vm.Script(code, {filename: p}).runInNewContext(sandbox);
}

const base = path.join(__dirname, 'lib');
loadFileRel(path.join(base,'talent.js'));
loadFileRel(path.join(base,'contest-integration.js'));

// create dummy student
const student = {
  name: 'TestStudent',
  thinking: 10, coding: 20, mental: 30,
  triggerTalents: function(eventName, ctx){
    if(typeof this._talentHandlers === 'function') return this._talentHandlers(eventName, ctx);
  }
};

// attach talent registry by instantiating global TalentManager if present
if(typeof sandbox.window !== 'undefined' && typeof sandbox.window.TalentManager !== 'undefined'){
  // assume TalentManager registers talents on construction
  const tm = new sandbox.window.TalentManager();
  // normally talents attach handlers to students through some registration API; for test, we call directly
  // simulate the handler lookup by scanning TalentManager._registered (if present)
  const handlers = (tm && tm._registered) || [];
  // build a simple triggerTalents implementation
  student._talentHandlers = function(eventName, ctx){
    let results = [];
    for(const t of handlers){
      try{ const res = t.handler(student, eventName, ctx); if(res) results.push(res); }catch(e){ console.error(e); }
    }
    return results;
  };

  console.log('--- Trigger mock_start directly (should produce mock_boost) ---');
  console.log(student.triggerTalents('mock_start', {contestName:'模拟赛'}));

  console.log('--- Trigger contest start (should NOT produce mock_boost) ---');
  console.log(student.triggerTalents('contest_start', {contestName:'CSP-S1'}));
} else {
  console.log('TalentManager not present in sandbox; skipping test.');
}
