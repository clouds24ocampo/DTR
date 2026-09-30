import { useEffect, useRef, useState } from "react";
import logo from "../../../assets/logo/Logox.png";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let start: number | null = null;
    const duration = 600;
    let animationFrameId: number;

    const animateProgress = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);
      if (newProgress < 100) {
        animationFrameId = requestAnimationFrame(animateProgress);
      } else {
        setFadeOut(true);
        setTimeout(() => {
          onCompleteRef.current?.();
        }, 200);
      }
    };

    animationFrameId = requestAnimationFrame(animateProgress);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-300 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      } bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900`}
    >
      <div className="text-center">
        <div className="relative mb-3">
          <div className="absolute inset-0 animate-ping opacity-20">
            <div className="w-24 h-24 mx-auto bg-blue-500 rounded-full"></div>
          </div>

          <div className="relative animate-bounce-slow">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/50">
              <img src={logo} alt="Quantum Logo" className="w-16 h-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
