// DOM 取得
const canvasPreview = document.getElementById("canvasPreview");
const canvasInfo = document.getElementById("canvasInfo");
const widthInput = document.getElementById("canvasWidthInput");
const heightInput = document.getElementById("canvasHeightInput");
const fileInput = document.getElementById("fileInput");

const photoWrapper = document.getElementById("photoWrapper");
const photoLayer = document.getElementById("photoLayer");
const dropOverlay = document.getElementById("dropOverlay");

// 畫布狀態
let canvasWidth = Number(widthInput.value) || 1080;
let canvasHeight = Number(heightInput.value) || 1350;
let canvasZoom = 1; // Alt + 滾輪縮放預覽用

// 圖片原始尺寸
let imgNaturalW = 0;
let imgNaturalH = 0;

// 圖片顯示狀態（等比例縮放）
let scale = 1;
let offsetX = 0;
let offsetY = 0;

// 拖曳移動狀態
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragOriginX = 0;
let dragOriginY = 0;

// 拉伸狀態（固定反向錨點）
let isResizing = false;
let resizeDir = null;
let resizeStartX = 0;
let resizeStartY = 0;
let resizeStartScale = 1;
let anchorNormX = 0.5; // 0~1：錨點在圖片內的相對位置
let anchorNormY = 0.5;
let anchorCanvasX = 0; // 錨點在畫布內的實際座標
let anchorCanvasY = 0;

// 更新畫布尺寸
function updateCanvasSize() {
  canvasWidth = Number(widthInput.value) || canvasWidth;
  canvasHeight = Number(heightInput.value) || canvasHeight;

  canvasPreview.style.width = canvasWidth + "px";
  canvasPreview.style.height = canvasHeight + "px";
  canvasInfo.textContent = `畫布尺寸：${canvasWidth} × ${canvasHeight} px`;

  applyCanvasZoom();
}

function applyCanvasZoom() {
  canvasPreview.style.transform = `scale(${canvasZoom})`;
  canvasPreview.style.transformOrigin = "top left";
}

// 初始化畫布
updateCanvasSize();

document.getElementById("btnUpdateCanvas").onclick = () => {
  updateCanvasSize();
  if (imgNaturalW && imgNaturalH) {
    fitImageToCanvas(false);
  }
};

// 更新圖片 transform（作用在 wrapper）
function updateTransform() {
  photoWrapper.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
}

// 讓圖片以原始比例「完整塞進畫布」並置中
// keepScaleIfBigger = true：只動位置，不強制縮小
function fitImageToCanvas(keepScaleIfBigger = false) {
  if (!imgNaturalW || !imgNaturalH) return;

  const scaleX = canvasWidth / imgNaturalW;
  const scaleY = canvasHeight / imgNaturalH;
  const fitScale = Math.min(scaleX, scaleY);

  if (!keepScaleIfBigger || fitScale < scale) {
    scale = fitScale;
  }

  const displayW = imgNaturalW * scale;
  const displayH = imgNaturalH * scale;

  offsetX = (canvasWidth - displayW) / 2;
  offsetY = (canvasHeight - displayH) / 2;

  updateTransform();
}

// 讓圖片「填滿畫布」（類似 object-fit: cover）
function coverImageToCanvas() {
  if (!imgNaturalW || !imgNaturalH) return;

  const scaleX = canvasWidth / imgNaturalW;
  const scaleY = canvasHeight / imgNaturalH;
  scale = Math.max(scaleX, scaleY); // 填滿畫布，可能會裁掉部分

  const displayW = imgNaturalW * scale;
  const displayH = imgNaturalH * scale;

  offsetX = (canvasWidth - displayW) / 2;
  offsetY = (canvasHeight - displayH) / 2;

  updateTransform();
}

// 載入圖片檔案
function loadImageFile(file) {
  if (!file) return;

  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    imgNaturalW = img.naturalWidth;
    imgNaturalH = img.naturalHeight;

    photoLayer.src = url;
    photoWrapper.style.display = "block";
    dropOverlay.classList.add("hidden"); // ⭐ 載入後隱藏示意文字

    scale = 1;
    fitImageToCanvas(false);
  };
  img.src = url;
}

// 檔案選擇
fileInput.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  loadImageFile(file);
});

// Drag & Drop 基本阻止預設行為
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

// 拖曳移動圖片（按在畫布上，且不是 handle）
canvasPreview.addEventListener("mousedown", (e) => {
  if (!imgNaturalW || !imgNaturalH) return;
  if (e.target.classList.contains("handle")) return; // 拉伸點另處理

  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragOriginX = offsetX;
  dragOriginY = offsetY;
});

window.addEventListener("mousemove", (e) => {
  if (isDragging) {
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    offsetX = dragOriginX + dx;
    offsetY = dragOriginY + dy;
    updateTransform();
  } else if (isResizing) {
    handleResizeMove(e);
  }
});

window.addEventListener("mouseup", () => {
  isDragging = false;
  isResizing = false;
});

canvasPreview.addEventListener("mouseleave", () => {
  isDragging = false;
});

// 滾輪：Alt + 滾輪 → 縮放畫布預覽；平常 → 縮放圖片
canvasPreview.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();

    // Alt + 滾輪 → 畫布預覽縮放
    if (e.altKey) {
      const oldZoom = canvasZoom;
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      let newZoom = oldZoom * zoomFactor;

      const minZoom = 0.3;
      const maxZoom = 3;
      if (newZoom < minZoom) newZoom = minZoom;
      if (newZoom > maxZoom) newZoom = maxZoom;

      canvasZoom = newZoom;
      applyCanvasZoom();
      return;
    }

    // 沒有 Alt → 縮放圖片（等比例）
    if (!imgNaturalW || !imgNaturalH) return;

    const rect = canvasPreview.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const oldScale = scale;
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    let newScale = oldScale * zoomFactor;

    const minScale =
      Math.min(canvasWidth / imgNaturalW, canvasHeight / imgNaturalH) / 5;
    const maxScale = 10;

    if (newScale < minScale) newScale = minScale;
    if (newScale > maxScale) newScale = maxScale;

    const scaleRatio = newScale / oldScale;
    offsetX = mouseX - (mouseX - offsetX) * scaleRatio;
    offsetY = mouseY - (mouseY - offsetY) * scaleRatio;

    scale = newScale;
    updateTransform();
  },
  { passive: false }
);

// 置中圖片（保留目前縮放）
document.getElementById("btnCenter").onclick = () => {
  if (!imgNaturalW || !imgNaturalH) return;

  const displayW = imgNaturalW * scale;
  const displayH = imgNaturalH * scale;

  offsetX = (canvasWidth - displayW) / 2;
  offsetY = (canvasHeight - displayH) / 2;
  updateTransform();
};

// 重設縮放：重新「完整塞進畫布」並置中（contain）
document.getElementById("btnResetZoom").onclick = () => {
  if (!imgNaturalW || !imgNaturalH) return;
  fitImageToCanvas(false);
};

// 填滿畫布：cover 效果
document.getElementById("btnCover").onclick = () => {
  coverImageToCanvas();
};

// 下載 PNG（透明底）
document.getElementById("btnDownload").onclick = () => {
  if (!imgNaturalW || !imgNaturalH) {
    alert("請先載入一張圖片。");
    return;
  }

  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = canvasWidth;
  exportCanvas.height = canvasHeight;
  const ctx = exportCanvas.getContext("2d");

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  const drawW = imgNaturalW * scale;
  const drawH = imgNaturalH * scale;

  ctx.drawImage(photoLayer, offsetX, offsetY, drawW, drawH);

  exportCanvas.toBlob(
    (blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `canvas-${canvasWidth}x${canvasHeight}.png`;
      a.click();
      URL.revokeObjectURL(url);
    },
    "image/png",
    0.92
  );
};

/* ---------------- 拉伸點邏輯：固定反向錨點 + 等比例縮放 ---------------- */

document.querySelectorAll(".handle").forEach((handle) => {
  handle.addEventListener("mousedown", (e) => {
    if (!imgNaturalW || !imgNaturalH) return;
    e.stopPropagation(); // 不要觸發拖曳

    isResizing = true;
    resizeDir = handle.dataset.dir;
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    resizeStartScale = scale;

    const displayW = imgNaturalW * scale;
    const displayH = imgNaturalH * scale;

    // 根據拉伸點設定「反向錨點」在圖片中的相對位置（0~1）
    // 例如：拉東側（e），錨點在西側中間 (0, 0.5)
    switch (resizeDir) {
      case "e":
        anchorNormX = 0;
        anchorNormY = 0.5;
        break;
      case "w":
        anchorNormX = 1;
        anchorNormY = 0.5;
        break;
      case "n":
        anchorNormX = 0.5;
        anchorNormY = 1;
        break;
      case "s":
        anchorNormX = 0.5;
        anchorNormY = 0;
        break;
      case "ne":
        anchorNormX = 0;
        anchorNormY = 1;
        break;
      case "nw":
        anchorNormX = 1;
        anchorNormY = 1;
        break;
      case "se":
        anchorNormX = 0;
        anchorNormY = 0;
        break;
      case "sw":
        anchorNormX = 1;
        anchorNormY = 0;
        break;
      default:
        anchorNormX = 0.5;
        anchorNormY = 0.5;
    }

    // 計算錨點在畫布中的實際座標（縮放後）
    anchorCanvasX = offsetX + anchorNormX * displayW;
    anchorCanvasY = offsetY + anchorNormY * displayH;
  });
});

function handleResizeMove(e) {
  if (!isResizing) return;

  const dx = e.clientX - resizeStartX;
  const dy = e.clientY - resizeStartY;

  // 依 handle 方向決定縮放影響（只是決定放大／縮小方向與速度）
  let influence = 0;

  if (resizeDir.includes("e")) influence += dx;
  if (resizeDir.includes("w")) influence -= dx;
  if (resizeDir.includes("s")) influence += dy;
  if (resizeDir.includes("n")) influence -= dy;

  let newScale = resizeStartScale * (1 + influence / 300);
  const minScale =
    Math.min(canvasWidth / imgNaturalW, canvasHeight / imgNaturalH) / 5;
  const maxScale = 10;

  if (newScale < minScale) newScale = minScale;
  if (newScale > maxScale) newScale = maxScale;

  const newDisplayW = imgNaturalW * newScale;
  const newDisplayH = imgNaturalH * newScale;

  // 根據「反向錨點」計算新的 offset，使錨點位置固定不動
  offsetX = anchorCanvasX - anchorNormX * newDisplayW;
  offsetY = anchorCanvasY - anchorNormY * newDisplayH;

  scale = newScale;
  updateTransform();
}
