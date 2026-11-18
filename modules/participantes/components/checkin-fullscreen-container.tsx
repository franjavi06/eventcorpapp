"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type CheckInFullscreenContextValue = {
  isFullscreen: boolean;
  toggleFullscreen: () => Promise<void>;
};

const CheckInFullscreenContext =
  createContext<CheckInFullscreenContextValue | null>(null);

export function useCheckInFullscreen() {
  return useContext(CheckInFullscreenContext);
}

export function CheckInFullscreenContainer({
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

  return (
    <CheckInFullscreenContext.Provider
      value={{ isFullscreen, toggleFullscreen }}
    >
      <div
        ref={containerRef}
        className={
          isFullscreen
            ? "fixed inset-0 z-50 min-h-screen overflow-y-auto bg-background p-6 md:p-8"
            : undefined
        }
      >
        {children}
      </div>
    </CheckInFullscreenContext.Provider>
  );
}
