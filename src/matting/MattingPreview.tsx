import { useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { moveCrop, resizeCrop, type Rect } from './crop';

type Drag =
  | { mode: 'move'; x: number; y: number; origin: Rect }
  | { mode: 'resize'; x: number; y: number; origin: Rect };

function pointInImage(
  event: ReactPointerEvent<HTMLElement>,
  bounds: DOMRect,
  imgW: number,
  imgH: number,
): { x: number; y: number } {
  return {
    x: ((event.clientX - bounds.left) / bounds.width) * imgW,
    y: ((event.clientY - bounds.top) / bounds.height) * imgH,
  };
}

export function MattingPreview({
  source,
  color,
  transparent,
  crop,
  aspect,
  onCrop,
}: {
  source: HTMLCanvasElement;
  color: string;
  transparent: boolean;
  crop: Rect;
  aspect: number;
  onCrop: (crop: Rect) => void;
}) {
  const viewRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<Drag | null>(null);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.width = source.width;
    view.height = source.height;
    const ctx = view.getContext('2d');
    if (!ctx) return;
    if (transparent) {
      const pattern = checker();
      if (pattern) ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, view.width, view.height);
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, view.width, view.height);
    }
    ctx.drawImage(source, 0, 0);
  }, [source, color, transparent]);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const point = pointInImage(event, bounds, source.width, source.height);
    const pad = (18 * source.width) / bounds.width;
    const handle =
      point.x >= crop.x + crop.w - pad &&
      point.y >= crop.y + crop.h - pad &&
      point.x <= crop.x + crop.w + pad &&
      point.y <= crop.y + crop.h + pad;
    const inside = point.x >= crop.x && point.y >= crop.y && point.x <= crop.x + crop.w && point.y <= crop.y + crop.h;
    if (!handle && !inside) return;
    dragRef.current = { mode: handle ? 'resize' : 'move', x: point.x, y: point.y, origin: crop };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // 捕获失败时仍根据后续的 pointermove 更新裁切框。
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const point = pointInImage(event, bounds, source.width, source.height);
    const dx = point.x - drag.x;
    const dy = point.y - drag.y;
    if (drag.mode === 'move') {
      onCrop(moveCrop(drag.origin, dx, dy, source.width, source.height));
      return;
    }
    onCrop(resizeCrop(drag.origin, dx, aspect, source.width, source.height));
  }

  const box = {
    left: `${(crop.x / source.width) * 100}%`,
    top: `${(crop.y / source.height) * 100}%`,
    width: `${(crop.w / source.width) * 100}%`,
    height: `${(crop.h / source.height) * 100}%`,
  };

  return (
    <div className="stage">
      <div
        className="frame"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          dragRef.current = null;
        }}
      >
        <canvas ref={viewRef} />
        <div className="crop" style={box}>
          <span className="guide" style={{ top: '10%' }} />
          <span className="guide" style={{ top: '40%' }} />
          <span className="handle" />
        </div>
      </div>
    </div>
  );
}

function checker(): CanvasPattern | null {
  const tile = document.createElement('canvas');
  tile.width = 16;
  tile.height = 16;
  const ctx = tile.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#d9d3c7';
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(0, 0, 8, 8);
  ctx.fillRect(8, 8, 8, 8);
  return ctx.createPattern(tile, 'repeat');
}
