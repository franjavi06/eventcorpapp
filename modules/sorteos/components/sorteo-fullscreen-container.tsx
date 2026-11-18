"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type SorteoFullscreenContextValue = {
  isFullscreen: boolean;
  toggleFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
};

const SorteoFullscreenContext =
  createContext<SorteoFullscreenContextValue | null>(null);

export function useSorteoFullscreen() {
  return useContext(SorteoFullscreenContext);
}

export function SorteoFullscreenContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else if (containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        setIsFullscreen((v) => !v);
      }
    } catch {
      setIsFullscreen((v) => !v);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // ignorar errores de la API al salir
    }
    setIsFullscreen(false);
  }, []);

  return (
    <SorteoFullscreenContext.Provider
      value={{ isFullscreen, toggleFullscreen, exitFullscreen }}
    >
      <div
        ref={containerRef}
        className={isFullscreen ? "overflow-hidden bg-card" : undefined}
      >
        {children}
      </div>
    </SorteoFullscreenContext.Provider>
  );
}
