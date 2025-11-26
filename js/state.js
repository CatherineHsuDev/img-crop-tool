// js/state.js
export const state = {
  // 畫布
  canvasWidth: 1080,
  canvasHeight: 1350,
  canvasZoom: 1,

  // 圖片原始尺寸
  imgNaturalW: 0,
  imgNaturalH: 0,

  // 圖片當前狀態（等比例）
  scale: 1,
  offsetX: 0,
  offsetY: 0,

  // 拖曳移動
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  dragOriginX: 0,
  dragOriginY: 0,

  // 這兩個是：按下去那一刻「滑鼠點到的圖片內部座標」
  dragAnchorImageX: 0, // 圖片內的 X（未縮放前）
  dragAnchorImageY: 0, // 圖片內的 Y（未縮放前）

  // 拉伸（固定反向錨點）
  isResizing: false,
  resizeDir: null,
  resizeStartX: 0,
  resizeStartY: 0,
  resizeStartScale: 1,
  anchorNormX: 0.5, // 0~1，錨點在圖片內的相對位置
  anchorNormY: 0.5,
  anchorCanvasX: 0, // 錨點在畫布內的實際座標
  anchorCanvasY: 0,
};
