// ============================================================
// STATE MACHINE
// ============================================================
let cfg = { tapes: 2, heads: 1 };
let currentTool = 'grab';
let states = [];       // {id, label, x, y, type: 'normal'|'accept'|'reject'|'initial'}
let transitions = [];  // {id, from, to, rules:[{read:[...], write:[...], move:[...]}]}
let nextStateId = 0;
let nextTransId = 0;
let selectedId = null;
let arrowFrom = null;

// Runtime
let rt = null; // runtime object

// ============================================================
// TOOL MANAGEMENT
// ============================================================
function setTool(t) {
  currentTool = t;
  document.querySelectorAll('.tool').forEach(el => el.classList.remove('active'));
  document.getElementById('tool-' + t).classList.add('active');
  arrowFrom = null;
  updateHint();
}

const hints = {
  grab: 'click to select, drag to move states',
  state: 'click canvas to add a state',
  accept: 'click canvas to add accept state',
  reject: 'click canvas to add reject state',
  start: 'click a state to mark it as initial',
  arrow: 'click source state, then destination',
  delete: 'click a state or transition to delete'
};
function updateHint() {
  document.getElementById('canvas-hint').textContent = hints[currentTool] || '';
}

// ============================================================
// SVG CANVAS INTERACTIONS
// ============================================================
const svg = document.getElementById('diagram-svg');
const edgesLayer = document.getElementById('edges-layer');
const statesLayer = document.getElementById('states-layer');

svg.addEventListener('click', (e) => {
  if (e.target === svg || e.target.id === 'diagram-svg') {
    const pt = svgPoint(e);
    if (currentTool === 'state') addState(pt.x, pt.y, 'normal');
    else if (currentTool === 'accept') addState(pt.x, pt.y, 'accept');
    else if (currentTool === 'reject') addState(pt.x, pt.y, 'reject');
    else {
      selectedId = null;
      renderDiagram();
    }
  }
});

function svgPoint(e) {
  const rect = svg.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

// ============================================================
// STATE MANAGEMENT
// ============================================================
function addState(x, y, type) {
  const label = type === 'accept' ? 'qA' : type === 'reject' ? 'qR' : 'q' + nextStateId;
  if (type === 'accept' && states.find(s => s.type === 'accept')) { alert('Only one accept state (use table for multi-accept).'); return; }
  if (type === 'reject' && states.find(s => s.type === 'reject')) { alert('Only one reject state.'); return; }
  const initial = states.length === 0 || type === 'initial' ? true : false;
  const s = {
    id: 's' + (nextStateId++),
    label: type === 'accept' ? 'qA' : type === 'reject' ? 'qR' : ('q' + (nextStateId-1)),
    x, y, type,
    initial: states.filter(s=>s.initial).length === 0
  };
  states.push(s);
  renderDiagram();
  syncTableFromDiagram();
}

function deleteState(id) {
  states = states.filter(s => s.id !== id);
  transitions = transitions.filter(t => t.from !== id && t.to !== id);
  if (selectedId === id) selectedId = null;
  renderDiagram();
  syncTableFromDiagram();
}

function deleteTransition(id) {
  transitions = transitions.filter(t => t.id !== id);
  renderDiagram();
  syncTableFromDiagram();
}

// ============================================================
// RENDER DIAGRAM
// ============================================================
function renderDiagram() {
  renderEdges();
  renderStates();
}

function renderStates() {
  statesLayer.innerHTML = '';
  for (const s of states) {
    const g = document.createElementNS('http://www.w3.org/2000/svg','g');
    g.setAttribute('class','state-circle' +
      (s.id === selectedId ? ' selected':'') +
      (s.type === 'accept' ? ' accepting':'') +
      (rt && rt.state === s.label ? ' active':'') +
      (rt && rt.halted && rt.result === 'accept' && s.type==='accept' ? ' halted-accept':'') +
      (rt && rt.halted && rt.result === 'reject' && s.type==='reject' ? ' halted-reject':'')
    );
    g.setAttribute('transform',`translate(${s.x},${s.y})`);
    g.setAttribute('data-id', s.id);

    // outer circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
    circle.setAttribute('r','28');
    circle.setAttribute('fill', s.type==='accept'?'rgba(61,220,132,0.12)':s.type==='reject'?'rgba(255,79,106,0.12)':s.type==='initial'?'rgba(79,140,255,0.1)':'rgba(30,42,69,0.9)');
    circle.setAttribute('stroke', s.type==='accept'?'#3ddc84':s.type==='reject'?'#ff4f6a':s.type==='initial'?'#7c5cfc':'#4f8cff');
    circle.setAttribute('stroke-width','1.5');
    g.appendChild(circle);

    // inner ring for accept
    if (s.type === 'accept') {
      const inner = document.createElementNS('http://www.w3.org/2000/svg','circle');
      inner.setAttribute('r','22');
      inner.setAttribute('fill','none');
      inner.setAttribute('stroke','#3ddc84');
      inner.setAttribute('stroke-width','1');
      inner.setAttribute('opacity','0.6');
      g.appendChild(inner);
    }

    // label
    const text = document.createElementNS('http://www.w3.org/2000/svg','text');
    text.setAttribute('text-anchor','middle');
    text.setAttribute('dominant-baseline','middle');
    text.setAttribute('fill', s.type==='accept'?'#3ddc84':s.type==='reject'?'#ff4f6a':'#e8e8f0');
    text.setAttribute('font-family','JetBrains Mono, monospace');
    text.setAttribute('font-size','11');
    text.setAttribute('font-weight','500');
    text.textContent = s.label;
    g.appendChild(text);

    // initial arrow
    if (s.initial) {
      const arr = document.createElementNS('http://www.w3.org/2000/svg','line');
      arr.setAttribute('x1','-52'); arr.setAttribute('y1','0');
      arr.setAttribute('x2','-30'); arr.setAttribute('y2','0');
      arr.setAttribute('stroke','#7c5cfc'); arr.setAttribute('stroke-width','2');
      arr.setAttribute('marker-end','url(#arrow-normal)');
      g.appendChild(arr);
    }

    // current state indicator ring
    if (rt && rt.state === s.label && !rt.halted) {
      const ring = document.createElementNS('http://www.w3.org/2000/svg','circle');
      ring.setAttribute('r','33');
      ring.setAttribute('fill','none');
      ring.setAttribute('stroke','#4f8cff');
      ring.setAttribute('stroke-width','2');
      ring.setAttribute('opacity','0.5');
      ring.setAttribute('stroke-dasharray','4 3');
      g.appendChild(ring);
    }

    // events
    g.addEventListener('click', (e) => { e.stopPropagation(); handleStateClick(s.id); });
    g.addEventListener('mousedown', (e) => { e.stopPropagation(); startDrag(s.id, e); });

    statesLayer.appendChild(g);
  }
}

function renderEdges() {
  edgesLayer.innerHTML = '';
  for (const t of transitions) {
    const from = states.find(s=>s.id===t.from);
    const to = states.find(s=>s.id===t.to);
    if (!from || !to) continue;

    const isSelf = from.id === to.id;
    const isActive = rt && !rt.halted && rt.lastTransId === t.id;

    // label text
    const label = t.rules.map(r =>
      r.read.join(',') + ' / ' + r.write.join(',') + ' / ' + r.move.join(',')
    ).join('\n');

    if (isSelf) {
      // self loop
      const cx = from.x, cy = from.y - 55;
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d',`M ${from.x-15} ${from.y-26} Q ${cx-30} ${cy} ${cx+30} ${cy} Q ${cx+50} ${cy} ${from.x+15} ${from.y-26}`);
      path.setAttribute('fill','none');
      path.setAttribute('stroke', isActive?'#4f8cff':'rgba(79,140,255,0.5)');
      path.setAttribute('stroke-width', isActive?'2':'1.5');
      path.setAttribute('marker-end','url(#arrow-normal)');
      edgesLayer.appendChild(path);
      const txt = document.createElementNS('http://www.w3.org/2000/svg','text');
      txt.setAttribute('x', String(cx)); txt.setAttribute('y', String(cy-12));
      txt.setAttribute('text-anchor','middle');
      txt.setAttribute('fill', isActive?'#e8e8f0':'#8888aa');
      txt.setAttribute('font-family','JetBrains Mono, monospace');
      txt.setAttribute('font-size','9');
      t.rules.forEach((r,i) => {
        const ts = document.createElementNS('http://www.w3.org/2000/svg','tspan');
        ts.setAttribute('x',String(cx)); ts.setAttribute('dy', i===0?'0':'11');
        ts.textContent = r.read.join(',') + '/' + r.write.join(',') + '/' + r.move.join(',');
        txt.appendChild(ts);
      });
      edgesLayer.appendChild(txt);
      // delete hotspot
      addEdgeDeleteHotspot(cx, cy-20, t.id);
    } else {
      // check reverse
      const hasReverse = transitions.find(tr => tr.id !== t.id && tr.from===t.to && tr.to===t.from);
      const bend = hasReverse ? (t.id < (hasReverse.id) ? 40 : -40) : 0;
      const mx = (from.x + to.x)/2, my = (from.y + to.y)/2;
      const dx = to.x - from.x, dy = to.y - from.y;
      const len = Math.sqrt(dx*dx+dy*dy)||1;
      const nx = -dy/len, ny = dx/len;
      const cpx = mx + nx*bend, cpy = my + ny*bend;
      // trim to circle edge
      const angle = Math.atan2(cpy-to.y, cpx-to.x);
      const ex = to.x + Math.cos(angle)*30, ey = to.y + Math.sin(angle)*30;
      const sangle = Math.atan2(cpy-from.y, cpx-from.x);
      const sx = from.x + Math.cos(sangle)*30, sy = from.y + Math.sin(sangle)*30;
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d',`M ${sx} ${sy} Q ${cpx} ${cpy} ${ex} ${ey}`);
      path.setAttribute('fill','none');
      path.setAttribute('stroke', isActive?'#4f8cff':'rgba(79,140,255,0.5)');
      path.setAttribute('stroke-width', isActive?'2':'1.5');
      path.setAttribute('marker-end','url(#arrow-normal)');
      path.setAttribute('data-tid', t.id);
      edgesLayer.appendChild(path);
      const lx = cpx, ly = cpy;
      const txt = document.createElementNS('http://www.w3.org/2000/svg','text');
      txt.setAttribute('x', String(lx)); txt.setAttribute('y', String(ly));
      txt.setAttribute('text-anchor','middle');
      txt.setAttribute('fill', isActive?'#e8e8f0':'#8888aa');
      txt.setAttribute('font-family','JetBrains Mono, monospace');
      txt.setAttribute('font-size','9');
      t.rules.forEach((r,i) => {
        const ts = document.createElementNS('http://www.w3.org/2000/svg','tspan');
        ts.setAttribute('x',String(lx)); ts.setAttribute('dy', i===0?'0':'11');
        ts.textContent = r.read.join(',') + '/' + r.write.join(',') + '/' + r.move.join(',');
        txt.appendChild(ts);
      });
      edgesLayer.appendChild(txt);
      addEdgeDeleteHotspot(lx, ly, t.id);
    }
  }
}

function addEdgeDeleteHotspot(x, y, tid) {
  if (currentTool !== 'delete') return;
  const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
  rect.setAttribute('x', String(x-20)); rect.setAttribute('y', String(y-20));
  rect.setAttribute('width','40'); rect.setAttribute('height','40');
  rect.setAttribute('fill','rgba(255,79,106,0.15)');
  rect.setAttribute('rx','4'); rect.setAttribute('stroke','#ff4f6a');
  rect.setAttribute('stroke-width','1'); rect.style.cursor='pointer';
  rect.addEventListener('click', (e) => { e.stopPropagation(); deleteTransition(tid); });
  edgesLayer.appendChild(rect);
}

// ============================================================
// STATE CLICK HANDLER
// ============================================================
function handleStateClick(id) {
  if (currentTool === 'grab') {
    selectedId = id; renderDiagram();
  } else if (currentTool === 'arrow') {
    if (!arrowFrom) {
      arrowFrom = id;
      updateHint(); // show next step
      document.getElementById('canvas-hint').textContent = 'now click destination state';
    } else {
      openTransitionModal(arrowFrom, id);
      arrowFrom = null;
      document.getElementById('canvas-hint').textContent = hints['arrow'];
    }
  } else if (currentTool === 'start') {
    states.forEach(s => s.initial = false);
    states.find(s=>s.id===id).initial = true;
    renderDiagram();
  } else if (currentTool === 'delete') {
    deleteState(id);
  } else if (currentTool === 'accept') {
    const s = states.find(s=>s.id===id);
    if (s) { s.type = 'accept'; s.label = 'qA'; renderDiagram(); syncTableFromDiagram(); }
  } else if (currentTool === 'reject') {
    const s = states.find(s=>s.id===id);
    if (s) { s.type = 'reject'; s.label = 'qR'; renderDiagram(); syncTableFromDiagram(); }
  }
}

// ============================================================
// DRAG
// ============================================================
let dragging = null, dragOff = {x:0,y:0};
function startDrag(id, e) {
  if (currentTool !== 'grab') return;
  dragging = id;
  const s = states.find(s=>s.id===id);
  const rect = svg.getBoundingClientRect();
  dragOff = { x: e.clientX - rect.left - s.x, y: e.clientY - rect.top - s.y };
}
document.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  const rect = svg.getBoundingClientRect();
  const s = states.find(s=>s.id===dragging);
  if (s) { s.x = e.clientX-rect.left-dragOff.x; s.y = e.clientY-rect.top-dragOff.y; }
  renderDiagram();
});
document.addEventListener('mouseup', () => { dragging = null; });

// ============================================================
// TRANSITION MODAL
// ============================================================
let pendingEdge = null;
function openTransitionModal(fromId, toId) {
  const from = states.find(s=>s.id===fromId);
  const to = states.find(s=>s.id===toId);
  pendingEdge = { fromId, toId };
  document.getElementById('modal-edge-desc').textContent = (from?.label||'?') + '  →  ' + (to?.label||'?');
  const container = document.getElementById('modal-tape-inputs');
  container.innerHTML = '';
  for (let i = 0; i < cfg.tapes; i++) {
    const div = document.createElement('div');
    div.className = 'modal-field';
    div.innerHTML = `<label>Tape ${i+1}: read / write / move</label>
      <div style="display:flex;gap:6px">
        <input placeholder="read (e.g. 0,B)" id="mr-${i}" style="flex:1"/>
        <input placeholder="write (e.g. 1,B)" id="mw-${i}" style="flex:1"/>
        <input placeholder="move (L/R/S)" id="mm-${i}" style="width:70px"/>
      </div>
      <div class="modal-hint">Use comma for multiple symbols (multi-head). B = blank.</div>`;
    container.appendChild(div);
  }
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  pendingEdge = null;
}

function confirmTransition() {
  if (!pendingEdge) return;
  const rules = [];
  for (let i = 0; i < cfg.tapes; i++) {
    const r = document.getElementById('mr-'+i)?.value.trim() || 'B';
    const w = document.getElementById('mw-'+i)?.value.trim() || 'B';
    const m = document.getElementById('mm-'+i)?.value.trim().toUpperCase() || 'R';
    rules.push({
      read: r.replace(/[\[\]]/g,'').split(',').map(x=>x.trim()),
      write: w.replace(/[\[\]]/g,'').split(',').map(x=>x.trim()),
      move: m.replace(/[\[\]]/g,'').split(',').map(x=>x.trim())
    });
  }
  // find existing edge between same states
  const existing = transitions.find(t=>t.from===pendingEdge.fromId && t.to===pendingEdge.toId);
  if (existing) {
    existing.rules.push(...rules);
  } else {
    transitions.push({ id: 't'+(nextTransId++), from: pendingEdge.fromId, to: pendingEdge.toId, rules });
  }
  closeModal();
  renderDiagram();
  syncTableFromDiagram();
}

// ============================================================
// TRANSITION TABLE (RIGHT PANEL)
// ============================================================
function syncTableFromDiagram() {
  const container = document.getElementById('table-container');
  const thead = (() => {
    let th = '<tr><th>From</th><th>To</th>';
    for (let i=0;i<cfg.tapes;i++) th += `<th>Read T${i+1}</th><th>Write T${i+1}</th><th>Move T${i+1}</th>`;
    return th + '<th></th></tr>';
  })();
  let rows = '';
  transitions.forEach((t,ti) => {
    const from = states.find(s=>s.id===t.from)?.label||'?';
    const to = states.find(s=>s.id===t.to)?.label||'?';
    t.rules.forEach((r,ri) => {
      rows += `<tr data-tid="${t.id}" data-ri="${ri}" ${rt&&rt.lastTransId===t.id?'class="active-row"':''}>
        <td><input value="${from}" onchange="tableEditFrom('${t.id}',this.value)"/></td>
        <td><input value="${to}" onchange="tableEditTo('${t.id}',this.value)"/></td>`;
      for (let i=0;i<cfg.tapes;i++) {
        const read = (r.read[i]!==undefined?r.read[i]:'B');
        const write = (r.write[i]!==undefined?r.write[i]:'B');
        const move = (r.move[i]!==undefined?r.move[i]:'R');
        rows += `<td><input value="${read}" onchange="tableEditRule('${t.id}',${ri},${i},'read',this.value)"/></td>
                 <td><input value="${write}" onchange="tableEditRule('${t.id}',${ri},${i},'write',this.value)"/></td>
                 <td><input value="${move}" onchange="tableEditRule('${t.id}',${ri},${i},'move',this.value)"/></td>`;
      }
      rows += `<td><button class="del-btn" onclick="deleteTransRuleFromTable('${t.id}',${ri})">✕</button></td></tr>`;
    });
  });
  container.innerHTML = `<table class="trans-table"><thead>${thead}</thead><tbody>${rows}</tbody></table>`;
}

function tableEditFrom(tid, val) {
  const t = transitions.find(t=>t.id===tid);
  const s = states.find(s=>s.label===val.trim());
  if (s) { t.from = s.id; renderDiagram(); }
}
function tableEditTo(tid, val) {
  const t = transitions.find(t=>t.id===tid);
  const s = states.find(s=>s.label===val.trim());
  if (s) { t.to = s.id; renderDiagram(); }
}
function tableEditRule(tid, ri, tapeIdx, field, val) {
  const t = transitions.find(tr=>tr.id===tid);
  if (!t || !t.rules[ri]) return;
  const r = t.rules[ri];
  const arr = val.replace(/[\[\]]/g,'').split(',').map(x=>x.trim());
  r[field === 'read' ? 'read' : field === 'write' ? 'write' : 'move'][tapeIdx] = arr[0];
  renderDiagram();
}
function deleteTransRuleFromTable(tid, ri) {
  const t = transitions.find(tr=>tr.id===tid);
  if (!t) return;
  t.rules.splice(ri,1);
  if (t.rules.length===0) transitions = transitions.filter(tr=>tr.id!==tid);
  renderDiagram(); syncTableFromDiagram();
}
function addTransitionRow() {
  const stateLabels = states.map(s=>s.label);
  if (stateLabels.length < 2) { alert('Add at least 2 states first.'); return; }
  const from = stateLabels[0], to = stateLabels[1] || stateLabels[0];
  const fromS = states.find(s=>s.label===from), toS = states.find(s=>s.label===to);
  const rules = [];
  for (let i=0;i<cfg.tapes;i++) rules.push({read:['B'],write:['B'],move:['R']});
  const existing = transitions.find(t=>t.from===fromS?.id && t.to===toS?.id);
  if (existing) existing.rules.push(rules[0]);
  else transitions.push({id:'t'+(nextTransId++), from:fromS?.id, to:toS?.id, rules});
  renderDiagram(); syncTableFromDiagram();
}

// ============================================================
// TM RUNTIME ENGINE
// ============================================================
function runInit() {
  const input = document.getElementById('run-input').value;
  const initState = states.find(s=>s.initial);
  if (!initState) { alert('Mark an initial state first (▶ tool).'); return; }
  rt = {
    state: initState.label,
    step: 0,
    halted: false,
    result: null,
    lastTransId: null,
    tapes: [],
    heads: [],
    writtenCells: []
  };
  // init tapes
  const prefix = cfg.tape1Prefix || '';
  for (let i=0; i<cfg.tapes; i++) {
    let tape;
    if (i===0) {
      // tape 0: optional prefix chars + input + blanks
      tape = [...prefix, ...input].concat(Array(30).fill('B'));
    } else {
      tape = Array(32).fill('B');
    }
    rt.tapes.push(tape);
    // heads per tape — start after prefix
    const hs = [];
    for (let h=0; h<cfg.heads; h++) {
      if (i===0 && h===1) hs.push(Math.max(0, prefix.length + input.length - 1));
      else hs.push(prefix.length > 0 && i===0 ? prefix.length : 0);
    }
    rt.heads.push(hs);
    rt.writtenCells.push(new Set());
  }
  document.getElementById('step-log').innerHTML = '';
  addLog('⏮', 'Machine loaded. Initial state: ' + initState.label + ' | Input: "' + input + '"');
  updateStatusDot('running');
  renderRunUI();
  renderDiagram();
  renderCompare();
}

function runStep() {
  if (!rt) { runInit(); return; }
  if (rt.halted) return;

  const curState = states.find(s=>s.label===rt.state);
  if (!curState) { rt.halted=true; rt.result='reject'; renderRunUI(); renderDiagram(); return; }

  // check accept/reject
  if (curState.type==='accept') { rt.halted=true; rt.result='accept'; finishRun(); return; }
  if (curState.type==='reject') { rt.halted=true; rt.result='reject'; finishRun(); return; }

  // find matching transition
  const outTrans = transitions.filter(t=>t.from===curState.id);
  let matched = null, matchedRule = null;
  outer: for (const t of outTrans) {
    for (const r of t.rules) {
      let match = true;
      for (let i=0;i<cfg.tapes;i++) {
        const headPos = rt.heads[i][0];
        const sym = rt.tapes[i][headPos] || 'B';
        const expected = r.read[i] !== undefined ? r.read[i] : 'B';
        if (expected !== '*' && expected !== sym) { match=false; break; }
      }
      if (match) { matched=t; matchedRule=r; break outer; }
    }
  }

  if (!matched) {
    rt.halted=true; rt.result='reject';
    addLog(rt.step,'No matching transition from '+rt.state+' — REJECT');
    finishRun(); return;
  }

  rt.step++;
  rt.lastTransId = matched.id;
  const toState = states.find(s=>s.id===matched.to);

  // apply writes and moves
  let logParts = [];
  for (let i=0;i<cfg.tapes;i++) {
    const hp = rt.heads[i][0];
    const oldSym = rt.tapes[i][hp]||'B';
    const newSym = matchedRule.write[i] !== undefined ? matchedRule.write[i] : oldSym;
    const mv = matchedRule.move[i] !== undefined ? matchedRule.move[i].toUpperCase() : 'S';
    rt.tapes[i][hp] = newSym;
    if (newSym !== 'B') rt.writtenCells[i].add(hp);
    if (mv==='R') rt.heads[i][0]++;
    else if (mv==='L') rt.heads[i][0] = Math.max(0, rt.heads[i][0]-1);
    if (rt.tapes[i].length - rt.heads[i][0] < 10) rt.tapes[i].push(...Array(10).fill('B'));
    logParts.push(`T${i+1}:[${oldSym}→${newSym}/${mv}]`);
  }
  rt.state = toState?.label || '?';
  addLog(rt.step, rt.state + ' ' + logParts.join(' '));

  if (toState?.type==='accept') { rt.halted=true; rt.result='accept'; finishRun(); return; }
  if (toState?.type==='reject') { rt.halted=true; rt.result='reject'; finishRun(); return; }

  renderRunUI();
  renderDiagram();
  renderCompare();
}

function finishRun() {
  clearInterval(playInterval); playInterval = null;
  document.getElementById('play-btn').textContent = '▶ Play';
  const msg = rt.result==='accept' ? '✓ ACCEPTED' : '✗ REJECTED';
  addLog('—', msg + ' after ' + rt.step + ' steps');
  updateStatusDot(rt.result==='accept'?'accepted':'rejected');
  renderRunUI();
  renderDiagram();
  renderCompare();
}

let playInterval = null;
function togglePlay() {
  if (!rt) { runInit(); return; }
  if (rt.halted) return;
  if (playInterval) {
    clearInterval(playInterval); playInterval = null;
    document.getElementById('play-btn').textContent = '▶ Play';
  } else {
    document.getElementById('play-btn').textContent = '⏸ Pause';
    const speed = 11 - parseInt(document.getElementById('speed-range').value);
    playInterval = setInterval(() => {
      runStep();
      if (rt?.halted) { clearInterval(playInterval); playInterval=null; document.getElementById('play-btn').textContent='▶ Play'; }
    }, speed * 70);
  }
}

function runReset() {
  clearInterval(playInterval); playInterval=null;
  document.getElementById('play-btn').textContent='▶ Play';
  rt = null;
  updateStatusDot('');
  document.getElementById('status-text').textContent = 'idle';
  document.getElementById('cur-state-display').textContent='—';
  document.getElementById('cur-step-display').textContent='0';
  document.getElementById('step-log').innerHTML = '<span style="color:var(--text3)">Load machine and run to see execution log.</span>';
  document.getElementById('tapes-container').innerHTML='';
  renderDiagram();
  renderCompare();
}

function updateStatusDot(state) {
  const dot = document.getElementById('status-dot');
  const txt = document.getElementById('status-text');
  dot.className = 'status-dot ' + (state||'');
  txt.textContent = state||'idle';
}

function addLog(step, msg) {
  const log = document.getElementById('step-log');
  const div = document.createElement('div');
  div.innerHTML = `<span class="log-step">${step}</span>  <span class="log-highlight">${msg}</span>`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

// ============================================================
// RENDER TAPES
// ============================================================
function renderRunUI() {
  if (!rt) return;
  document.getElementById('cur-state-display').textContent = rt.state || '—';
  document.getElementById('cur-step-display').textContent = rt.step;

  // halt chip
  const row = document.getElementById('state-info-row');
  const existing = row.querySelector('.halt-chip');
  if (existing) existing.remove();
  if (rt.halted) {
    const chip = document.createElement('div');
    chip.className = 'info-chip halt-chip ' + (rt.result==='accept'?'halt-accept':'halt-reject');
    chip.textContent = rt.result==='accept'?'✓ ACCEPTED':'✗ REJECTED';
    row.appendChild(chip);
  }

  renderTapes();
}

function renderTapes() {
  if (!rt) return;
  const container = document.getElementById('tapes-container');
  container.innerHTML = '';
  const badges = ['t0','t1','t2','t2'];
  for (let i=0; i<cfg.tapes; i++) {
    const tape = rt.tapes[i];
    const hp = rt.heads[i][0];
    const wrap = document.createElement('div');
    wrap.className = 'tape-wrap';
    const labelRow = document.createElement('div');
    labelRow.className = 'tape-label-row';
    labelRow.innerHTML = `<span class="tape-badge ${badges[i]||'t0'}">Tape ${i+1}</span>
      <span style="font-size:10px;color:var(--text3)">head@${hp}</span>`;
    wrap.appendChild(labelRow);
    const scroller = document.createElement('div');
    scroller.className = 'tape-scroller';
    scroller.style.height = '60px';
    const inner = document.createElement('div');
    inner.className = 'tape-inner';
    inner.id = `tape-inner-${i}`;
    const SHOW = 13;
    const start = Math.max(0, hp - 4);
    for (let c = start; c < start + SHOW; c++) {
      const sym = tape[c] !== undefined ? tape[c] : 'B';
      const cell = document.createElement('div');
      cell.className = 'tape-cell' +
        (c===hp?' head-cell':'') +
        (sym==='B'?' blank':'') +
        (rt.writtenCells[i].has(c)&&c!==hp?' written':'');
      if (c===hp) {
        const hm = document.createElement('div');
        hm.className = 'head-marker';
        hm.textContent = cfg.heads===1?'H':`H1`;
        cell.appendChild(hm);
      }
      const symSpan = document.createElement('span');
      symSpan.textContent = sym==='B'?'□':sym;
      cell.appendChild(symSpan);
      inner.appendChild(cell);
    }
    scroller.appendChild(inner);
    wrap.appendChild(scroller);
    container.appendChild(wrap);
  }
}

// ============================================================
// COMPARISON PANEL
// ============================================================
function renderCompare() {
  const pane = document.getElementById('pane-compare');
  const n = document.getElementById('run-input').value.length || 4;
  const steps = rt?.step || 0;
  const singleSteps = n * n;
  const ratio = singleSteps > 0 ? (singleSteps / Math.max(steps,1)).toFixed(1) : '—';
  const multiBar = Math.min(100, steps / (n*n) * 100);
  const singleBar = 100;
  pane.innerHTML = `
    <div class="panel-section">
      <div class="panel-section-title">Complexity</div>
      <div class="cmp-grid">
        <div class="cmp-card good">
          <div class="cmp-label">Multi-tape steps</div>
          <div class="cmp-val">${steps}</div>
          <div class="cmp-sub">actual (${cfg.tapes} tape${cfg.tapes>1?'s':''})</div>
        </div>
        <div class="cmp-card bad">
          <div class="cmp-label">Single-tape equiv.</div>
          <div class="cmp-val">${singleSteps}</div>
          <div class="cmp-sub">O(n²) estimate, n=${n}</div>
        </div>
        <div class="cmp-card">
          <div class="cmp-label">Speedup factor</div>
          <div class="cmp-val" style="color:var(--teal)">${ratio}×</div>
          <div class="cmp-sub">theoretical max</div>
        </div>
        <div class="cmp-card">
          <div class="cmp-label">Equivalence</div>
          <div class="cmp-val" style="font-size:13px;color:var(--text2)">poly-time</div>
          <div class="cmp-sub">same language class</div>
        </div>
      </div>
      <div class="complexity-bar">
        <div class="cmp-bar-label">Step comparison (n=${n})</div>
        <div class="bar-row">
          <span class="bar-name">Multi-tape</span>
          <div class="bar-track"><div class="bar-fill multi" style="width:${multiBar.toFixed(1)}%"></div></div>
          <span class="bar-num">${steps}</span>
        </div>
        <div class="bar-row">
          <span class="bar-name">Single-tape</span>
          <div class="bar-track"><div class="bar-fill single" style="width:${singleBar}%"></div></div>
          <span class="bar-num">${singleSteps}</span>
        </div>
      </div>
    </div>
    <div class="panel-section">
      <div class="panel-section-title">Theory Note</div>
      <div style="font-size:10px;color:var(--text2);line-height:1.7">
        A k-tape TM can be simulated by a 1-tape TM with at most <strong style="color:var(--text)">O(t(n)²)</strong> overhead (Hartmanis–Stearns theorem). Multi-tape TMs decide exactly the same languages — they are a <em style="color:var(--accent)">polynomial speedup</em>, not a power increase. The comparison above uses the theoretical worst-case for a single-tape simulation of this ${cfg.tapes}-tape machine.
      </div>
    </div>`;
}

// ============================================================
// TAB SWITCHING
// ============================================================
function switchTab(tab) {
  ['run','table','compare'].forEach(t => {
    document.getElementById('pane-'+t).style.display = t===tab?'block':'none';
    document.getElementById('tab-'+t).classList.toggle('active', t===tab);
  });
  if (tab==='table') syncTableFromDiagram();
  if (tab==='compare') renderCompare();
}

// ============================================================
// CONFIG
// ============================================================
function applyConfig() {
  cfg.tapes = parseInt(document.getElementById('tape-count').value)||1;
  cfg.heads = parseInt(document.getElementById('head-count').value)||1;
  transitions = [];
  renderDiagram();
  syncTableFromDiagram();
  renderCompare();
}

// ============================================================
// EXAMPLES
// ============================================================
const EXAMPLES = {
  copy: {
    tapes: 2, heads: 1,
    states: [
      {label:'q0',type:'initial',x:150,y:220,initial:true},
      {label:'q1',type:'normal',x:320,y:220,initial:false},
      {label:'qA',type:'accept',x:490,y:220,initial:false}
    ],
    transitions: [
      {from:'q0',to:'q1',rules:[{read:['0'],write:['0','0'],move:['R','R']}]},
      {from:'q0',to:'q1',rules:[{read:['1'],write:['1','1'],move:['R','R']}]},
      {from:'q1',to:'q1',rules:[{read:['0'],write:['0','0'],move:['R','R']}]},
      {from:'q1',to:'q1',rules:[{read:['1'],write:['1','1'],move:['R','R']}]},
      {from:'q1',to:'qA',rules:[{read:['B'],write:['B','B'],move:['S','S']}]},
    ]
  },
  palindrome: {
    tapes: 2, heads: 1,
    // tape1 is pre-loaded with '#' at pos 0 as left-end marker; input starts at pos 1
    tape1Prefix: '#',
    states: [
      {label:'qC',type:'initial',x:100,y:220,initial:true},
      {label:'qW',type:'normal',x:280,y:220,initial:false},
      {label:'qK',type:'normal',x:460,y:220,initial:false},
      {label:'qA',type:'accept',x:460,y:120,initial:false},
      {label:'qR',type:'reject',x:280,y:120,initial:false}
    ],
    // Phase qC: copy tape1→tape2, both R. On B→qW (both L one step)
    // Phase qW: rewind tape1 L only (tape2 stays). On #→qK (tape1 R, tape2 S)
    // Phase qK: compare tape1 R, tape2 L. Match→stay. Both-exhausted→qA. Mismatch→qR.
    transitions: [
      {from:'qC',to:'qC',rules:[{read:['0','B'],write:['0','0'],move:['R','R']}]},
      {from:'qC',to:'qC',rules:[{read:['1','B'],write:['1','1'],move:['R','R']}]},
      {from:'qC',to:'qW',rules:[{read:['B','B'],write:['B','B'],move:['L','L']}]},
      {from:'qW',to:'qW',rules:[{read:['0','B'],write:['0','B'],move:['L','S']}]},
      {from:'qW',to:'qW',rules:[{read:['1','B'],write:['1','B'],move:['L','S']}]},
      {from:'qW',to:'qK',rules:[{read:['#','B'],write:['#','B'],move:['R','S']}]},
      {from:'qK',to:'qK',rules:[{read:['0','0'],write:['0','0'],move:['R','L']}]},
      {from:'qK',to:'qK',rules:[{read:['1','1'],write:['1','1'],move:['R','L']}]},
      {from:'qK',to:'qA',rules:[{read:['B','B'],write:['B','B'],move:['S','S']}]},
      {from:'qK',to:'qA',rules:[{read:['B','0'],write:['B','0'],move:['S','S']}]},
      {from:'qK',to:'qA',rules:[{read:['B','1'],write:['B','1'],move:['S','S']}]},
      {from:'qK',to:'qR',rules:[{read:['0','1'],write:['0','1'],move:['S','S']}]},
      {from:'qK',to:'qR',rules:[{read:['1','0'],write:['1','0'],move:['S','S']}]},
    ]
  },
  increment: {
    tapes: 1, heads: 1,
    states: [
      {label:'q0',type:'initial',x:150,y:220,initial:true},
      {label:'q1',type:'normal',x:320,y:220,initial:false},
      {label:'qA',type:'accept',x:490,y:220,initial:false}
    ],
    transitions: [
      {from:'q0',to:'q0',rules:[{read:['0'],write:['0'],move:['R']}]},
      {from:'q0',to:'q0',rules:[{read:['1'],write:['1'],move:['R']}]},
      {from:'q0',to:'q1',rules:[{read:['B'],write:['B'],move:['L']}]},
      {from:'q1',to:'q1',rules:[{read:['1'],write:['0'],move:['L']}]},
      {from:'q1',to:'qA',rules:[{read:['0'],write:['1'],move:['S']}]},
      {from:'q1',to:'qA',rules:[{read:['B'],write:['1'],move:['S']}]},
    ]
  },
  accept_all: {
    tapes: 1, heads: 1,
    states: [
      {label:'q0',type:'initial',x:200,y:220,initial:true},
      {label:'qA',type:'accept',x:400,y:220,initial:false}
    ],
    transitions: [
      {from:'q0',to:'qA',rules:[{read:['*'],write:['B'],move:['R']}]},
    ]
  }
};

function loadExample(key) {
  if (!key) return;
  const ex = EXAMPLES[key];
  if (!ex) return;
  cfg.tapes = ex.tapes; cfg.heads = ex.heads;
  cfg.tape1Prefix = ex.tape1Prefix || '';
  document.getElementById('tape-count').value = ex.tapes;
  document.getElementById('head-count').value = ex.heads;
  states = []; transitions = []; nextStateId=0; nextTransId=0;
  rt = null;
  const idMap = {};
  ex.states.forEach((sd,i) => {
    const id = 's'+(nextStateId++);
    idMap[sd.label] = id;
    states.push({id, label:sd.label, x:sd.x, y:sd.y, type:sd.type==='initial'?'normal':sd.type, initial:sd.initial});
  });
  ex.transitions.forEach(td => {
    const existing = transitions.find(t=>t.from===idMap[td.from]&&t.to===idMap[td.to]);
    if (existing) existing.rules.push(...td.rules);
    else transitions.push({id:'t'+(nextTransId++), from:idMap[td.from], to:idMap[td.to], rules:[...td.rules]});
  });
  runReset();
  renderDiagram();
  syncTableFromDiagram();
  renderCompare();
  document.getElementById('example-select').value='';
}

function resetAll() {
  states=[]; transitions=[]; nextStateId=0; nextTransId=0; rt=null;
  cfg.tape1Prefix = '';
  runReset();
  renderDiagram();
  syncTableFromDiagram();
  renderCompare();
}

// ============================================================
// SAVE / LOAD SYSTEM
// ============================================================
const STORAGE_KEY = 'tm_playground_saves';

function getMachineSnapshot(name) {
  return {
    name: name || 'untitled',
    savedAt: new Date().toISOString(),
    cfg: { tapes: cfg.tapes, heads: cfg.heads, tape1Prefix: cfg.tape1Prefix || '' },
    states: states.map(s => ({ ...s })),
    transitions: transitions.map(t => ({
      id: t.id, from: t.from, to: t.to,
      rules: t.rules.map(r => ({ read: [...r.read], write: [...r.write], move: [...r.move] }))
    })),
    nextStateId, nextTransId
  };
}

function getAllSaves() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch(e) { return []; }
}

function putAllSaves(saves) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
}

function saveMachine() {
  const name = document.getElementById('save-name-input').value.trim();
  if (!name) { showToast('Enter a name first.'); return; }
  if (states.length === 0) { showToast('Nothing to save — add some states first.'); return; }
  const saves = getAllSaves();
  const existing = saves.findIndex(s => s.name === name);
  const snap = getMachineSnapshot(name);
  if (existing >= 0) saves[existing] = snap;
  else saves.unshift(snap);
  putAllSaves(saves);
  renderSavedList();
  document.getElementById('save-name-input').value = '';
  showToast('Saved: ' + name);
}

function loadSave(name) {
  const saves = getAllSaves();
  const snap = saves.find(s => s.name === name);
  if (!snap) return;
  restoreSnapshot(snap);
  showToast('Loaded: ' + name);
  toggleDrawer();
}

function deleteSave(name) {
  const saves = getAllSaves().filter(s => s.name !== name);
  putAllSaves(saves);
  renderSavedList();
  showToast('Deleted: ' + name);
}

function restoreSnapshot(snap) {
  cfg.tapes = snap.cfg.tapes;
  cfg.heads = snap.cfg.heads;
  cfg.tape1Prefix = snap.cfg.tape1Prefix || '';
  document.getElementById('tape-count').value = cfg.tapes;
  document.getElementById('head-count').value = cfg.heads;
  states = snap.states.map(s => ({ ...s }));
  transitions = snap.transitions.map(t => ({
    id: t.id, from: t.from, to: t.to,
    rules: t.rules.map(r => ({ read: [...r.read], write: [...r.write], move: [...r.move] }))
  }));
  nextStateId = snap.nextStateId;
  nextTransId = snap.nextTransId;
  rt = null;
  runReset();
  renderDiagram();
  syncTableFromDiagram();
  renderCompare();
}

function renderSavedList() {
  const saves = getAllSaves();
  const container = document.getElementById('saved-list');
  if (saves.length === 0) {
    container.innerHTML = '<div class="empty-list">No saved machines yet.</div>';
    return;
  }
  container.innerHTML = saves.map(s => {
    const d = new Date(s.savedAt);
    const when = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const stateCount = s.states?.length || 0;
    const transCount = s.transitions?.length || 0;
    return `<div class="saved-item">
      <div class="saved-item-info">
        <div class="saved-item-name" title="${s.name}">${s.name}</div>
        <div class="saved-item-meta">${stateCount} states · ${transCount} transitions · ${when}</div>
      </div>
      <div class="saved-item-actions">
        <button class="icon-btn load-btn" title="Load" onclick="loadSave('${s.name.replace(/'/g,"\\'")}')" >↩</button>
        <button class="icon-btn del-btn" title="Delete" onclick="deleteSave('${s.name.replace(/'/g,"\\'")}')" >✕</button>
      </div>
    </div>`;
  }).join('');
}

function exportJSON() {
  if (states.length === 0) { showToast('Nothing to export.'); return; }
  const name = document.getElementById('save-name-input').value.trim()
    || 'tm_machine_' + Date.now();
  const snap = getMachineSnapshot(name);
  const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name.replace(/[^a-zA-Z0-9_-]/g, '_') + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Exported: ' + a.download);
}

function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const snap = JSON.parse(e.target.result);
      if (!snap.states || !snap.transitions || !snap.cfg) throw new Error('Invalid format');
      restoreSnapshot(snap);
      // also add to saves list
      const saves = getAllSaves();
      const existing = saves.findIndex(s => s.name === snap.name);
      if (existing >= 0) saves[existing] = snap; else saves.unshift(snap);
      putAllSaves(saves);
      renderSavedList();
      showToast('Imported: ' + snap.name);
    } catch(err) {
      showToast('Error: invalid JSON file');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function toggleDrawer() {
  const drawer = document.getElementById('save-drawer');
  const isOpen = drawer.classList.toggle('open');
  if (isOpen) renderSavedList();
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove('show'), 2200);
}

// init
renderDiagram();
syncTableFromDiagram();
renderCompare();

// hide compare pane initially (show run)
document.getElementById('pane-compare').style.display='none';
