"use client";

import { useEffect, useRef, useState } from "react";
import { BOPA_WHATSAPP_NUMBER } from "@/constants/bopa-contact";
import { buildWaMeUrl } from "@/lib/whatsapp";

type Position = { x: number; y: number };
const STORAGE_KEY = "bopa-whatsapp-help-position";

function clampPosition(position: Position, element: HTMLElement): Position {
  return {
    x: Math.max(0, Math.min(position.x, window.innerWidth - element.offsetWidth)),
    y: Math.max(0, Math.min(position.y, window.innerHeight - element.offsetHeight)),
  };
}

export function GlobalWhatsAppHelp() {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; left: number; top: number } | null>(null);
  const draggedRef = useRef(false);
  const [position, setPosition] = useState<Position | null>(null);
  const whatsappHelpUrl = buildWaMeUrl({
    phoneNumber: BOPA_WHATSAPP_NUMBER,
    message: "Hello BOPA, I need help.",
  });

  useEffect(() => {
    const element = linkRef.current;
    if (!element) return;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Position;
        if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
          setPosition(clampPosition(parsed, element));
        }
      }
    } catch {
      // Storage may be disabled; dragging still works for this visit.
    }

    const keepInView = () => setPosition((current) => current ? clampPosition(current, element) : null);
    window.addEventListener("resize", keepInView);
    return () => window.removeEventListener("resize", keepInView);
  }, []);

  function finishDrag(pointerId: number) {
    if (dragRef.current?.pointerId !== pointerId) return;
    dragRef.current = null;
    const element = linkRef.current;
    if (!element) return;
    const next = clampPosition({ x: element.getBoundingClientRect().left, y: element.getBoundingClientRect().top }, element);
    if (draggedRef.current) {
      setPosition(next);
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Storage is optional. */ }
    }
    if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
  }

  return (
    <a
      ref={linkRef}
      href={whatsappHelpUrl}
      draggable={false}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Need help? Chat with us on WhatsApp"
      title="Drag to move, or tap to chat"
      style={position ? { left: position.x, top: position.y } : undefined}
      className={`fixed z-50 flex size-[60px] touch-none select-none items-center justify-center rounded-full bg-[#0F7A3D] text-white shadow-[0_8px_24px_rgba(20,33,61,0.28)] hover:bg-[#0c6834] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0F7A3D]/30 sm:h-14 sm:w-auto sm:gap-3 sm:px-[18px] sm:pr-[22px] ${position ? "cursor-grab active:cursor-grabbing" : "bottom-5 right-4 cursor-grab active:cursor-grabbing sm:bottom-6 sm:right-6"}`}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        const rect = event.currentTarget.getBoundingClientRect();
        dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
        draggedRef.current = false;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 5) draggedRef.current = true;
        if (draggedRef.current) {
          setPosition(clampPosition({ x: drag.left + event.clientX - drag.x, y: drag.top + event.clientY - drag.y }, event.currentTarget));
        }
      }}
      onPointerUp={(event) => finishDrag(event.pointerId)}
      onPointerCancel={(event) => finishDrag(event.pointerId)}
      onDragStart={(event) => event.preventDefault()}
      onClick={(event) => {
        if (draggedRef.current) {
          event.preventDefault();
          draggedRef.current = false;
        }
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="28"
        height="28"
        fill="currentColor"
        aria-hidden="true"
        className="shrink-0"
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
      </svg>
      <span className="hidden text-base font-bold sm:inline">
        Stuck? Chat with us on WhatsApp
      </span>
    </a>
  );
}
