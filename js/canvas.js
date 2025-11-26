// js/canvas.js
import { state } from "./state.js";
import { initInteractions } from "./interactions.js";

// DOM 取得
const canvasPreview = document.getElementById("canvasPreview");
const canvasInfo = document.getElementById("canvasInfo");
const widthInput = document.getElementById("canvasWidthInput");
const heightInput = document.getElementById("canvasHeightInput");
const fileInput = document.getElementById("fileInput");

const photoWrapper = document.getElementById("photoWrapper");
const photoLayer = document.getElementById("photoLayer");
const dropOverlay = document.getElementById("dropOverlay");

// 避免圖片被瀏覽器當成拖曳來源而變透明
photoLayer.addEventListener("dragstart", (e) => {
  e.preventDefault();
});

// 更新畫布尺寸
function updateCanvasSize() {
  state.canvasWidth = Number(widthInput.value) || state.canvasWidth;
  state.canvasHeight = Number(heightInput.value) || state.canvasHeight;

  canvasPreview.style.width = state.canvasWidth + "px";
  canvasPreview.style.height = state.canvasHeight + "px";
  canvasInfo.textContent = `畫布尺寸：${state.canvasWidth} × ${state.canvasHeight} px`;

  applyCanvasZoom();
}

function applyCanvasZoom() {
  canvasPreview.style.transform = `scale(${state.canvasZoom})`;
  canvasPreview.style.transformOrigin = "top left";
}

// 更新圖片 transform（作用在 wrapper）
function updateTransform() {
  photoWrapper.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.scale})`;
}

// 讓圖片以原始比例「完整塞進畫布」並置中（contain）
function fitImageToCanvas(keepScaleIfBigger = false) {
  if (!state.imgNaturalW || !state.imgNaturalH) return;

  const scaleX = state.canvasWidth / state.imgNaturalW;
  const scaleY = state.canvasHeight / state.imgNaturalH;
  const fitScale = Math.min(scaleX, scaleY);

  if (!keepScaleIfBigger || fitScale < state.scale) {
    state.scale = fitScale;
  }

  const displayW = state.imgNaturalW * state.scale;
  const displayH = state.imgNaturalH * state.scale;

  state.offsetX = (state.canvasWidth - displayW) / 2;
  state.offsetY = (state.canvasHeight - displayH) / 2;

  updateTransform();
}

// 讓圖片「填滿畫布」（cover）
function coverImageToCanvas() {
  if (!state.imgNaturalW || !state.imgNaturalH) return;

  const scaleX = state.canvasWidth / state.imgNaturalW;
  const scaleY = state.canvasHeight / state.imgNaturalH;
  state.scale = Math.max(scaleX, scaleY);

  const displayW = state.imgNaturalW * state.scale;
  const displayH = state.imgNaturalH * state.scale;

  state.offsetX = (state.canvasWidth - displayW) / 2;
  state.offsetY = (state.canvasHeight - displayH) / 2;

  updateTransform();
}

// 載入圖片檔案
function loadImageFile(file) {
  if (!file) return;

  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    state.imgNaturalW = img.naturalWidth;
    state.imgNaturalH = img.naturalHeight;

    photoLayer.src = url;
    photoWrapper.style.display = "block";
    dropOverlay.classList.add("hidden"); // 載入後隱藏示意文字

    state.scale = 1;
    fitImageToCanvas(false);
  };
  img.src = url;
}

// 下載 PNG（透明底）
function downloadPNG() {
  if (!state.imgNaturalW || !state.imgNaturalH) {
    alert("請先載入一張圖片。");
    return;
  }

  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = state.canvasWidth;
  exportCanvas.height = state.canvasHeight;
  const ctx = exportCanvas.getContext("2d");

  ctx.clearRect(0, 0, state.canvasWidth, state.canvasHeight);

  const drawW = state.imgNaturalW * state.scale;
  const drawH = state.imgNaturalH * state.scale;

  ctx.drawImage(photoLayer, state.offsetX, state.offsetY, drawW, drawH);

  exportCanvas.toBlob(
    (blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `canvas-${state.canvasWidth}x${state.canvasHeight}.png`;
      a.click();
      URL.revokeObjectURL(url);
    },
    "image/png",
    0.92
  );
}

// 置中目前大小的圖片
function centerImage() {
  if (!state.imgNaturalW || !state.imgNaturalH) return;

  const displayW = state.imgNaturalW * state.scale;
  const displayH = state.imgNaturalH * state.scale;

  state.offsetX = (state.canvasWidth - displayW) / 2;
  state.offsetY = (state.canvasHeight - displayH) / 2;
  updateTransform();
}

/* ---------------- 初始化邏輯 & 事件綁定 ---------------- */

// 初始化畫布尺寸
updateCanvasSize();

// 畫布尺寸更新
document.getElementById("btnUpdateCanvas").onclick = () => {
  updateCanvasSize();
  if (state.imgNaturalW && state.imgNaturalH) {
    fitImageToCanvas(false);
  }
};

// 檔案選擇
fileInput.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  loadImageFile(file);
});

// Drag & Drop 基本阻止預設行為（只負責 overlay 樣式 & 接檔案，互動在 interactions）
["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
  canvasPreview.addEventListener(
    eventName,
    (e) => {
      e.preventDefault();
      e.stopPropagation();
    },
    false
  );
});

["dragenter", "dragover"].forEach((eventName) => {
  canvasPreview.addEventListener(
    eventName,
    () => {
      dropOverlay.classList.add("dragover");
    },
    false
  );
});

["dragleave", "drop"].forEach((eventName) => {
  canvasPreview.addEventListener(
    eventName,
    () => {
      dropOverlay.classList.remove("dragover");
    },
    false
  );
});

// Drop 檔案
canvasPreview.addEventListener("drop", (e) => {
  const dt = e.dataTransfer;
  const file = dt.files && dt.files[0];
  loadImageFile(file);
});

// 控制按鈕
document.getElementById("btnCenter").onclick = () => centerImage();
document.getElementById("btnResetZoom").onclick = () => fitImageToCanvas(false);
document.getElementById("btnCover").onclick = () => coverImageToCanvas();
document.getElementById("btnDownload").onclick = () => downloadPNG();

// 初始化滑鼠互動（拖曳／滾輪／拉伸）
initInteractions({
  canvasPreview,
  photoWrapper,
  updateTransform,
  applyCanvasZoom,
});
