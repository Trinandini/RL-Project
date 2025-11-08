// Simple canvas overlay simulation with three attempts.
const img = document.getElementById('sceneImg');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const runBtn = document.getElementById('runBtn');
const resetBtn = document.getElementById('resetBtn');
const resultBox = document.getElementById('resultBox');
const logList = document.getElementById('log');
const attempt3Choice = document.getElementById('attempt3Choice');

let attempt = 0; // 0 -> not started, then 1,2,3
let anim;

function resizeCanvas(){
  canvas.width = img.clientWidth;
  canvas.height = img.clientHeight;
  drawClear();
}
window.addEventListener('load', resizeCanvas);
window.addEventListener('resize', resizeCanvas);

function drawClear(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
}

// Utility to draw dashed path and dot
function drawPath(from, to, color, dashed=true){
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  if(dashed){ ctx.setLineDash([6,6]); }
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

function drawDot(p, color){
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 7, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function drawRing(p, color){
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 16, 0, Math.PI*2);
  ctx.stroke();
  ctx.restore();
}

// Approximate anchor points relative to image (percentages)
const armTip = { x: 0.48, y: 0.38 };   // where the gripper is
const object = { x: 0.36, y: 0.57 };   // the round puck on table

function Px(pt){
  return { x: Math.round(pt.x * canvas.width), y: Math.round(pt.y * canvas.height) };
}

// Monte Carlo fan-out samples (visual only)
async function monteCarloSpray(originPx, targetPx, count=40, spread=26, color='rgba(2,6,23,0.18)'){
  for(let i=0;i<count;i++){
    const angle = Math.atan2(targetPx.y-originPx.y, targetPx.x-originPx.x) + (Math.random()-0.5)*0.6;
    const dist = Math.hypot(targetPx.x-originPx.x,targetPx.y-originPx.y) + (Math.random()-0.5)*spread;
    const end = { x: originPx.x + Math.cos(angle)*dist, y: originPx.y + Math.sin(angle)*dist };
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(originPx.x, originPx.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.restore();
    await new Promise(r=>setTimeout(r, 12));
  }
}

// Helpers for result box & log
function setResult(html){ resultBox.innerHTML = html; }
function log(line){
  const li = document.createElement('li');
  li.textContent = line;
  logList.appendChild(li);
}

async function attemptOne(){
  drawClear();
  const arm = Px(armTip);
  const obj = Px(object);
  // Miss beside object (to the left)
  const miss = { x: obj.x - 55, y: obj.y - 10 };
  await monteCarloSpray(arm, miss);
  drawPath(arm, miss, '#ef4444', true);
  drawDot(miss, '#ef4444'); 
  drawRing(miss, '#ef4444');
  setResult(`
    <p class="fail">Attempt 1: Goal failed.</p>
    <p>We ran a Monte Carlo rollout of many noisy paths. Most samples clustered beside the object,
    so the chosen path aimed there and missed. This visual fan-out shows the sampled pathways.</p>
  `);
  log('Attempt 1 → Missed beside object (Monte Carlo samples clustered off-target).');
}

async function attemptTwo(){
  drawClear();
  const arm = Px(armTip);
  const obj = Px(object);
  await monteCarloSpray(arm, obj);
  drawPath(arm, obj, '#10b981', false);
  drawDot(obj, '#10b981');
  drawRing(obj, '#10b981');
  setResult(`
    <p class="ok">Attempt 2: Success!</p>
    <p>After re-sampling, the Monte Carlo distribution concentrated on the true goal.
    The controller steered to the highest-probability hit and captured the object.</p>
  `);
  log('Attempt 2 → Success (Monte Carlo converged on the object).');
}

async function attemptThree(){
  drawClear();
  const arm = Px(armTip);
  const obj = Px(object);
  const pref = attempt3Choice.value; // "up" or "down"
  const offsetY = pref === 'up' ? -55 : 55;
  const alt = { x: obj.x + (Math.random()*20-10), y: obj.y + offsetY };
  await monteCarloSpray(arm, alt);
  drawPath(arm, alt, '#2563eb', true);
  drawDot(alt, '#2563eb');
  drawRing(alt, '#2563eb');
  setResult(`
    <p class="info">Attempt 3: Alternative aim (${pref}).</p>
    <p>Guided by Monte Carlo, we explored ${pref}side trajectories of the object.
    You chose <strong>${pref}</strong>, so the rollout attempts were biased ${pref}wards and the
    shown outcome reflects that choice.</p>
  `);
  log(`Attempt 3 → Explored ${pref}side samples and aimed ${pref}.`);
}

runBtn.addEventListener('click', async () => {
  runBtn.disabled = true;
  attempt += 1;
  if(attempt === 1){ await attemptOne(); }
  else if(attempt === 2){ await attemptTwo(); }
  else if(attempt === 3){ await attemptThree(); }
  else { 
    attempt = 1;
    log('— cycle restarted —');
    await attemptOne();
  }
  runBtn.disabled = false;
});

resetBtn.addEventListener('click', ()=>{
  attempt = 0;
  drawClear();
  resultBox.innerHTML = '<p>Ready. Click <strong>Run &amp; Catch</strong>.</p>';
  logList.innerHTML = '';
});
// Initialize
resultBox.innerHTML = '<p>Ready. Click <strong>Run &amp; Catch</strong>.</p>';
