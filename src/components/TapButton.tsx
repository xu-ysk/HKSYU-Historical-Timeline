import { useRef, type ButtonHTMLAttributes } from 'react';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
  onActivate: () => void;
};

/** Exhibition touch drivers can omit the compatibility click immediately after a swipe. */
export function TapButton({ onActivate, disabled, children, ...props }: Props) {
  const touch = useRef<{ id: number; x: number; y: number } | null>(null);
  const lastTouch = useRef(-Infinity);
  return (
    <button
      {...props}
      type={props.type ?? 'button'}
      disabled={disabled}
      onPointerDown={(event) => {
        if (event.pointerType === 'touch' && event.isPrimary) {
          touch.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        }
      }}
      onPointerCancel={() => {
        touch.current = null;
      }}
      onPointerUp={(event) => {
        const start = touch.current;
        touch.current = null;
        if (
          disabled ||
          !start ||
          start.id !== event.pointerId ||
          Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 24
        )
          return;
        event.preventDefault();
        lastTouch.current = performance.now();
        onActivate();
      }}
      onClick={(event) => {
        // Keyboard activation has detail 0 and remains available immediately after touch.
        if (event.detail > 0 && performance.now() - lastTouch.current < 600) return;
        onActivate();
      }}
    >
      {children}
    </button>
  );
}
