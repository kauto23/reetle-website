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

// Find the start of the word containing `offset`.
// If offset is in whitespace, find the start of the word to the left.
function wordStartAt(text: string, offset: number): number {
  let i = Math.min(offset, text.length);
  // If we're in whitespace or at end, step left to find a word char
  if (i >= text.length || /\s/.test(text[i])) {
    while (i > 0 && /\s/.test(text[i - 1])) i--;
  }
  // Now walk left through word chars to find the start
  while (i > 0 && /\S/.test(text[i - 1])) i--;
  return i;
}

// Find the end of the word containing `offset`.
// If offset is in whitespace, find the end of the word to the right.
function wordEndAt(text: string, offset: number): number {
  let i = Math.max(offset, 0);
  // If we're in whitespace, step right to find a word char
  if (i < text.length && /\s/.test(text[i])) {
    // Don't jump forward -- stay at the end of the previous word
    // Only advance if we're already past the selection start
    return i;
  }
  // Walk right through word chars to find the end
  while (i < text.length && /\S/.test(text[i])) i++;
  return i;
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

export default function SelectionHandles({
  paragraphIndex,
  paragraphText,
  selectionRange,
  onSelectionChange,
  onDragStart,
  onDragEnd,
}: SelectionHandlesProps) {
  const [pos, setPos] = useState<{
    leftX: number; leftY: number;
    rightX: number; rightY: number;
    lineH: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  const dragging = useRef<'left' | 'right' | null>(null);
  const currentRange = useRef(selectionRange);
  const hasMoved = useRef(false);

  currentRange.current = selectionRange;

  useEffect(() => { setMounted(true); }, []);

  // Find the mark and compute positions
  const updatePos = useCallback(() => {
    const mark = document.querySelector('[data-active-mark]');
    if (!mark) { setPos(null); return; }

    const rects = mark.getClientRects();
    if (rects.length === 0) { setPos(null); return; }

    const first = rects[0];
    const last = rects[rects.length - 1];

    setPos({
      leftX: first.left,
      leftY: first.top,
      rightX: last.right,
      rightY: last.bottom,
      lineH: first.height,
    });
  }, []);

  // Update on mount and when selection changes
  useEffect(() => {
    updatePos();
  }, [updatePos, selectionRange]);

  // Update on scroll/resize
  useEffect(() => {
    const h = () => updatePos();
    window.addEventListener('scroll', h, true);
    window.addEventListener('resize', h);
    return () => {
      window.removeEventListener('scroll', h, true);
      window.removeEventListener('resize', h);
    };
  }, [updatePos]);

  // Drag logic: attach to document directly, hide handles during caretRangeFromPoint
  const startDrag = useCallback((side: 'left' | 'right', pointerId: number, target: HTMLElement) => {
    dragging.current = side;
    hasMoved.current = false;
    target.setPointerCapture(pointerId);

    const paraEl = document.querySelector(`[data-pidx="${paragraphIndex}"]`) as HTMLElement | null;
    if (!paraEl) return;

    const leftHandle = document.getElementById('sel-handle-left');
    const rightHandle = document.getElementById('sel-handle-right');

    const onMove = (me: PointerEvent) => {
      if (!dragging.current) return;
      me.preventDefault();
      me.stopPropagation();

      // Hide handles so caretRangeFromPoint sees text, not the handles
      if (leftHandle) leftHandle.style.visibility = 'hidden';
      if (rightHandle) rightHandle.style.visibility = 'hidden';
      // Also hide the translation sheet overlay
      const overlay = document.querySelector('[data-overlay]') as HTMLElement | null;
      if (overlay) overlay.style.visibility = 'hidden';

      const charOffset = caretOffsetInParagraph(me.clientX, me.clientY, paraEl);

      if (leftHandle) leftHandle.style.visibility = '';
      if (rightHandle) rightHandle.style.visibility = '';
      if (overlay) overlay.style.visibility = '';

      if (charOffset === null) return;

      let newStart = currentRange.current.start;
      let newEnd = currentRange.current.end;

      if (dragging.current === 'left') {
        const boundary = wordStartAt(paragraphText, charOffset);
        newStart = Math.min(boundary, currentRange.current.end - 1);
      } else {
        const boundary = wordEndAt(paragraphText, charOffset);
        if (boundary <= currentRange.current.start) return;
        newEnd = Math.max(boundary, currentRange.current.start + 1);
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
      if (hasMoved.current) onDragEnd?.();
      hasMoved.current = false;
      document.removeEventListener('pointermove', onMove, true);
      document.removeEventListener('pointerup', onUp, true);
    };

    // Use capture phase so we get events before anything else
    document.addEventListener('pointermove', onMove, true);
    document.addEventListener('pointerup', onUp, true);
  }, [paragraphIndex, paragraphText, onSelectionChange, onDragStart, onDragEnd]);

  if (!mounted || !pos) return null;

  const HIT = 24;

  const hitStyle = (x: number, y: number, isLeft: boolean): React.CSSProperties => ({
    position: 'fixed',
    left: x - HIT / 2,
    top: isLeft ? y - NUB - (HIT - NUB) / 2 : y - (HIT - NUB) / 2,
    width: HIT,
    height: HIT,
    cursor: 'col-resize',
    touchAction: 'none',
    zIndex: 9999,
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
    zIndex: 9998,
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
