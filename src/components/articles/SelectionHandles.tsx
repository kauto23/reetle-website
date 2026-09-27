'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

interface SelectionHandlesProps {
  paragraphIndex: number;
  paragraphText: string;
  selectionRange: { start: number; end: number };
  onSelectionChange: (text: string, paraIdx: number, range: { start: number; end: number }) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

function caretOffsetInParagraph(x: number, y: number, paraEl: HTMLElement): number | null {
  const range = document.caretRangeFromPoint?.(x, y);
  if (!range) return null;
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return null;
  if (!paraEl.contains(node)) return null;

  const walker = document.createTreeWalker(paraEl, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let cur: Node | null;
  while ((cur = walker.nextNode())) {
    if (cur === node) return offset + range.startOffset;
    offset += (cur.textContent || '').length;
  }
  return null;
}

const NUB = 6;

/** Frames the mark must stay still before we stop re-measuring. */
const STABLE_FRAMES = 20;

type HandlePos = {
  leftX: number; leftY: number;
  rightX: number; rightY: number;
  lineH: number;
};

function measureMark(): HandlePos | null {
  const mark = document.querySelector('[data-active-mark]');
  if (!mark) return null;

  const rects = mark.getClientRects();
  if (rects.length === 0) return null;

  const first = rects[0];
  const last = rects[rects.length - 1];

  return {
    leftX: first.left,
    leftY: first.top,
    rightX: last.right,
    rightY: last.bottom,
    lineH: first.height,
  };
}

function samePos(a: HandlePos | null, b: HandlePos | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.leftX === b.leftX && a.leftY === b.leftY
    && a.rightX === b.rightX && a.rightY === b.rightY
    && a.lineH === b.lineH;
}

export default function SelectionHandles({
  paragraphIndex,
  paragraphText,
  selectionRange,
  onSelectionChange,
  onDragStart,
  onDragEnd,
}: SelectionHandlesProps) {
  const [pos, setPos] = useState<HandlePos | null>(null);
  const [mounted, setMounted] = useState(false);
  const dragging = useRef<'left' | 'right' | null>(null);
  const currentRange = useRef(selectionRange);
  const hasMoved = useRef(false);
  const posRef = useRef<HandlePos | null>(null);
  const rafRef = useRef<number | null>(null);
  const stableFrames = useRef(0);

  currentRange.current = selectionRange;

  useEffect(() => { setMounted(true); }, []);

  // The mark can move after we measure it: the page scrolls, the translation
  // sheet animates in, the demo banner above the article collapses. Rather
  // than measuring once per event, re-measure every frame until the mark has
  // held still for a while, then idle until something nudges us again.
  const updatePos = useCallback(() => {
    stableFrames.current = 0;
    if (rafRef.current !== null) return;

    const tick = () => {
      const next = measureMark();
      if (samePos(posRef.current, next)) {
        stableFrames.current += 1;
      } else {
        stableFrames.current = 0;
        posRef.current = next;
        setPos(next);
      }

      if (stableFrames.current >= STABLE_FRAMES) {
        rafRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  useEffect(() => {
    updatePos();
  }, [updatePos, selectionRange]);

  useEffect(() => {
    const h = () => updatePos();
    window.addEventListener('scroll', h, true);
    window.addEventListener('resize', h);
    window.visualViewport?.addEventListener('scroll', h);
    window.visualViewport?.addEventListener('resize', h);

    // Anything reflowing the document — banners appearing or collapsing,
    // images loading, fonts swapping — moves the paragraph under the handles.
    const ro = new ResizeObserver(h);
    ro.observe(document.documentElement);
    const paraEl = document.querySelector(`[data-pidx="${paragraphIndex}"]`);
    if (paraEl) ro.observe(paraEl);

    return () => {
      window.removeEventListener('scroll', h, true);
      window.removeEventListener('resize', h);
      window.visualViewport?.removeEventListener('scroll', h);
      window.visualViewport?.removeEventListener('resize', h);
      ro.disconnect();
    };
  }, [updatePos, paragraphIndex]);

  const startDrag = useCallback((side: 'left' | 'right', pointerId: number, target: HTMLElement) => {
    dragging.current = side;
    hasMoved.current = false;
    target.setPointerCapture(pointerId);

    const paraEl = document.querySelector(`[data-pidx="${paragraphIndex}"]`) as HTMLElement | null;
    if (!paraEl) return;

    const prevTouchAction = paraEl.style.touchAction;
    paraEl.style.touchAction = 'none';

    const leftHandle = document.getElementById('sel-handle-left');
    const rightHandle = document.getElementById('sel-handle-right');

    // Track the Y midpoint of the line the handle is currently on,
    // so vertical finger drift doesn't jump to a different line.
    let anchorY: number | null = null;

    const onMove = (me: PointerEvent) => {
      if (!dragging.current) return;
      me.preventDefault();
      me.stopPropagation();

      if (leftHandle) leftHandle.style.visibility = 'hidden';
      if (rightHandle) rightHandle.style.visibility = 'hidden';
      const overlay = document.querySelector('[data-overlay]') as HTMLElement | null;
      if (overlay) overlay.style.visibility = 'hidden';

      // On the first move, snapshot the Y midpoint of the current handle's line.
      // On subsequent moves, use the pointer's X but keep Y locked to the
      // current selection line so vertical drift doesn't jump lines.
      if (anchorY === null) {
        const mark = document.querySelector('[data-active-mark]');
        if (mark) {
          const rects = mark.getClientRects();
          if (rects.length > 0) {
            const rect = dragging.current === 'left' ? rects[0] : rects[rects.length - 1];
            anchorY = rect.top + rect.height / 2;
          }
        }
        if (anchorY === null) anchorY = me.clientY;
      }

      // Use the anchored Y, but allow it to shift to a new line when
      // the pointer moves far enough vertically (more than one line height)
      const mark = document.querySelector('[data-active-mark]');
      let lineH = 30;
      if (mark) {
        const rects = mark.getClientRects();
        if (rects.length > 0) lineH = rects[0].height;
      }
      const dy = me.clientY - anchorY;
      if (Math.abs(dy) > lineH * 0.8) {
        anchorY = me.clientY;
      }

      const charOffset = caretOffsetInParagraph(me.clientX, anchorY, paraEl);

      if (leftHandle) leftHandle.style.visibility = '';
      if (rightHandle) rightHandle.style.visibility = '';
      if (overlay) overlay.style.visibility = '';

      if (charOffset === null) return;

      let newStart = currentRange.current.start;
      let newEnd = currentRange.current.end;

      if (dragging.current === 'left') {
        newStart = Math.min(charOffset, currentRange.current.end - 1);
      } else {
        if (charOffset <= currentRange.current.start) return;
        newEnd = Math.max(charOffset, currentRange.current.start + 1);
      }

      if (newStart === currentRange.current.start && newEnd === currentRange.current.end) return;
      if (newStart >= newEnd) return;

      if (!hasMoved.current) {
        hasMoved.current = true;
        onDragStart?.();
      }

      currentRange.current = { start: newStart, end: newEnd };
      onSelectionChange(
        paragraphText.slice(newStart, newEnd),
        paragraphIndex,
        { start: newStart, end: newEnd },
      );
    };

    const onUp = () => {
      dragging.current = null;
      paraEl.style.touchAction = prevTouchAction;
      if (hasMoved.current) onDragEnd?.();
      hasMoved.current = false;
      document.removeEventListener('pointermove', onMove, true);
      document.removeEventListener('pointerup', onUp, true);
    };

    document.addEventListener('pointermove', onMove, true);
    document.addEventListener('pointerup', onUp, true);
  }, [paragraphIndex, paragraphText, onSelectionChange, onDragStart, onDragEnd]);

  if (!mounted || !pos) return null;

  const HIT = 44;

  const hitStyle = (x: number, y: number, isLeft: boolean): React.CSSProperties => ({
    position: 'fixed',
    left: x - HIT / 2,
    top: isLeft ? y - NUB - (HIT - NUB) / 2 : y - (HIT - NUB) / 2,
    width: HIT,
    height: HIT,
    cursor: 'col-resize',
    touchAction: 'none',
    zIndex: 10001,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });

  const barStyle = (x: number, topY: number, h: number): React.CSSProperties => ({
    position: 'fixed',
    left: x - 1,
    top: topY,
    width: 2,
    height: h,
    zIndex: 10000,
    pointerEvents: 'none',
  });

  return createPortal(
    <>
      {/* Left: bar + nub above top-left */}
      <div className="bg-primary" style={barStyle(pos.leftX, pos.leftY, pos.lineH)} />
      <div
        id="sel-handle-left"
        style={hitStyle(pos.leftX, pos.leftY, true)}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          startDrag('left', e.pointerId, e.currentTarget as HTMLElement);
        }}
      >
        <div
          className="bg-primary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
          style={{ width: NUB, height: NUB, borderRadius: '50%' }}
        />
      </div>

      {/* Right: bar + nub below bottom-right */}
      <div className="bg-primary" style={barStyle(pos.rightX, pos.rightY - pos.lineH, pos.lineH)} />
      <div
        id="sel-handle-right"
        style={hitStyle(pos.rightX, pos.rightY, false)}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          startDrag('right', e.pointerId, e.currentTarget as HTMLElement);
        }}
      >
        <div
          className="bg-primary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
          style={{ width: NUB, height: NUB, borderRadius: '50%' }}
        />
      </div>
    </>,
    document.body,
  );
}
