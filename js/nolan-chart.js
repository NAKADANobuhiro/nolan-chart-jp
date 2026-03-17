// ─── CANVAS SETUP ────────────────────────────────────────────────────────────
const W = 626, H = 626;
const PAD_T = 18, PAD_B = 63, PAD_L = 63, PAD_R = 28;
const CW = W - PAD_L - PAD_R, CH = H - PAD_T - PAD_B;
function px(x, y) { return [PAD_L + x*CW, PAD_T + (1-y)*CH]; }

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

// ─── ZOOM & PAN STATE ────────────────────────────────────────────────────────
let zoom = 1.0;
let panX = 0, panY = 0;
const MIN_ZOOM = 0.5, MAX_ZOOM = 5.0;

// HiDPI（Retina等）対応：devicePixelRatioでCanvasを高解像度化
const dpr = window.devicePixelRatio || 1;
canvas.width  = W * dpr;
canvas.height = H * dpr;
canvas.style.width  = W + 'px';
canvas.style.height = H + 'px';
ctx.scale(dpr, dpr);

// ─── VISIBILITY STATE ────────────────────────────────────────────────────────
const visible = new Set();   // filled after data declared
let activeKey = null;

// Init: 日本の政党のみ表示、海外政党・政治理論は非表示
jpParties.forEach(d => visible.add(d.name));

// ─── CHART COLORS ────────────────────────────────────────────────────────────
const barColors = {
  'ケア/危害':'#ff6b9d','公平/欺き':'#ffd93d','忠誠/裏切り':'#6bcb77',
  '権威/転覆':'#4d96ff','純粋/堕落':'#c77dff','自由/抑圧':'#00c896'
};

// ─── DRAW ─────────────────────────────────────────────────────────────────────
function drawChart() {
  ctx.clearRect(0, 0, W, H);

  // ズーム変換（キャンバス中心基準）
  ctx.save();
  ctx.translate(panX + W/2, panY + H/2);
  ctx.scale(zoom, zoom);
  ctx.translate(-W/2, -H/2);

  // Quadrant fills
  [
    {x:0.5,y:0.5,w:0.5,h:0.5,c:'rgba(126,200,227,0.07)',lbl:'リバタリアン',lx:0.75,ly:0.88},
    {x:0,  y:0.5,w:0.5,h:0.5,c:'rgba(168,216,168,0.07)',lbl:'リベラル／左', lx:0.25,ly:0.88},
    {x:0.5,y:0,  w:0.5,h:0.5,c:'rgba(249,199,132,0.07)',lbl:'保守／右',     lx:0.75,ly:0.10},
    {x:0,  y:0,  w:0.5,h:0.5,c:'rgba(242,139,130,0.09)',lbl:'権威主義',     lx:0.25,ly:0.10},
  ].forEach(q => {
    const [x1,y1] = px(q.x, q.y+q.h);
    ctx.fillStyle = q.c;
    ctx.fillRect(x1, y1, q.w*CW, q.h*CH);
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.textAlign = 'center';
    const [lx,ly] = px(q.lx, q.ly);
    ctx.fillText(q.lbl, lx, ly);
  });

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
  for (let i=0; i<=10; i++) {
    let [x1,y1]=px(i/10,0),[x2,y2]=px(i/10,1);
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    let [xa,ya]=px(0,i/10),[xb,yb]=px(1,i/10);
    ctx.beginPath(); ctx.moveTo(xa,ya); ctx.lineTo(xb,yb); ctx.stroke();
  }

  // Center axes
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.4;
  let [ax,ay]=px(0.5,0),[bx,by]=px(0.5,1);
  ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
  let [cx0,cy0]=px(0,0.5),[dx0,dy0]=px(1,0.5);
  ctx.beginPath(); ctx.moveTo(cx0,cy0); ctx.lineTo(dx0,dy0); ctx.stroke();

  // Border
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.5;
  ctx.strokeRect(PAD_L, PAD_T, CW, CH);

  // ── 中道ダイヤモンド ──
  ctx.save();
  const [dTop]   = [px(0.5, 0.7)];
  const [dRight] = [px(0.7, 0.5)];
  const [dBot]   = [px(0.5, 0.3)];
  const [dLeft]  = [px(0.3, 0.5)];
  const dtx=dTop[0],  dty=dTop[1];
  const drx=dRight[0],dry=dRight[1];
  const dbx=dBot[0],  dby=dBot[1];
  const dlx=dLeft[0], dly=dLeft[1];
  ctx.beginPath();
  ctx.moveTo(dtx,dty); ctx.lineTo(drx,dry);
  ctx.lineTo(dbx,dby); ctx.lineTo(dlx,dly);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(dtx,dty); ctx.lineTo(drx,dry);
  ctx.lineTo(dbx,dby); ctx.lineTo(dlx,dly);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
  const [mcx, mcy] = px(0.5, 0.5);
  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('中道', mcx, mcy);
  ctx.textBaseline = 'alphabetic';
  ctx.restore();

  // Japan cluster ellipse
  ctx.save();
  ctx.strokeStyle='rgba(255,255,100,0.13)'; ctx.lineWidth=2; ctx.setLineDash([5,4]);
//  const [ex,ey]=px(0.43,0.47);  // 実態: X中心≈0.43、Y中心≈0.47
  const [ex,ey]=px(0.35,0.50);  // 実態: X中心≈0.43、Y中心≈0.47
  ctx.beginPath(); ctx.ellipse(ex, ey, CW*0.25, CH*0.24, 0, 0, Math.PI*2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.font='10px sans-serif'; ctx.fillStyle='rgba(255,255,100,0.35)'; ctx.textAlign='center';
  ctx.fillText('日本の政党が集中する範囲', ex, ey+CH*0.24+13);
  ctx.restore();

  // ※ 軸ラベルはズーム変換の外で描画（常に固定表示）→ ctx.restore() 後に移動

  // ── concepts: triangles ──
  concepts.forEach(c => {
    if (!visible.has(c.name)) return;
    const [cx,cy]=px(c.x,c.y);
    const isHL = activeKey===c.name;
    const r = isHL ? 14 : 10;
    if (isHL) {
      ctx.beginPath(); ctx.arc(cx,cy,r+6,0,Math.PI*2);
      ctx.fillStyle=c.color+'22'; ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(cx, cy-r);
    ctx.lineTo(cx+r*0.87, cy+r*0.5);
    ctx.lineTo(cx-r*0.87, cy+r*0.5);
    ctx.closePath();
    ctx.fillStyle   = isHL ? c.color : c.color+'bb';  ctx.fill();
    ctx.strokeStyle = isHL ? '#fff'  : 'rgba(255,255,255,0.35)';
    ctx.lineWidth   = isHL ? 2 : 1;  ctx.stroke();
    ctx.font        = isHL ? 'bold 10px sans-serif' : '9px sans-serif';
    ctx.fillStyle   = isHL ? '#fff' : 'rgba(255,255,255,0.75)';
    ctx.textAlign   = 'center';
    const lines = c.abbr.split('\n');
    const baseOffY = c.y > 0.85 ? 20 : -14;
    lines.forEach((ln, li) => ctx.fillText(ln, cx, cy + baseOffY + li*11));
  });

  // ── foreign parties: diamonds ──
  foreignParties.forEach(p => {
    if (!visible.has(p.name)) return;
    const [cx,cy]=px(p.x,p.y);
    const isHL = activeKey===p.name;
    const r = isHL ? 13 : 9;
    if (isHL) { ctx.beginPath(); ctx.arc(cx,cy,r+6,0,Math.PI*2); ctx.fillStyle=p.color+'22'; ctx.fill(); }
    ctx.beginPath();
    ctx.moveTo(cx, cy-r); ctx.lineTo(cx+r, cy);
    ctx.lineTo(cx, cy+r); ctx.lineTo(cx-r, cy);
    ctx.closePath();
    ctx.fillStyle   = isHL ? p.color : p.color+'cc'; ctx.fill();
    ctx.strokeStyle = isHL ? '#fff'  : 'rgba(255,255,255,0.4)';
    ctx.lineWidth   = isHL ? 2 : 1;  ctx.stroke();
    ctx.font        = isHL ? 'bold 11px sans-serif' : '10px sans-serif';
    ctx.fillStyle   = isHL ? '#fff' : 'rgba(255,255,255,0.8)';
    ctx.textAlign   = 'center';
    ctx.fillText(p.abbr, cx, cy + (p.y > 0.85 ? 20 : -15));
  });

  // ── JP parties: circles ──
  jpParties.forEach(p => {
    if (!visible.has(p.name)) return;
    const [cx,cy]=px(p.x,p.y);
    const isHL = activeKey===p.name;
    const r = isHL ? 13 : 9;
    if (isHL) { ctx.beginPath(); ctx.arc(cx,cy,r+5,0,Math.PI*2); ctx.fillStyle=p.color+'33'; ctx.fill(); }
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
    ctx.fillStyle   = isHL ? p.color : p.color+'cc'; ctx.fill();
    ctx.strokeStyle = isHL ? '#fff'  : 'rgba(255,255,255,0.4)';
    ctx.lineWidth   = isHL ? 2 : 1;  ctx.stroke();
    ctx.font        = isHL ? 'bold 12px sans-serif' : '10px sans-serif';
    ctx.fillStyle   = isHL ? '#fff' : 'rgba(255,255,255,0.85)';
    ctx.textAlign   = 'center';
    ctx.fillText(p.abbr, cx, cy + (cy < PAD_T+28 ? 19 : -14));
  });

  ctx.restore(); // ズーム変換を戻す

  // ── 軸ラベル（ズーム/パンに追従しつつ常にcanvas内に収める）────────────────
  ctx.font='11px sans-serif'; ctx.fillStyle='#666';

  // スクリーン座標変換ヘルパー
  const toSX = lx => zoom * (lx - W/2) + panX + W/2;
  const toSY = ly => zoom * (ly - H/2) + panY + H/2;

  // 横軸ラベル: Y はcanvas底辺（PAD_B内）固定、X はチャート左右半を追従
  const hLabelY = H - 12;
  const lLeftX  = Math.max(50,      Math.min(toSX(PAD_L + CW*0.25), W/2 - 10));
  const lRightX = Math.max(W/2+10,  Math.min(toSX(PAD_L + CW*0.75), W - 30));
  ctx.textAlign = 'center';
  ctx.fillText('← 大きな政府（経済介入）', lLeftX,  hLabelY);
  ctx.fillText('小さな政府（経済自由） →', lRightX, hLabelY);

  // 縦軸ラベル: 90°回転、Y はチャート上下半を追従
  const vLabelX = 14;
  const lTopY    = Math.max(30,      Math.min(toSY(PAD_T + CH*0.25), H/2 - 10));
  const lBottomY = Math.max(H/2+10,  Math.min(toSY(PAD_T + CH*0.75), H - 20));
  ctx.save(); ctx.translate(vLabelX, lTopY);    ctx.rotate(-Math.PI/2);
  ctx.textAlign = 'center'; ctx.fillText('自由主義（個人の自由重視）→', 0, 0); ctx.restore();
  ctx.save(); ctx.translate(vLabelX, lBottomY); ctx.rotate(-Math.PI/2);
  ctx.textAlign = 'center'; ctx.fillText('← 権威主義（社会統制重視）',  0, 0); ctx.restore();
}

// ─── SIDE PANEL ──────────────────────────────────────────────────────────────
function makeHaidtBars(haidt) {
  return Object.entries(haidt).map(([k,v]) => `
    <div class="bar-row">
      <span class="bar-label">${k}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${v}%;background:${barColors[k]}"></div></div>
      <span class="bar-val">${v}</span>
    </div>`).join('');
}

const side = document.getElementById('side');

function buildSection(emoji, title, items, shapeClass, shapeStyleFn, cardCls='card', initialCollapsed=false) {
  const hdr = document.createElement('div');
  hdr.className = 'section-header';

  // Collapse arrow + label
  const arrow = document.createElement('span');
  arrow.className = 'collapse-arrow';
  arrow.textContent = '▾';
  const label = document.createElement('span');
  label.className = 'section-label';
  label.appendChild(arrow);
  label.appendChild(document.createTextNode(` ${emoji} ${title}`));
  hdr.appendChild(label);

  // すべてON/OFF button
  const allBtn = document.createElement('button');
  allBtn.className = 'toggle-all-btn';
  let allOn = items.every(i => visible.has(i.name));
  allBtn.textContent = allOn ? 'すべてOFF' : 'すべてON';
  allBtn.addEventListener('click', e => {
    e.stopPropagation();
    allOn = !allOn;
    allBtn.textContent = allOn ? 'すべてOFF' : 'すべてON';
    items.forEach(item => {
      if (allOn) visible.add(item.name);
      else        visible.delete(item.name);
      const cb   = document.getElementById('cb-'   + item.name.replace(/\s/g,'_'));
      const card = document.getElementById('card-' + item.name.replace(/\s/g,'_'));
      if (cb)   cb.classList.toggle('checked', allOn);
      if (card) card.classList.toggle('hidden', !allOn);
    });
    drawChart();
  });
  hdr.appendChild(allBtn);
  side.appendChild(hdr);

  // Collapsible body
  const body = document.createElement('div');
  body.className = 'section-body' + (initialCollapsed ? ' collapsed' : '');
  let collapsed = initialCollapsed;
  arrow.classList.toggle('collapsed', initialCollapsed);
  label.style.cursor = 'pointer';
  label.addEventListener('click', () => {
    collapsed = !collapsed;
    body.classList.toggle('collapsed', collapsed);
    arrow.classList.toggle('collapsed', collapsed);
  });

  items.forEach(item => {
    const safeId = item.name.replace(/\s/g,'_');

    const div = document.createElement('div');
    div.className = cardCls + (visible.has(item.name) ? '' : ' hidden');
    div.id = 'card-' + safeId;

    // Checkbox
    const cbWrap = document.createElement('div');
    cbWrap.className = 'cb-wrap';
    const cbBox = document.createElement('div');
    cbBox.className = 'cb-box' + (visible.has(item.name) ? ' checked' : '');
    cbBox.id = 'cb-' + safeId;
    cbWrap.appendChild(cbBox);

    cbBox.addEventListener('click', e => {
      e.stopPropagation();
      const on = visible.has(item.name);
      if (on) {
        visible.delete(item.name);
        cbBox.classList.remove('checked');
        div.classList.add('hidden');
        if (activeKey === item.name) { activeKey = null; div.classList.remove('active'); }
      } else {
        visible.add(item.name);
        cbBox.classList.add('checked');
        div.classList.remove('hidden');
      }
      const anyOff = items.some(i => !visible.has(i.name));
      allOn = !anyOff;
      allBtn.textContent = allOn ? 'すべてOFF' : 'すべてON';
      drawChart();
    });

    // Shape icon
    const shape = document.createElement('div');
    shape.className = shapeClass;
    shape.setAttribute('style', shapeStyleFn(item));

    // Name
    const nameEl = document.createElement('span');
    nameEl.className = 'card-name';
    nameEl.textContent = item.name;

    // Header row
    const hdrRow = document.createElement('div');
    hdrRow.className = 'card-header';
    hdrRow.appendChild(cbWrap);
    hdrRow.appendChild(shape);
    hdrRow.appendChild(nameEl);

    // Haidt bars
    const barsEl = document.createElement('div');
    barsEl.className = 'haidt-bars';
    barsEl.innerHTML = makeHaidtBars(item.haidt);

    div.appendChild(hdrRow);
    div.appendChild(barsEl);

    // Card hover → tooltip
    div.addEventListener('mouseenter', e => showTooltip(item, e));
    div.addEventListener('mousemove',  e => positionTooltip(e));
    div.addEventListener('mouseleave', () => hideTooltip());

    // Card click → expand haidt / highlight
    div.addEventListener('click', () => {
      document.querySelectorAll('.card, .concept-card').forEach(c => c.classList.remove('active'));
      if (activeKey === item.name) {
        activeKey = null;
      } else {
        activeKey = item.name;
        div.classList.add('active');
      }
      drawChart();
    });

    body.appendChild(div);
  });
  side.appendChild(body);
}

// ─── TOOLTIP（Canvas・カード共用） ───────────────────────────────────────────
const tooltip = document.createElement('div');
tooltip.id = 'canvas-tooltip';
document.body.appendChild(tooltip);

function showTooltip(item, e) {
  tooltip.innerHTML =
    `<span class="tt-name" style="color:${item.color}">${item.name}</span>` +
    `<span class="tt-desc">${item.desc}</span>`;
  tooltip.style.display = 'flex';
  positionTooltip(e);
}
function positionTooltip(e) {
  const tx = Math.min(e.clientX + 16, window.innerWidth  - 300);
  const ty = Math.min(e.clientY + 16, window.innerHeight -  80);
  tooltip.style.left = tx + 'px';
  tooltip.style.top  = ty + 'px';
}
function hideTooltip() {
  tooltip.style.display = 'none';
}

buildSection('🇯🇵', '日本の政党',       jpParties,     'dot',     p => `background:${p.color}`);
buildSection('🌏',  '海外の主要政党',     foreignParties,'diamond', p => `background:${p.color}`,              'card',         true);
buildSection('📐',  '政治理論・国家形態', concepts,      'tri',     c => `border-bottom-color:${c.color}`,   'concept-card', true);

// Note
const note = document.createElement('div');
note.className = 'note-box';
note.innerHTML = `
  <strong>操作方法</strong><br>
  🔍 マウスホイール … チャートをズームイン／ズームアウト（カーソル位置中心）<br>
  🖱 ドラッグ … ズーム時にチャートをパン（移動）<br>
  ＋／－ボタン … ズームイン／アウト　↺ … 表示リセット<br>
  ☑ チェックボックス … 個別の表示／非表示を切替<br>
  「すべてOFF/ON」ボタン … セクション全体を一括切替<br>
  マウスオーバー（チャート／カード） … 名称と説明を表示<br>
  カード本体クリック … ハイトの6道徳基盤スコアを展開 ＆ チャート上でハイライト<br><br>
  <strong>▲ 三角形</strong>＝政治理論の概念（理想型）
  <strong>◆ 菱形</strong>＝海外の主要政党
  <strong>● 円形</strong>＝日本の政党<br><br>
  <span style="color:#666">スコアは各政党・概念の言説を基に概念的に推定した相対値（0〜100）。比較のための参照点です。</span>
`;
side.appendChild(note);

const allItems = [...jpParties, ...foreignParties, ...concepts];
const HIT_R = 16;  // ヒット判定半径（px）

// ─── ZOOM HELPERS ────────────────────────────────────────────────────────────
function updateZoomDisplay() {
  const el = document.getElementById('zoom-display');
  if (el) el.textContent = Math.round(zoom * 100) + '%';
}

// マウスホイールでズーム（カーソル位置中心）
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
  const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
  const f = newZoom / zoom;
  panX = panX + (1 - f) * (mouseX - panX - W/2);
  panY = panY + (1 - f) * (mouseY - panY - H/2);
  zoom = newZoom;
  updateZoomDisplay();
  drawChart();
}, { passive: false });

// ドラッグでパン
let isDragging = false, dragSX, dragSY, dragPX, dragPY;

canvas.addEventListener('mousedown', e => {
  isDragging = true;
  dragSX = e.clientX; dragSY = e.clientY;
  dragPX = panX;      dragPY = panY;
});
window.addEventListener('mouseup', () => { isDragging = false; });

// ─── CANVAS MOUSE EVENTS ─────────────────────────────────────────────────────
canvas.addEventListener('mousemove', e => {
  if (isDragging) {
    panX = dragPX + (e.clientX - dragSX);
    panY = dragPY + (e.clientY - dragSY);
    drawChart();
    hideTooltip();
    canvas.style.cursor = 'grabbing';
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const cssX = e.clientX - rect.left;
  const cssY = e.clientY - rect.top;
  // 逆変換でズーム適用後の描画座標に変換
  const mx = (cssX - panX - W/2) / zoom + W/2;
  const my = (cssY - panY - H/2) / zoom + H/2;

  let found = null;
  for (const item of allItems) {
    if (!visible.has(item.name)) continue;
    const [cx, cy] = px(item.x, item.y);
    if (Math.hypot(mx - cx, my - cy) < HIT_R / zoom) { found = item; break; }
  }

  if (found) {
    showTooltip(found, e);
    canvas.style.cursor = 'pointer';
  } else {
    hideTooltip();
    canvas.style.cursor = zoom > 1.01 ? 'grab' : 'default';
  }
});

canvas.addEventListener('mouseleave', () => {
  hideTooltip();
  canvas.style.cursor = 'default';
});

drawChart();

// ─── ZOOM BUTTONS ─────────────────────────────────────────────────────────────
document.getElementById('zoom-in-btn').addEventListener('click', () => {
  const newZoom = Math.min(MAX_ZOOM, zoom * 1.25);
  const f = newZoom / zoom;
  panX *= f; panY *= f;
  zoom = newZoom;
  updateZoomDisplay(); drawChart();
});
document.getElementById('zoom-out-btn').addEventListener('click', () => {
  const newZoom = Math.max(MIN_ZOOM, zoom / 1.25);
  const f = newZoom / zoom;
  panX *= f; panY *= f;
  zoom = newZoom;
  updateZoomDisplay(); drawChart();
});
document.getElementById('zoom-reset-btn').addEventListener('click', () => {
  zoom = 1; panX = 0; panY = 0;
  updateZoomDisplay(); drawChart();
});
