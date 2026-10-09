export interface PhotoZoomState {
  scale: number;
  x: number;
  y: number;
}

export interface PhotoSize {
  imageWidth: number;
  imageHeight: number;
  viewportWidth: number;
  viewportHeight: number;
}

export const initialPhotoZoom: PhotoZoomState = { scale: 1, x: 0, y: 0 };

function fittedSize(size: PhotoSize) {
  const fit = Math.min(
    size.viewportWidth / size.imageWidth,
    size.viewportHeight / size.imageHeight,
  );
  return { width: size.imageWidth * fit, height: size.imageHeight * fit };
}

/** Never enlarge beyond one source pixel per device pixel. */
export function maxSharpScale(size: PhotoSize, devicePixelRatio = 1, limit = 4) {
  if (Object.values(size).some((value) => !Number.isFinite(value) || value <= 0)) return 1;
  const fitted = fittedSize(size);
  return Math.max(
    1,
    Math.min(
      limit,
      size.imageWidth / (fitted.width * devicePixelRatio),
      size.imageHeight / (fitted.height * devicePixelRatio),
    ),
  );
}

export function constrainPhotoPan(state: PhotoZoomState, size: PhotoSize): PhotoZoomState {
  const fitted = fittedSize(size);
  const maxX = Math.max(0, (fitted.width * state.scale - size.viewportWidth) / 2);
  const maxY = Math.max(0, (fitted.height * state.scale - size.viewportHeight) / 2);
  return {
    scale: state.scale,
    x: Math.max(-maxX, Math.min(maxX, state.x)),
    y: Math.max(-maxY, Math.min(maxY, state.y)),
  };
}

export function zoomPhotoAt(
  state: PhotoZoomState,
  scale: number,
  anchorX: number,
  anchorY: number,
  size: PhotoSize,
  devicePixelRatio = 1,
) {
  const nextScale = Math.max(1, Math.min(maxSharpScale(size, devicePixelRatio), scale));
  const ratio = nextScale / state.scale;
  return constrainPhotoPan(
    {
      scale: nextScale,
      x: anchorX - (anchorX - state.x) * ratio,
      y: anchorY - (anchorY - state.y) * ratio,
    },
    size,
  );
}
