// 畫布 & DOM
const canvasPreview = document.getElementById("canvasPreview");
const canvasInfo = document.getElementById("canvasInfo");
const widthInput = document.getElementById("canvasWidthInput");
const heightInput = document.getElementById("canvasHeightInput");
const fileInput = document.getElementById("fileInput");

const photoWrapper = document.getElementById("photoWrapper");
const photoLayer = document.getElementById("photoLayer");
const dropOverlay = document.getElementById("dropOverlay");

// 狀態：畫布
let canvasWidth = Number(widthInput.value) || 500;
let canvasHeight = Number(heightInput.value) || 400;

// 狀態：圖片
let imgNaturalW = 0;
let imgNaturalH = 0;

// 圖片目前縮放／位置（等比例）
let scale = 1;
let offsetX = 0;
let offsetY = 0;

// 拖曳移動狀態
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragOriginX = 0;
let dragOriginY = 0;

// 拉伸狀態
let isResizing = false;
let resizeDir = null;
let resizeStartX = 0;
let resizeStartY = 0;
let resizeStartScale = 1;
let resizeCenterX = 0;
let resizeCenterY = 0;

// 初始化畫布尺寸
function updateCanvasSize() {
  canvasWidth = Number(widthInput.value) || canvasWidth;
  canvasHeight = Number(heightInput.value) || canvasHeight;

  canvasPreview.style.width = canvasWidth + "px";
  canvasPreview.style.height = canvasHeight + "px";
  canvasInfo.textContent = `畫布尺寸：${canvasWidth} × ${canvasHeight} px`;
}

updateCanvasSize();

document.getElementById("btnUpdateCanvas").onclick = () => {
  updateCanvasSize();
  // 若已有圖片，畫布變動後，重新置中
  if (imgNaturalW && imgNaturalH) {
    fitImageToCanvas(false);
  }
};

// 更新 wrapper 的 transform
function updateTransform() {
  photoWrapper.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
}

// 讓圖片以原始比例塞進畫布，並置中
// keepScaleIfBigger = true：只改位置，不縮小
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
    dropOverlay.classList.add("hidden");

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
  if (e.target.classList.contains("handle")) return; // 避免跟拉伸衝突

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

// 滾輪縮放（等比例，以滑鼠位置為中心）
canvasPreview.addEventListener(
  "wheel",
  (e) => {
    if (!imgNaturalW || !imgNaturalH) return;
    e.preventDefault();

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

// ⭐ 置中：保留目前縮放，只重新算 offsetX/offsetY
document.getElementById("btnCenter").onclick = () => {
  if (!imgNaturalW || !imgNaturalH) return;

  const displayW = imgNaturalW * scale;
  const displayH = imgNaturalH * scale;

  offsetX = (canvasWidth - displayW) / 2;
  offsetY = (canvasHeight - displayH) / 2;
  updateTransform();
};

// ⭐ 重設縮放：重新讓圖片「剛好塞進畫布」並置中
document.getElementById("btnResetZoom").onclick = () => {
  if (!imgNaturalW || !imgNaturalH) return;
  fitImageToCanvas(false);
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

/* ---------------- 拉伸點邏輯（等比例縮放） ---------------- */

// 綁定每個 handle 的 mousedown
document.querySelectorAll(".handle").forEach((handle) => {
  handle.addEventListener("mousedown", (e) => {
    if (!imgNaturalW || !imgNaturalH) return;
    e.stopPropagation(); // 不要觸發拖曳

    isResizing = true;
    resizeDir = handle.dataset.dir;
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    resizeStartScale = scale;

    // 以圖片中心為縮放中心
    const displayW = imgNaturalW * scale;
    const displayH = imgNaturalH * scale;
    resizeCenterX = offsetX + displayW / 2;
    resizeCenterY = offsetY + displayH / 2;
  });
});

// 滑鼠移動時，如在拉伸就呼叫這個
function handleResizeMove(e) {
  if (!isResizing) return;

  const dx = e.clientX - resizeStartX;
  const dy = e.clientY - resizeStartY;

  // 依照 handle 的方向決定「放大還是縮小」
  let influence = 0;

  if (resizeDir.includes("e")) {
    influence += dx;
  }
  if (resizeDir.includes("w")) {
    influence -= dx;
  }
  if (resizeDir.includes("s")) {
    influence += dy;
  }
  if (resizeDir.includes("n")) {
    influence -= dy;
  }

  // 影響越大，scale 變化越大（200 這個可以自己調手感）
  let newScale = resizeStartScale * (1 + influence / 300);
  const minScale =
    Math.min(canvasWidth / imgNaturalW, canvasHeight / imgNaturalH) / 5;
  const maxScale = 10;

  if (newScale < minScale) newScale = minScale;
  if (newScale > maxScale) newScale = maxScale;

  // 依照圖片中心，重新算 offset，保持中心不變
  const newDisplayW = imgNaturalW * newScale;
  const newDisplayH = imgNaturalH * newScale;

  offsetX = resizeCenterX - newDisplayW / 2;
  offsetY = resizeCenterY - newDisplayH / 2;

  scale = newScale;
  updateTransform();
}
