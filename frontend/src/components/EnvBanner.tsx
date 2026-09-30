import React, {useRef, useState} from "react";
import {APP_ENV, SHOW_ENV_BANNER, isDevOrStaging} from "../config/env";

const bannerColorMap: Record<string, string> = {
  development: "#2563eb", // blue
  staging: "#f59e0b", // amber
};

export const EnvBanner: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({x: 12, y: 12});
  const [dragging, setDragging] = useState(false);
  const offset = useRef({x: 0, y: 0});

  if (!isDevOrStaging || !SHOW_ENV_BANNER) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;

    offset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    setDragging(true);
    ref.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;

    setPosition({
      x: e.clientX - offset.current.x,
      y: e.clientY - offset.current.y,
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    setDragging(false);
    ref.current?.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        ...styles.container,
        backgroundColor: bannerColorMap[APP_ENV],
        left: position.x,
        top: position.y,
        cursor: dragging ? "grabbing" : "grab",
      }}
    >
      <span style={styles.text}>{APP_ENV.toUpperCase()}</span>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "fixed",
    zIndex: 9999,
    padding: "6px 12px",
    borderRadius: 999,
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    fontWeight: 600,
    fontSize: 12,
    userSelect: "none",
    touchAction: "none",
  },
  text: {
    color: "#fff",
    letterSpacing: "0.05em",
  },
};
