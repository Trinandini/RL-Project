// Colorful canvas simulation with animated "running" paths.

const img = document.getElementById('sceneImg');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const runBtn = document.getElementById('runBtn');
const resetBtn = document.getElementById('resetBtn');
const resultBox = document.getElementById('resultBox');
const logList = document.getElementById('log');
const attempt3Choice = document.getElementById('attempt3Choice');
const statusEl = document.getElementById('status');

let attempt = 0;

// Keep canvas sized to image
function resizeCanvas(){
  canvas.width = img.clientWidth;
  canvas.height = img.clientHeight;
  drawClear();
}
window.addEventListener('load', resizeCanvas);
window.addEventListener('resize', resizeCanvas);

function drawClear(){ ctx.clearRect(0,0,canvas.width,canvas.height); }

// Draw helpers
function drawPath(from, to, color, dashed=true){
  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  if(dashed){ ctx.setLineDash([10,10]); }
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}
function drawDot(p, color, r=7){
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}
function drawRing(p, color, r=16){
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI*2);
  ctx.stroke();
  ctx.restore();
}

// Approximate anchor points relative to image (percentages)
const armTip = { x: 0.48, y: 0.38 };   // gripper head
const object = { x: 0.36, y: 0.57 };   // round puck

const Px = pt => ({ x: Math.round(pt.x * canvas.width), y: Math.round(pt.y * canvas.height) });

// Animated “running” marker moving along a segment
async function animateRunner(from, to, color='#ffffff'){
  const total = Math.hypot(to.x-from.x, to.y-from.y);
  const steps = Math.max(25, Math.min(120, Math.round(total/6))); // adaptive smoothness
  for(let i=0;i<=steps;i++){
    const t = i/steps;
    const now = { x: from.x + (to.x-from.x)*t, y: from.y + (to.y-from.y)*t };
    drawClear(); // keep only current path + runner each frame
    drawPath(from, to, color === '#ef4444' ? '#ef4444' : color, true);
    drawDot(now, color, 6);
    await new Promise(r=>setTimeout(r, 12));
  }
}

// “Spray” of MC samples (background fan-out)
async function monteCarloSpray(originPx, targetPx, count=36, spread=26, color='rgba(203,213,225,.24)'){
  for(let i=0;i<count;i++){
    const angle = Math.atan2(targetPx.y-originPx.y, targetPx.x-originPx.x) + (Math.random()-0.5)*0.6;
    const dist = Math.hypot(targetPx.x-originPx.x,targetPx.y-originPx.y) + (Math.random()-0.5)*spread;
    const end = { x: originPx.x + Math.cos(angle)*dist, y: originPx.y + Math.sin(angle)*dist };
    ctx.save();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(originPx.x, originPx.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.restore();
    await new Promise(r=>setTimeout(r, 8));
  }
}

function setResult(html){ resultBox.innerHTML = html; }
function log(line){
  const li = document.createElement('li');
  li.textContent = line;
  logList.appendChild(li);
}
function setStatus(text, cls=''){
  statusEl.className = 'status ' + cls;
  statusEl.textContent = 'Status: ' + text;
}

// Attempts
async function attemptOne(){
  const arm = Px(armTip);
  const obj = Px(object);
  const miss = { x: obj.x - 55, y: obj.y - 10 }; // beside the object

  setStatus('Running attempt 1…', '');
  drawClear();
  await monteCarloSpray(arm, miss);
  await animateRunner(arm, miss, '#ef4444');
  drawPath(arm, miss, '#ef4444', true);
  drawDot(miss, '#ef4444'); drawRing(miss, '#ef4444');

  setStatus('Attempt 1 finished', 'fail');
  setResult(`
    <p class="fail">Attempt 1: Goal failed.</p>
    <p>Monte Carlo rollouts sampled many paths; most clustered <em>beside</em> the object,
    so the selected path missed.</p>
  `);
  log('Attempt 1 → Missed beside object (Monte Carlo clustered off-target).');
}

async function attemptTwo(){
  const arm = Px(armTip);
  const obj = Px(object);

  setStatus('Running attempt 2…', '');
  drawClear();
  await monteCarloSpray(arm, obj);
  await animateRunner(arm, obj, '#22c55e');
  drawPath(arm, obj, '#22c55e', false);
  drawDot(obj, '#22c55e'); drawRing(obj, '#22c55e');

  setStatus('Attempt 2 finished', 'ok');
  setResult(`
    <p class="ok">Attempt 2: Success!</p>
    <p>Re-sampling concentrated probability on the true goal; following the highest-density
    path the arm captured the object.</p>
  `);
  log('Attempt 2 → Success (distribution converged on the object).');
}

async function attemptThree(){
  const arm = Px(armTip);
  const obj = Px(object);
  const pref = attempt3Choice.value; // up or down
  const offsetY = pref === 'up' ? -55 : 55;
  const alt = { x: obj.x + (Math.random()*20-10), y: obj.y + offsetY };

  setStatus(`Running attempt 3 (${pref})…`, '');
  drawClear();
  await monteCarloSpray(arm, alt);
  await animateRunner(arm, alt, '#3b82f6');
  drawPath(arm, alt, '#3b82f6', true);
  drawDot(alt, '#3b82f6'); drawRing(alt, '#3b82f6');

  setStatus('Attempt 3 finished', '');
  setResult(`
    <p class="info">Attempt 3: Alternative aim (${pref}).</p>
    <p>Monte Carlo explored ${pref}-side samples. Since you chose <strong>${pref}</strong>, the
    rollout biased ${pref}wards and produced this outcome.</p>
  `);
  log(`Attempt 3 → Explored ${pref}side samples and aimed ${pref}.`);
}

// Controls
runBtn.addEventListener('click', async () => {
  runBtn.disabled = true;
  attempt += 1;
  if(attempt === 1){ await attemptOne(); }
  else if(attempt === 2){ await attemptTwo(); }
  else if(attempt === 3){ await attemptThree(); }
  else { attempt = 1; log('— cycle restarted —'); await attemptOne(); }
  runBtn.disabled = false;
});

resetBtn.addEventListener('click', ()=>{
  attempt = 0;
  drawClear();
  setStatus('Ready', '');
  resultBox.innerHTML = '<p>Ready. Click <strong>Run &amp; Catch</strong>.</p>';
  logList.innerHTML = '';
});

// Initial text
resultBox.innerHTML = '<p>Ready. Click <strong>Run &amp; Catch</strong>.</p>';
