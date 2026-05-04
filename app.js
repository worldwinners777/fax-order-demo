// ============================================================
// 東西青果 FAX注文処理システム — Phase 1 prototype (v2)
// All data is mock. No real OCR. No inventory. No purchasing.
// ============================================================

// ---------- Date helpers ----------
function isoDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${y}年${parseInt(m, 10)}月${parseInt(d, 10)}日`;
}
const TODAY = isoDate(0);
const TOMORROW = isoDate(1);

const UNITS = ["kg","箱","袋","個","本","束","玉","房","パック"];

// ---------- Status definitions ----------
const STATUS = {
  unchecked:        { label: "未確認",     cls: "badge-amber" },
  needs_correction: { label: "要修正",     cls: "badge-red"   },
  checked:          { label: "確認済み",   cls: "badge-green" },
  ready:            { label: "印刷待ち",   cls: "badge-blue"  }
};
function statusBadge(status, large = false) {
  const s = STATUS[status] || STATUS.unchecked;
  return `<span class="badge ${s.cls}${large ? " badge-lg" : ""}">${s.label}</span>`;
}

// ---------- Sample / mock orders ----------
const sampleOrders = [
  {
    id: "FX-0001", receivedAt: "08:14",
    customer: "山田青果店", contact: "山田 太郎 / 03-1234-5678",
    orderDate: TODAY, deliveryDate: TOMORROW,
    status: "unchecked",
    items: [
      { name: "キャベツ", qty: 5,  unit: "箱", notes: "Mサイズ" },
      { name: "大根",     qty: 20, unit: "本", notes: "" },
      { name: "にんじん", qty: 15, unit: "kg", notes: "L" },
      { name: "玉ねぎ",   qty: 3,  unit: "袋", notes: "" },
      { name: "トマト",   qty: 2,  unit: "箱", notes: "完熟" }
    ],
    note: "朝便でお願いします"
  },
  {
    id: "FX-0002", receivedAt: "08:42",
    customer: "鈴木食堂", contact: "鈴木 花子 / 03-2345-6789",
    orderDate: TODAY, deliveryDate: TOMORROW,
    status: "unchecked",
    items: [
      { name: "じゃがいも", qty: 10, unit: "kg", notes: "男爵" },
      { name: "玉ねぎ",     qty: 5,  unit: "kg", notes: "" },
      { name: "きゅうり",   qty: 30, unit: "本", notes: "" },
      { name: "ピーマン",   qty: 2,  unit: "kg", notes: "" }
    ],
    note: ""
  },
  {
    id: "FX-0003", receivedAt: "09:05",
    customer: "田中レストラン", contact: "田中 健 / 03-3456-7890",
    orderDate: TODAY, deliveryDate: TOMORROW,
    status: "unchecked",
    items: [
      { name: "アスパラ",   qty: 5,  unit: "束", notes: "国産" },
      { name: "レタス",     qty: 20, unit: "玉", notes: "" },
      { name: "ミニトマト", qty: 1,  unit: "箱", notes: "" },
      { name: "レモン",     qty: 2,  unit: "kg", notes: "国産希望" },
      { name: "バジル",     qty: 10, unit: "束", notes: "" },
      { name: "パプリカ",   qty: 3,  unit: "kg", notes: "赤・黄ミックス" },
      { name: "ズッキーニ", qty: 2,  unit: "kg", notes: "" },
      { name: "なす",       qty: 4,  unit: "kg", notes: "" }
    ],
    note: "ディナー仕込み用"
  },
  {
    id: "FX-0004", receivedAt: "09:31",
    customer: "佐藤スーパー", contact: "佐藤 一郎 / 03-4567-8901",
    orderDate: TODAY, deliveryDate: TOMORROW,
    status: "unchecked",
    items: [
      { name: "りんご", qty: 3,  unit: "箱", notes: "ふじ" },
      { name: "みかん", qty: 5,  unit: "箱", notes: "" },
      { name: "バナナ", qty: 10, unit: "房", notes: "" },
      { name: "いちご", qty: 20, unit: "パック", notes: "" },
      { name: "ぶどう", qty: 2,  unit: "箱", notes: "巨峰" }
    ],
    note: "週末セール用"
  },
  {
    id: "FX-0005", receivedAt: "10:08",
    customer: "高橋ホテル", contact: "高橋 雅子 / 03-5678-9012",
    orderDate: TODAY, deliveryDate: TOMORROW,
    status: "unchecked",
    items: [
      { name: "アボカド",     qty: 30, unit: "個", notes: "" },
      { name: "ほうれん草",   qty: 10, unit: "束", notes: "" },
      { name: "ブロッコリー", qty: 8,  unit: "玉", notes: "" },
      { name: "パセリ",       qty: 5,  unit: "束", notes: "" },
      { name: "生姜",         qty: 3,  unit: "kg", notes: "" },
      { name: "にんにく",     qty: 2,  unit: "kg", notes: "青森産" },
      { name: "セロリ",       qty: 4,  unit: "束", notes: "" }
    ],
    note: "朝食ビュッフェ用"
  },
  {
    id: "FX-0006", receivedAt: "10:47",
    customer: "伊藤居酒屋", contact: "伊藤 浩 / 03-6789-0123",
    orderDate: TODAY, deliveryDate: TOMORROW,
    status: "unchecked",
    items: [
      { name: "枝豆",   qty: 5,  unit: "袋", notes: "" },
      { name: "おくら", qty: 3,  unit: "kg", notes: "" },
      { name: "大葉",   qty: 10, unit: "束", notes: "" },
      { name: "茗荷",   qty: 2,  unit: "袋", notes: "" }
    ],
    note: ""
  },
  {
    id: "FX-0007", receivedAt: "11:15",
    customer: "渡辺給食センター", contact: "渡辺 正 / 03-7890-1234",
    orderDate: TODAY, deliveryDate: TOMORROW,
    status: "unchecked",
    items: [
      { name: "にんじん",   qty: 50,  unit: "kg", notes: "" },
      { name: "じゃがいも", qty: 80,  unit: "kg", notes: "" },
      { name: "玉ねぎ",     qty: 60,  unit: "kg", notes: "" },
      { name: "キャベツ",   qty: 30,  unit: "箱", notes: "" },
      { name: "きゅうり",   qty: 100, unit: "本", notes: "" },
      { name: "トマト",     qty: 5,   unit: "箱", notes: "" },
      { name: "ピーマン",   qty: 8,   unit: "kg", notes: "" },
      { name: "ねぎ",       qty: 30,  unit: "束", notes: "" }
    ],
    note: "学校給食 / 月曜納品"
  }
];

// faxItems = original truthful fax content (frozen).
// items    = OCR-extracted/edited content (mutated by mock OCR errors + staff edits).
sampleOrders.forEach(o => {
  o.faxItems = JSON.parse(JSON.stringify(o.items));
});

// Inject realistic OCR mistakes that staff need to correct.
function injectOcrErrors() {
  // FX-0001: misread quantity (15kg → 1kg)
  sampleOrders[0].status = "needs_correction";
  sampleOrders[0]._ocrNotice = "数量を1件、自動補正候補として表示しています。";
  sampleOrders[0].items[2] = { ...sampleOrders[0].items[2], qty: 1, notes: "L (要確認)" };
  // FX-0003: 1 item dropped (バジル)
  sampleOrders[2].status = "needs_correction";
  sampleOrders[2]._ocrNotice = "1品目が読み取れませんでした。手入力をお願いします。";
  sampleOrders[2].items.splice(4, 1);
  // FX-0005: wrong unit on にんにく (kg → 個)
  sampleOrders[4].status = "needs_correction";
  sampleOrders[4]._ocrNotice = "単位の自動判定に自信がありません。";
  sampleOrders[4].items[5] = { ...sampleOrders[4].items[5], unit: "個", notes: "青森産 (単位要確認)" };
}
injectOcrErrors();

let orders = JSON.parse(JSON.stringify(sampleOrders));

// ---------- App state ----------
let currentScreen = "dashboard";
let currentOcrId = orders[0].id;
let currentSplitId = orders[0].id;
let faxView = { zoom: 1.0, rotation: 0, page: 1 };
// null → auto "fit to pane height" (so A3 never scrolls vertically; only horizontal scroll
// is possible). A number means the user set a manual zoom via the +/- buttons.
let a3SplitZoom = null;

const ITEMS_PER_FAX_PAGE = 6;
function getFaxPageCount(order) {
  return Math.max(1, Math.ceil(order.faxItems.length / ITEMS_PER_FAX_PAGE));
}

// ---------- Toast ----------
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 1800);
}

// ---------- Navigation ----------
function showScreen(name) {
  currentScreen = name;
  document.querySelectorAll(".screen").forEach(s => s.classList.toggle("active", s.id === `screen-${name}`));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.screen === name));
  if (name === "dashboard") renderDashboard();
  if (name === "ocr") renderOcr();
  if (name === "split") renderSplit();
  if (name === "print") renderPrint();
  window.scrollTo(0, 0);
}
document.querySelectorAll(".nav-btn").forEach(btn =>
  btn.addEventListener("click", () => showScreen(btn.dataset.screen)));
document.body.addEventListener("click", (e) => {
  const t = e.target.closest("[data-goto]");
  if (t) showScreen(t.dataset.goto);
});

// ---------- Helpers ----------
function escapeAttr(s) { return String(s == null ? "" : s).replace(/"/g, "&quot;"); }
function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// ============================================================
// Dashboard
// ============================================================
function renderDashboard() {
  const total = orders.length;
  const unchecked = orders.filter(o => o.status === "unchecked" || o.status === "needs_correction").length;
  const checked = orders.filter(o => o.status === "checked" || o.status === "ready").length;
  const itemsTotal = orders.reduce((s, o) => s + o.items.length, 0);

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statPending").textContent = unchecked;
  document.getElementById("statChecked").textContent = checked;
  document.getElementById("statItems").textContent = itemsTotal;

  const tbody = document.getElementById("dashboardList");
  tbody.innerHTML = "";
  orders.forEach(o => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${o.receivedAt}</td>
      <td><strong>${escapeHtml(o.customer)}</strong></td>
      <td>${o.items.length} 品目</td>
      <td>${fmtDate(o.deliveryDate)}</td>
      <td>${statusBadge(o.status)}</td>
      <td>
        <button class="btn btn-secondary" data-open-ocr="${o.id}">編集</button>
        <button class="btn btn-secondary" data-open-split="${o.id}">突合せ</button>
      </td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll("[data-open-ocr]").forEach(b =>
    b.addEventListener("click", () => { currentOcrId = b.dataset.openOcr; showScreen("ocr"); }));
  tbody.querySelectorAll("[data-open-split]").forEach(b =>
    b.addEventListener("click", () => { currentSplitId = b.dataset.openSplit; showScreen("split"); }));
}

// ============================================================
// Upload
// ============================================================
const uploadZone = document.getElementById("uploadZone");
const fileInput = document.getElementById("fileInput");
const uploadedListCard = document.getElementById("uploadedListCard");
const uploadedList = document.getElementById("uploadedList");
let uploadedFiles = [];

document.getElementById("selectFileBtn").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => handleFiles(e.target.files));
["dragenter", "dragover"].forEach(ev =>
  uploadZone.addEventListener(ev, (e) => { e.preventDefault(); uploadZone.classList.add("drag"); }));
["dragleave", "drop"].forEach(ev =>
  uploadZone.addEventListener(ev, (e) => { e.preventDefault(); uploadZone.classList.remove("drag"); }));
uploadZone.addEventListener("drop", (e) => handleFiles(e.dataTransfer.files));

function handleFiles(fileList) {
  for (const f of fileList) uploadedFiles.push({ name: f.name, size: f.size });
  renderUploadedList();
}
function renderUploadedList() {
  if (uploadedFiles.length === 0) { uploadedListCard.style.display = "none"; return; }
  uploadedListCard.style.display = "";
  uploadedList.innerHTML = "";
  uploadedFiles.forEach((f, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="file-name"><span class="file-icon">📄</span><strong>${escapeHtml(f.name)}</strong>
        <span class="muted">（${(f.size/1024).toFixed(1)} KB）</span></span>
      <button class="btn btn-secondary" data-rm="${i}">削除</button>`;
    uploadedList.appendChild(li);
  });
  uploadedList.querySelectorAll("[data-rm]").forEach(b =>
    b.addEventListener("click", () => { uploadedFiles.splice(+b.dataset.rm, 1); renderUploadedList(); }));
}
document.getElementById("runOcrBtn").addEventListener("click", () => {
  if (uploadedFiles.length === 0) { toast("ファイルが選択されていません"); return; }
  toast(`模擬OCRを実行しました（${uploadedFiles.length}件）`);
  uploadedFiles = [];
  renderUploadedList();
  setTimeout(() => showScreen("ocr"), 600);
});

// ============================================================
// OCR review
// ============================================================
function renderOcr() {
  const sel = document.getElementById("ocrOrderSelect");
  sel.innerHTML = "";
  orders.forEach(o => {
    const opt = document.createElement("option");
    opt.value = o.id;
    opt.textContent = `${o.id} ／ ${o.customer} （${o.items.length}品目）`;
    sel.appendChild(opt);
  });
  sel.value = currentOcrId;
  sel.onchange = () => { currentOcrId = sel.value; renderOcr(); };

  const order = orders.find(o => o.id === currentOcrId);
  document.getElementById("editCustomer").value = order.customer;
  document.getElementById("editOrderDate").value = order.orderDate;
  document.getElementById("editDeliveryDate").value = order.deliveryDate;

  const badge = document.getElementById("ocrStatusBadge");
  const s = STATUS[order.status] || STATUS.unchecked;
  badge.className = `badge ${s.cls}`;
  badge.textContent = s.label;
  if (order._ocrNotice) badge.title = order._ocrNotice;

  const tbody = document.querySelector("#ocrItemTable tbody");
  tbody.innerHTML = "";
  order.items.forEach((it, idx) => tbody.appendChild(makeOcrRow(order, it, idx)));
}
function makeOcrRow(order, it, idx) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" data-f="name"  value="${escapeAttr(it.name)}"></td>
    <td><input type="number" data-f="qty" value="${it.qty}" min="0" step="0.1"></td>
    <td>
      <select data-f="unit">
        ${UNITS.map(u => `<option value="${u}" ${u===it.unit?"selected":""}>${u}</option>`).join("")}
      </select>
    </td>
    <td><input type="text" data-f="notes" value="${escapeAttr(it.notes)}"></td>
    <td><button class="row-delete-btn" data-del="${idx}">削除</button></td>`;
  tr.querySelectorAll("[data-f]").forEach(inp =>
    inp.addEventListener("input", () => collectOcrFromForm()));
  tr.querySelector("[data-del]").addEventListener("click", () => {
    order.items.splice(idx, 1);
    renderOcr();
  });
  return tr;
}
function collectOcrFromForm() {
  const order = orders.find(o => o.id === currentOcrId);
  order.customer     = document.getElementById("editCustomer").value;
  order.orderDate    = document.getElementById("editOrderDate").value;
  order.deliveryDate = document.getElementById("editDeliveryDate").value;
  const rows = document.querySelectorAll("#ocrItemTable tbody tr");
  order.items = Array.from(rows).map(r => ({
    name:  r.querySelector('[data-f="name"]').value,
    qty:   parseFloat(r.querySelector('[data-f="qty"]').value) || 0,
    unit:  r.querySelector('[data-f="unit"]').value,
    notes: r.querySelector('[data-f="notes"]').value
  }));
}
document.getElementById("addItemBtn").addEventListener("click", () => {
  const order = orders.find(o => o.id === currentOcrId);
  order.items.push({ name: "", qty: 0, unit: "kg", notes: "" });
  renderOcr();
});
document.getElementById("saveOcrBtn").addEventListener("click", () => {
  collectOcrFromForm();
  toast("修正を保存しました");
});
document.getElementById("markCheckedBtn").addEventListener("click", () => {
  collectOcrFromForm();
  const order = orders.find(o => o.id === currentOcrId);
  order.status = "checked";
  toast("確認済みにしました");
  renderOcr();
});

// ============================================================
// Split-screen confirmation
// ============================================================
function renderSplit() {
  // Build select options
  const sel = document.getElementById("splitOrderSelect");
  sel.innerHTML = "";
  orders.forEach(o => {
    const opt = document.createElement("option");
    opt.value = o.id;
    opt.textContent = `${o.id} ／ ${o.customer} （${STATUS[o.status].label}）`;
    sel.appendChild(opt);
  });
  sel.value = currentSplitId;
  sel.onchange = () => {
    currentSplitId = sel.value;
    faxView = { zoom: 1.0, rotation: 0, page: 1 };
    renderSplit();
  };

  const order = orders.find(o => o.id === currentSplitId);

  // Pane head info — show position within the day's faxes (e.g. "FAX 2 / 7")
  const faxIndex = orders.findIndex(o => o.id === currentSplitId);
  document.getElementById("faxHeadInfo").textContent =
    `FAX ${faxIndex + 1} / ${orders.length}　・　${order.id} ／ ${order.customer} ／ 受信 ${order.receivedAt}`;
  const a3HeadInfo = document.getElementById("a3HeadInfo");

  // Toolbar status badge
  const sb = document.getElementById("splitStatusBadge");
  const s = STATUS[order.status] || STATUS.unchecked;
  sb.className = `badge badge-lg ${s.cls}`;
  sb.textContent = s.label;
  if (order._ocrNotice) sb.title = order._ocrNotice;

  // Render fax (left)
  renderFaxCanvas(order);

  // Render A3 pages (right) — pack ALL orders, editable
  const container = document.getElementById("splitA3Pages");
  const pageCount = paginateAndRender(orders, container, { clickable: true, selectedId: currentSplitId });
  a3HeadInfo.textContent = `${orders.length} 件の顧客 / ${pageCount} ページ`;

  applyA3Zoom();

  // Scroll selected customer block into view
  setTimeout(() => {
    const target = container.querySelector(`.customer-block[data-order-id="${currentSplitId}"]`);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 50);
}

// ---------- Fax canvas (zoom / rotate / page) ----------
function renderFaxCanvas(order) {
  const canvas = document.getElementById("faxCanvas");
  const totalPages = getFaxPageCount(order);
  if (faxView.page > totalPages) faxView.page = totalPages;
  canvas.innerHTML = makeFaxSvg(order, faxView.page);
  canvas.style.transform = `rotate(${faxView.rotation}deg) scale(${faxView.zoom})`;
  document.getElementById("faxZoomLabel").textContent = `${Math.round(faxView.zoom * 100)}%`;
  document.getElementById("faxPageLabel").textContent = `P.${faxView.page} / ${totalPages}`;
  // Disable only at the very first/last page of the very first/last fax
  const isFirstFax = currentSplitId === orders[0].id;
  const isLastFax  = currentSplitId === orders[orders.length - 1].id;
  document.getElementById("faxPrev").disabled = (faxView.page <= 1) && isFirstFax;
  document.getElementById("faxNext").disabled = (faxView.page >= totalPages) && isLastFax;
}

document.getElementById("faxZoomIn").addEventListener("click", () => {
  faxView.zoom = Math.min(3.0, +(faxView.zoom + 0.25).toFixed(2));
  renderFaxCanvas(currentOrder());
});
document.getElementById("faxZoomOut").addEventListener("click", () => {
  faxView.zoom = Math.max(0.5, +(faxView.zoom - 0.25).toFixed(2));
  renderFaxCanvas(currentOrder());
});
document.getElementById("faxRotate").addEventListener("click", () => {
  faxView.rotation = (faxView.rotation + 90) % 360;
  renderFaxCanvas(currentOrder());
});
document.getElementById("faxFit").addEventListener("click", () => {
  faxView = { zoom: 1.0, rotation: 0, page: faxView.page };
  renderFaxCanvas(currentOrder());
});
// Prev/Next walk through every page of every fax: when you reach the last page
// of the current fax, the next click jumps to page 1 of the next fax (and vice versa).
// This treats the day's uploaded faxes as one continuous multi-page document.
function navFaxPage(direction) {
  const order = currentOrder();
  const total = getFaxPageCount(order);
  const idx = orders.findIndex(o => o.id === currentSplitId);
  if (direction === 1) {
    if (faxView.page < total) {
      faxView.page++;
      renderFaxCanvas(currentOrder());
    } else if (idx < orders.length - 1) {
      currentSplitId = orders[idx + 1].id;
      faxView = { zoom: 1.0, rotation: 0, page: 1 };
      renderSplit();
    }
  } else {
    if (faxView.page > 1) {
      faxView.page--;
      renderFaxCanvas(currentOrder());
    } else if (idx > 0) {
      const prev = orders[idx - 1];
      currentSplitId = prev.id;
      faxView = { zoom: 1.0, rotation: 0, page: getFaxPageCount(prev) };
      renderSplit();
    }
  }
}
document.getElementById("faxPrev").addEventListener("click", () => navFaxPage(-1));
document.getElementById("faxNext").addEventListener("click", () => navFaxPage(1));
function currentOrder() { return orders.find(o => o.id === currentSplitId); }

// ---------- A3 right-pane zoom ----------
// Compute the zoom factor that makes the A3 page exactly fit the
// available height of the .a3-pane (so the user never gets a vertical scrollbar).
function computeFitZoom() {
  const pane = document.querySelector("#screen-split .a3-pane");
  if (!pane) return 0.85;
  const cs = getComputedStyle(pane);
  const padT = parseFloat(cs.paddingTop) || 0;
  const padB = parseFloat(cs.paddingBottom) || 0;
  const paneH = pane.clientHeight - padT - padB;
  if (paneH <= 0) return 0.85;
  // Measure 297mm in physical pixels (browser-dependent)
  const ruler = document.createElement("div");
  ruler.style.cssText = "position:absolute;left:-9999px;width:1mm;height:297mm;";
  document.body.appendChild(ruler);
  const a3H = ruler.getBoundingClientRect().height;
  document.body.removeChild(ruler);
  return Math.max(0.35, Math.min(1.5, paneH / a3H));
}

function applyA3Zoom() {
  const wrap = document.getElementById("splitA3Pages");
  if (!wrap) return;
  const zoom = (a3SplitZoom == null) ? computeFitZoom() : a3SplitZoom;
  wrap.style.zoom = zoom;
  document.getElementById("a3ZoomLabel").textContent = `${Math.round(zoom * 100)}%`;
}

document.getElementById("a3ZoomIn").addEventListener("click", () => {
  const cur = (a3SplitZoom == null) ? computeFitZoom() : a3SplitZoom;
  a3SplitZoom = Math.min(1.5, +(cur + 0.05).toFixed(2));
  applyA3Zoom();
});
document.getElementById("a3ZoomOut").addEventListener("click", () => {
  const cur = (a3SplitZoom == null) ? computeFitZoom() : a3SplitZoom;
  a3SplitZoom = Math.max(0.35, +(cur - 0.05).toFixed(2));
  applyA3Zoom();
});

// Re-fit when the window resizes, but only while in auto mode so we don't
// override a manual zoom the user has dialed in.
window.addEventListener("resize", () => {
  if (currentScreen === "split" && a3SplitZoom == null) applyA3Zoom();
});

// ---------- Status / save buttons on split toolbar ----------
function setStatus(orderId, status, msg) {
  const o = orders.find(x => x.id === orderId);
  o.status = status;
  toast(msg);
  renderSplit();
}
document.getElementById("splitSaveBtn").addEventListener("click", () => toast("修正を保存しました"));
document.getElementById("splitNeedsCorrBtn").addEventListener("click", () =>
  setStatus(currentSplitId, "needs_correction", "「要修正」に設定しました"));
document.getElementById("splitCheckedBtn").addEventListener("click", () =>
  setStatus(currentSplitId, "checked", "「確認済み」にしました"));
document.getElementById("splitReadyBtn").addEventListener("click", () =>
  setStatus(currentSplitId, "ready", "「印刷待ち」にしました"));
document.getElementById("splitPrintBtn").addEventListener("click", () => {
  showScreen("print");
  setTimeout(() => window.print(), 400);
});
document.getElementById("splitExportBtn").addEventListener("click", () => {
  showScreen("print");
  toast("ブラウザの「PDFとして保存」を選択してください");
  setTimeout(() => window.print(), 600);
});

// ============================================================
// Mock fax SVG (handwritten-feel, multi-page support)
// ============================================================
function makeFaxSvg(order, page) {
  const start = (page - 1) * ITEMS_PER_FAX_PAGE;
  const items = order.faxItems.slice(start, start + ITEMS_PER_FAX_PAGE);
  const totalPages = getFaxPageCount(order);
  const headerY = page === 1 ? 240 : 160;
  const tableTop = headerY + 20;

  const rows = items.map((it, i) => {
    const y = tableTop + 10 + i * 38;
    return `
      <line x1="40" y1="${y+22}" x2="560" y2="${y+22}" stroke="#222" stroke-width="0.5" stroke-dasharray="2,2"/>
      <text x="50"  y="${y+18}" class="hand">${escapeHtml(it.name)}</text>
      <text x="330" y="${y+18}" class="hand" text-anchor="end">${it.qty}</text>
      <text x="345" y="${y+18}" class="hand">${escapeHtml(it.unit)}</text>
      <text x="400" y="${y+18}" class="hand small">${escapeHtml(it.notes||"")}</text>`;
  }).join("");

  const tableHeight = items.length * 38;
  const bottomY = tableTop + 10 + tableHeight;

  const headerBlock = page === 1 ? `
      <text x="300" y="60" class="header" text-anchor="middle">御 注 文 書</text>
      <line x1="60" y1="80" x2="540" y2="80" stroke="#222" stroke-width="2"/>
      <text x="50"  y="120" class="label">FAX No.</text>
      <text x="130" y="120" class="hand">${order.id}</text>
      <text x="380" y="120" class="label">受信:</text>
      <text x="430" y="120" class="hand">${order.receivedAt}</text>

      <text x="50"  y="160" class="label">御得意様名</text>
      <text x="160" y="162" class="hand cust">${escapeHtml(order.customer)}</text>
      <line x1="160" y1="170" x2="540" y2="170" stroke="#222" stroke-width="0.7"/>

      <text x="50"  y="200" class="label">ご担当</text>
      <text x="130" y="202" class="hand">${escapeHtml(order.contact||"")}</text>
      <line x1="130" y1="210" x2="540" y2="210" stroke="#222" stroke-width="0.5"/>

      <text x="50"  y="240" class="label">納品日</text>
      <text x="130" y="242" class="hand">${fmtDate(order.deliveryDate)}</text>` : `
      <text x="300" y="60" class="header" text-anchor="middle">御 注 文 書（続き）</text>
      <line x1="60" y1="80" x2="540" y2="80" stroke="#222" stroke-width="2"/>
      <text x="50"  y="120" class="label">FAX No.</text>
      <text x="130" y="120" class="hand">${order.id} (P.${page})</text>
      <text x="380" y="120" class="label">御得意様:</text>
      <text x="450" y="120" class="hand">${escapeHtml(order.customer)}</text>`;

  const note = (page === totalPages && order.note)
    ? `<text x="40" y="${bottomY + 50}" class="hand small">特記：${escapeHtml(order.note)}</text>`
    : "";

  const stamp = page === 1 ? `
      <g transform="translate(490,720) rotate(-8)">
        <circle cx="0" cy="0" r="36" fill="none" stroke="#a02020" stroke-width="2"/>
        <text x="0" y="-6"  text-anchor="middle" font-family="serif" font-size="14" fill="#a02020">受 信</text>
        <text x="0" y="14" text-anchor="middle" font-family="serif" font-size="12" fill="#a02020">${order.receivedAt}</text>
      </g>` : "";

  return `
    <svg viewBox="0 0 600 850" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          .hand { font-family: "Yu Mincho","Hiragino Mincho ProN", serif; font-size: 22px; fill:#222; }
          .hand.small { font-size: 16px; fill:#444; }
          .hand.cust { font-size: 26px; }
          .label { font-family: sans-serif; font-size: 14px; fill:#222; }
          .header { font-family: serif; font-size: 28px; fill:#222; font-weight: 700; letter-spacing: 4px; }
          .stamp  { font-family: serif; font-size: 14px; fill:#a02020; }
          .pagenum { font-family: sans-serif; font-size: 12px; fill:#5a6a80; }
          .box { fill: none; stroke: #222; stroke-width: 1; }
        </style>
      </defs>
      <rect x="0" y="0" width="600" height="850" fill="#fbfaf3"/>
      ${headerBlock}
      <rect x="40" y="${tableTop}" width="520" height="30" class="box"/>
      <text x="50"  y="${tableTop+22}" class="label">品 名</text>
      <text x="320" y="${tableTop+22}" class="label" text-anchor="end">数量</text>
      <text x="345" y="${tableTop+22}" class="label">単位</text>
      <text x="400" y="${tableTop+22}" class="label">備　考</text>
      <line x1="305" y1="${tableTop}" x2="305" y2="${bottomY}" stroke="#222" stroke-width="0.7"/>
      <line x1="340" y1="${tableTop}" x2="340" y2="${bottomY}" stroke="#222" stroke-width="0.7"/>
      <line x1="390" y1="${tableTop}" x2="390" y2="${bottomY}" stroke="#222" stroke-width="0.7"/>
      <rect x="40" y="${tableTop+30}" width="520" height="${tableHeight}" class="box"/>
      ${rows}
      ${note}
      ${stamp}
      <text x="560" y="830" class="pagenum" text-anchor="end">P. ${page} / ${totalPages}</text>
    </svg>`;
}

// ============================================================
// A3 print preview screen
// ============================================================
function renderPrint() {
  const scope = document.getElementById("printScopeSelect").value;
  let list;
  if (scope === "checked") {
    list = orders.filter(o => o.status === "checked" || o.status === "ready");
  } else {
    list = orders;
  }
  const container = document.getElementById("a3Pages");
  container.innerHTML = "";
  if (list.length === 0) {
    container.innerHTML = `<div class="card" style="padding:20px">対象のFAXがありません。</div>`;
    return;
  }
  paginateAndRender(list, container, { clickable: false });
}
document.getElementById("printScopeSelect").addEventListener("change", renderPrint);
document.getElementById("printBtn").addEventListener("click", () => window.print());
document.getElementById("exportPdfBtn").addEventListener("click", () => {
  toast("ブラウザの「PDFとして保存」を選択してください");
  setTimeout(() => window.print(), 400);
});

// ============================================================
// A3 layout / pagination — measures each block, packs into 3 columns × N pages.
// Returns the number of pages rendered.
// ============================================================
function paginateAndRender(orderList, container, opts = {}) {
  const clickable = !!opts.clickable;
  const selectedId = opts.selectedId;
  container.innerHTML = "";

  // Measure 1mm in px
  const ref = document.createElement("div");
  ref.style.cssText = "position:absolute;left:-9999px;top:0;width:100mm;height:1mm;";
  document.body.appendChild(ref);
  const pxPerMm = ref.getBoundingClientRect().width / 100;
  document.body.removeChild(ref);

  // Page geometry (mm) — must match the .a3-page / .a3-grid / .a3-col CSS
  const PAGE_H_MM = 297;
  const PAD_Y_MM = 14;
  const HEADER_MM = 22;
  const FOOTER_MM = 12;
  const COLS = 3;
  const COL_TOTAL_MM = 100;   // matches: .a3-grid grid-template-columns: repeat(3, 100mm)
  const COL_PAD_MM = 2;       // matches: .a3-col padding: 0 2mm
  const COL_BORDER_MM = 2;    // matches: .a3-col border-right: 2px solid #000
  // Customer-block fills the column's content area (col total minus padding/border).
  const colW_MM = COL_TOTAL_MM - 2 * COL_PAD_MM - COL_BORDER_MM;
  const innerH_MM = PAGE_H_MM - PAD_Y_MM * 2 - HEADER_MM - FOOTER_MM;
  const colH_PX = innerH_MM * pxPerMm;

  // Measure each block (off-screen). Wrap in .a3-page > .a3-col so descendant CSS applies.
  const measurer = document.createElement("div");
  measurer.className = "a3-page";
  measurer.style.cssText =
    `position:absolute;left:-9999px;top:0;width:${colW_MM}mm;` +
    `height:auto;padding:0;display:block;visibility:hidden;box-shadow:none;`;
  const measureCol = document.createElement("div");
  measureCol.className = "a3-col";
  measureCol.style.cssText = "border:none;padding:0;display:block;";
  measurer.appendChild(measureCol);
  document.body.appendChild(measurer);
  const blocks = orderList.map(order => {
    const el = makeCustomerBlockEl(order, { clickable });
    measureCol.appendChild(el);
    const h = el.getBoundingClientRect().height;
    return { order, height: h };
  });
  document.body.removeChild(measurer);

  // Greedy pack: fill column 1 top-to-bottom, then column 2, then column 3, then next page
  const pages = [];
  let page = Array.from({ length: COLS }, () => []);
  let colIdx = 0;
  let used = 0;
  for (const b of blocks) {
    if (b.height > colH_PX && used === 0) {
      page[colIdx].push(b.order);
      used = colH_PX;
    } else if (used + b.height > colH_PX) {
      colIdx++;
      if (colIdx >= COLS) {
        pages.push(page);
        page = Array.from({ length: COLS }, () => []);
        colIdx = 0;
      }
      page[colIdx].push(b.order);
      used = b.height;
    } else {
      page[colIdx].push(b.order);
      used += b.height;
    }
  }
  if (page.some(c => c.length > 0)) pages.push(page);

  // Render
  pages.forEach((pageCols, idx) => {
    const pageEl = document.createElement("div");
    pageEl.className = "a3-page";
    pageEl.innerHTML = `
      <div class="a3-header">
        <div>
          <div class="a3-title">本日の注文書</div>
          <div class="a3-subtitle">東西青果株式会社　／　受注日：${fmtDate(TODAY)}　納品日：${fmtDate(TOMORROW)}</div>
        </div>
      </div>
      <div class="a3-grid"></div>
      <div class="a3-footer">— ${idx + 1} / ${pages.length} ページ —</div>`;
    const grid = pageEl.querySelector(".a3-grid");
    pageCols.forEach(col => {
      const colEl = document.createElement("div");
      colEl.className = "a3-col";
      col.forEach(order => {
        const block = makeCustomerBlockEl(order, { clickable });
        if (selectedId && order.id === selectedId) block.classList.add("selected");
        colEl.appendChild(block);
      });
      grid.appendChild(colEl);
    });
    container.appendChild(pageEl);
  });

  if (clickable) bindClickToEdit(container);
  return pages.length;
}

// ============================================================
// Customer block — clean internal-summary layout (display only).
// Edits happen in a modal opened via click on the split screen.
// ============================================================
function shortDate(iso) {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}

function makeCustomerBlockEl(order, opts = {}) {
  const el = document.createElement("div");
  el.className = "customer-block";
  el.dataset.orderId = order.id;
  if (opts.clickable) el.classList.add("clickable");

  const productRows = order.items.map(it => {
    const qtyText = `${it.qty}${escapeHtml(it.unit || "")}`;
    const noteText = (it.notes && String(it.notes).trim())
      ? escapeHtml(it.notes) : "";
    return `
      <div class="product-row">
        <div class="name">${escapeHtml(it.name)}</div>
        <div class="note">${noteText}</div>
        <div class="qty">${qtyText}</div>
      </div>`;
  }).join("");

  const dateLine = (order.orderDate || order.deliveryDate)
    ? `受注 ${shortDate(order.orderDate)}　／　納品 ${shortDate(order.deliveryDate)}`
    : "";

  el.innerHTML = `
    <h4>${escapeHtml(order.customer)}</h4>
    ${dateLine ? `<div class="meta">${dateLine}</div>` : ""}
    <div class="product-list">${productRows}</div>
    ${order.note ? `<div class="note-line"><span class="note-label">特記：</span>${escapeHtml(order.note)}</div>` : ""}
  `;
  return el;
}

function bindClickToEdit(rootEl) {
  rootEl.addEventListener("click", (e) => {
    const block = e.target.closest(".customer-block.clickable");
    if (!block) return;
    openEditModal(block.dataset.orderId);
  });
}

// ============================================================
// Edit modal (opens on customer-block click in split view)
// ============================================================
let editBuffer = null; // working copy of the order being edited

function openEditModal(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  editBuffer = JSON.parse(JSON.stringify(order));

  document.getElementById("editModalTitle").textContent =
    `${order.id} ／ ${order.customer} の注文を編集`;
  const body = document.getElementById("editModalBody");
  body.innerHTML = renderModalForm(editBuffer);
  bindModalForm(body);
  document.getElementById("editModalBackdrop").hidden = false;
  document.body.style.overflow = "hidden";
}

function closeEditModal() {
  document.getElementById("editModalBackdrop").hidden = true;
  document.body.style.overflow = "";
  editBuffer = null;
}

function saveEditModal() {
  if (!editBuffer) return;
  const target = orders.find(o => o.id === editBuffer.id);
  if (!target) return;
  target.customer     = editBuffer.customer;
  target.orderDate    = editBuffer.orderDate;
  target.deliveryDate = editBuffer.deliveryDate;
  target.items        = editBuffer.items;
  target.note         = editBuffer.note;
  closeEditModal();
  toast("修正を保存しました");
  if (currentScreen === "split") renderSplit();
  else if (currentScreen === "print") renderPrint();
  else if (currentScreen === "ocr")   renderOcr();
  else if (currentScreen === "dashboard") renderDashboard();
}

function renderModalForm(buf) {
  return `
    <div class="form-grid">
      <label class="field"><span>顧客名</span>
        <input type="text" data-bf="customer" value="${escapeAttr(buf.customer)}"></label>
      <label class="field"><span>受注日</span>
        <input type="date" data-bf="orderDate" value="${buf.orderDate || ""}"></label>
      <label class="field"><span>納品日</span>
        <input type="date" data-bf="deliveryDate" value="${buf.deliveryDate || ""}"></label>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin:18px 0 10px;">
      <h4 style="margin:0;color:#1f3a5f;font-size:17px">注文品目</h4>
      <button class="btn btn-secondary" id="modalAddItemBtn">＋ 品目を追加</button>
    </div>
    <table class="data-table editable">
      <thead><tr>
        <th style="width:34%">品名</th>
        <th style="width:14%">数量</th>
        <th style="width:14%">単位</th>
        <th>備考</th>
        <th style="width:8%">削除</th>
      </tr></thead>
      <tbody id="modalItemsBody">${buf.items.map((it,i) => modalRowHtml(it,i)).join("")}</tbody>
    </table>
    <label class="field" style="margin-top:18px;">
      <span>特記事項</span>
      <input type="text" data-bf="note" value="${escapeAttr(buf.note || "")}" placeholder="（任意）">
    </label>
  `;
}

function modalRowHtml(it, i) {
  return `
    <tr data-row="${i}">
      <td><input type="text" data-bi="${i}" data-bf="name" value="${escapeAttr(it.name)}" placeholder="品名"></td>
      <td><input type="number" min="0" step="0.1" data-bi="${i}" data-bf="qty" value="${it.qty}"></td>
      <td><select data-bi="${i}" data-bf="unit">
        ${UNITS.map(u => `<option value="${u}" ${u===it.unit?"selected":""}>${u}</option>`).join("")}
      </select></td>
      <td><input type="text" data-bi="${i}" data-bf="notes" value="${escapeAttr(it.notes || "")}"></td>
      <td><button class="row-delete-btn" data-row-del="${i}">削除</button></td>
    </tr>`;
}

function rerenderModalRows() {
  const tbody = document.getElementById("modalItemsBody");
  if (!tbody) return;
  tbody.innerHTML = editBuffer.items.map((it, i) => modalRowHtml(it, i)).join("");
}

function bindModalForm(root) {
  root.addEventListener("input", (e) => {
    const inp = e.target.closest("[data-bf]");
    if (!inp) return;
    if (inp.dataset.bi != null) {
      const i = +inp.dataset.bi;
      const f = inp.dataset.bf;
      let v = inp.value;
      if (f === "qty") v = parseFloat(v) || 0;
      editBuffer.items[i][f] = v;
    } else {
      editBuffer[inp.dataset.bf] = inp.value;
    }
  });
  root.addEventListener("change", (e) => {
    const sel = e.target.closest("select[data-bf]");
    if (!sel) return;
    if (sel.dataset.bi != null) {
      editBuffer.items[+sel.dataset.bi][sel.dataset.bf] = sel.value;
    }
  });
  root.addEventListener("click", (e) => {
    if (e.target.id === "modalAddItemBtn") {
      editBuffer.items.push({ name: "", qty: 0, unit: "kg", notes: "" });
      rerenderModalRows();
    } else if (e.target.matches("[data-row-del]")) {
      editBuffer.items.splice(+e.target.dataset.rowDel, 1);
      rerenderModalRows();
    }
  });
}

document.getElementById("editModalClose").addEventListener("click", closeEditModal);
document.getElementById("editModalCancel").addEventListener("click", closeEditModal);
document.getElementById("editModalSave").addEventListener("click", saveEditModal);
document.getElementById("editModalBackdrop").addEventListener("click", (e) => {
  if (e.target.id === "editModalBackdrop") closeEditModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !document.getElementById("editModalBackdrop").hidden) closeEditModal();
});

// ---------- Init ----------
renderDashboard();
