// js/interactions.js
import { state } from "./state.js";

export function initInteractions({
  canvasPreview,
  photoWrapper,
  updateTransform,
  applyCanvasZoom,
}) {
  /* ---------------- 拖曳：cursor 和圖片錨點同步 ---------------- */

  canvasPreview.addEventListener("mousedown", (e) => {
    if (!state.imgNaturalW || !state.imgNaturalH) return;

    // 點到拉伸點就交給拉伸，不啟動拖曳
    if (e.target.classList.contains("handle")) return;

    // 只在點到圖片範圍內才啟動拖曳（避免點空白）
    const wrapperRect = photoWrapper.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    const insideWrapper =
      x >= wrapperRect.left &&
      x <= wrapperRect.right &&
      y >= wrapperRect.top &&
      y <= wrapperRect.bottom;
    if (!insideWrapper) return;

    // 1. 把滑鼠位置轉成「畫布座標」（已除以 canvasZoom）
    const canvasRect = canvasPreview.getBoundingClientRect();
    const mouseCanvasX = (e.clientX - canvasRect.left) / state.canvasZoom;
    const mouseCanvasY = (e.clientY - canvasRect.top) / state.canvasZoom;

    // 2. 算出這個點在「圖片內部（未縮放）」的座標（當作錨點）
    //    mouseCanvas = offset + imageLocal * scale
    //    imageLocal = (mouseCanvas - offset) / scale
    state.dragAnchorImageX = (mouseCanvasX - state.offsetX) / state.scale;
    state.dragAnchorImageY = (mouseCanvasY - state.offsetY) / state.scale;

    state.isDragging = true;
    canvasPreview.classList.add("dragging"); // cursor: crosshair
  });

  window.addEventListener("mousemove", (e) => {
    if (state.isDragging) {
      // 每一幀都重新算滑鼠在「畫布座標」的位置
      const canvasRect = canvasPreview.getBoundingClientRect();
      const mouseCanvasX = (e.clientX - canvasRect.left) / state.canvasZoom;
      const mouseCanvasY = (e.clientY - canvasRect.top) / state.canvasZoom;

      // 3. 強制讓「同一個圖片內部點」永遠在滑鼠底下：
      //    mouseCanvas = offset + imageLocal * scale
      //    offset = mouseCanvas - imageLocal * scale
      state.offsetX = mouseCanvasX - state.dragAnchorImageX * state.scale;
      state.offsetY = mouseCanvasY - state.dragAnchorImageY * state.scale;

      updateTransform();
    } else if (state.isResizing) {
      handleResizeMove(e, updateTransform, canvasPreview);
    }
  });

  window.addEventListener("mouseup", () => {
    state.isDragging = false;
    state.isResizing = false;
    canvasPreview.classList.remove("dragging");
  });

  canvasPreview.addEventListener("mouseleave", () => {
    state.isDragging = false;
    canvasPreview.classList.remove("dragging");
  });

  /* ---------------- 滾輪：Alt=畫布 zoom；一般=圖片 zoom ---------------- */

  canvasPreview.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();

      // Alt + 滾輪：只縮放畫布預覽
      if (e.altKey) {
        const oldZoom = state.canvasZoom;
        const zoomFactor = e.deltaY < 0 ? 1.03 : 0.97; // 比較細
        let newZoom = oldZoom * zoomFactor;
        const minZoom = 0.3;
        const maxZoom = 3;
        if (newZoom < minZoom) newZoom = minZoom;
        if (newZoom > maxZoom) newZoom = maxZoom;
        state.canvasZoom = newZoom;
        applyCanvasZoom();
        return;
      }

      // 一般滾輪：縮放圖片（等比例）
      if (!state.imgNaturalW || !state.imgNaturalH) return;

      const rect = canvasPreview.getBoundingClientRect();
      const mouseXScreen = e.clientX - rect.left;
      const mouseYScreen = e.clientY - rect.top;

      // 轉成畫布座標（除以 canvasZoom）
      const mouseX = mouseXScreen / state.canvasZoom;
      const mouseY = mouseYScreen / state.canvasZoom;

      const oldScale = state.scale;
      const zoomFactor = e.deltaY < 0 ? 1.03 : 0.97; // 同樣細緻
      let newScale = oldScale * zoomFactor;

      const minScale =
        Math.min(
          state.canvasWidth / state.imgNaturalW,
          state.canvasHeight / state.imgNaturalH
        ) / 5;
      const maxScale = 10;
      if (newScale < minScale) newScale = minScale;
      if (newScale > maxScale) newScale = maxScale;

      const scaleRatio = newScale / oldScale;

      // 以滑鼠為中心縮放，不讓圖片「飛走」
      state.offsetX = mouseX - (mouseX - state.offsetX) * scaleRatio;
      state.offsetY = mouseY - (mouseY - state.offsetY) * scaleRatio;

      state.scale = newScale;
      updateTransform();
    },
    { passive: false }
  );

  /* ---------------- 拉伸點：固定反向錨點 + 等比例縮放 ---------------- */

  document.querySelectorAll(".handle").forEach((handle) => {
    handle.addEventListener("mousedown", (e) => {
      if (!state.imgNaturalW || !state.imgNaturalH) return;
      e.stopPropagation(); // 不要觸發拖曳

      state.isResizing = true;
      state.resizeDir = handle.dataset.dir;
      state.resizeStartX = e.clientX;
      state.resizeStartY = e.clientY;
      state.resizeStartScale = state.scale;

      const displayW = state.imgNaturalW * state.scale;
      const displayH = state.imgNaturalH * state.scale;

      // 反向錨點位置（0~1）
      switch (state.resizeDir) {
        case "e":
          state.anchorNormX = 0;
          state.anchorNormY = 0.5;
          break;
        case "w":
          state.anchorNormX = 1;
          state.anchorNormY = 0.5;
          break;
        case "n":
          state.anchorNormX = 0.5;
          state.anchorNormY = 1;
          break;
        case "s":
          state.anchorNormX = 0.5;
          state.anchorNormY = 0;
          break;
        case "ne":
          state.anchorNormX = 0;
          state.anchorNormY = 1;
          break;
        case "nw":
          state.anchorNormX = 1;
          state.anchorNormY = 1;
          break;
        case "se":
          state.anchorNormX = 0;
          state.anchorNormY = 0;
          break;
        case "sw":
          state.anchorNormX = 1;
          state.anchorNormY = 0;
          break;
        default:
          state.anchorNormX = 0.5;
          state.anchorNormY = 0.5;
      }

      // 反向錨點在畫布座標（縮放後）
      state.anchorCanvasX = state.offsetX + state.anchorNormX * displayW;
      state.anchorCanvasY = state.offsetY + state.anchorNormY * displayH;
    });
  });
}

function handleResizeMove(e, updateTransform, canvasPreview) {
  if (!state.isResizing) return;

  // 1. 滑鼠在畫布裡的座標（已考慮 canvasZoom）
  const rect = canvasPreview.getBoundingClientRect();
  const mouseCanvasX = (e.clientX - rect.left) / state.canvasZoom;
  const mouseCanvasY = (e.clientY - rect.top) / state.canvasZoom;

  const dir = state.resizeDir;
  const natW = state.imgNaturalW;
  const natH = state.imgNaturalH;

  let scaleFromX = null;
  let scaleFromY = null;

  // 2. 依照不同 handle，用「錨點位置 + 滑鼠位置」直接算 scale
  //    目標：移動的那個邊 / 角，剛好貼在滑鼠底下

  switch (dir) {
    // 右邊中線：固定左邊，右邊跟著滑鼠
    case "e":
      scaleFromX = (mouseCanvasX - state.anchorCanvasX) / natW;
      break;

    // 左邊中線：固定右邊，左邊跟著滑鼠
    case "w":
      scaleFromX = (state.anchorCanvasX - mouseCanvasX) / natW;
      break;

    // 下邊中線：固定上邊，下邊跟著滑鼠
    case "s":
      scaleFromY = (mouseCanvasY - state.anchorCanvasY) / natH;
      break;

    // 上邊中線：固定下邊，上邊跟著滑鼠
    case "n":
      scaleFromY = (state.anchorCanvasY - mouseCanvasY) / natH;
      break;

    // 右下角：固定左上（anchor），右下跟著滑鼠
    case "se":
      scaleFromX = (mouseCanvasX - state.anchorCanvasX) / natW;
      scaleFromY = (mouseCanvasY - state.anchorCanvasY) / natH;
      break;

    // 右上角：固定左下
    case "ne":
      scaleFromX = (mouseCanvasX - state.anchorCanvasX) / natW;
      scaleFromY = (state.anchorCanvasY - mouseCanvasY) / natH;
      break;

    // 左下角：固定右上
    case "sw":
      scaleFromX = (state.anchorCanvasX - mouseCanvasX) / natW;
      scaleFromY = (mouseCanvasY - state.anchorCanvasY) / natH;
      break;

    // 左上角：固定右下
    case "nw":
      scaleFromX = (state.anchorCanvasX - mouseCanvasX) / natW;
      scaleFromY = (state.anchorCanvasY - mouseCanvasY) / natH;
      break;
  }

  // 3. 合併 X/Y 的 scale，保持等比例縮放
  let newScale;

  if (scaleFromX != null && scaleFromY != null) {
    // 角落 handle：X、Y 會算出兩個 scale，取「比較小」避免拉爆比例
    const sx = Math.abs(scaleFromX);
    const sy = Math.abs(scaleFromY);
    newScale = Math.min(sx, sy);
  } else {
    // 單邊 handle：只有 X 或 Y 決定 scale
    newScale = scaleFromX != null ? Math.abs(scaleFromX) : Math.abs(scaleFromY);
  }

  // 如果滑到錨點另一側，scale 可能變負的，這裡先用絕對值
  if (!isFinite(newScale) || newScale <= 0) {
    newScale = state.scale; // 避免 NaN 或 0
  }

  // 4. 加上原本的 min / max 限制
  const minScale =
    Math.min(state.canvasWidth / natW, state.canvasHeight / natH) / 5;
  const maxScale = 10;

  if (newScale < minScale) newScale = minScale;
  if (newScale > maxScale) newScale = maxScale;

  // 5. 依照「反向錨點」重新計算 offset，確保錨點不動
  const newDisplayW = natW * newScale;
  const newDisplayH = natH * newScale;

  state.offsetX = state.anchorCanvasX - state.anchorNormX * newDisplayW;
  state.offsetY = state.anchorCanvasY - state.anchorNormY * newDisplayH;

  state.scale = newScale;
  updateTransform();
}
