import { Eye, EyeOff, LogIn, AlertCircle, ChevronRight, ArrowRight, ShieldCheck } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "../../stores/auth/auth.store";
import LoadingIndicator from "../../components/common/login/LoadingIndicator";
import { motion } from "framer-motion";
import SplashScreen from "../../components/common/login/SplashScreen";
import ForgotPasswordModal from "../../components/common/login/ForgotPasswordModal";
import RegisterAdminModal from "../../components/common/login/RegisterAdminModal";

const MOBILE_BREAKPOINT_PX = 768;
const APP_DISPLAY_NAME = "QUANTUM CLOUD CORPORATION"; // Onboarding headline app name

// Carousel images from assets/logo/images (Vite glob – paths relative to this file)
const carouselImageEntries = import.meta.glob<string>(
  "../../assets/logo/images/*.{jpg,jpeg,png,webp}",
  { eager: true, query: "?url", import: "default" }
);
const CAROUSEL_IMAGES: string[] =
  Object.keys(carouselImageEntries).length > 0
    ? (Object.values(carouselImageEntries).filter((v): v is string => typeof v === "string") as string[])
    : [new URL("../../assets/logo/Logox.png", import.meta.url).href];
const CAROUSEL_INTERVAL_MS = 4000;

const LOGO_EXPAND_LIGHT_URL = new URL("../../assets/logo/logo-expand-light.png", import.meta.url).href;
const LOGO_EXPAND_DARK_URL = new URL("../../assets/logo/logo-expand-dark.png", import.meta.url).href;

const LOGIN_EMAIL_KEY = "hrms_login_email";
const LOGIN_PASSWORD_KEY = "hrms_login_password";

const SWIPE_HANDLE_SIZE = 48;
const SWIPE_THRESHOLD = 0.75; // 75% of track to complete

/** Swipe-to-start bar: proceed only when the handle is swiped from left to right. Works smoothly on all mobile devices. */
function SwipeToStart({ onComplete }: { onComplete: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startDragXRef = useRef(0);
  const currentXRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  const didCompleteRef = useRef(false);
  onCompleteRef.current = onComplete;

  const handlePointerDown = (e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    startXRef.current = e.clientX;
    startDragXRef.current = dragX;
    currentXRef.current = dragX;
    didCompleteRef.current = false;
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging || !handleRef.current) return;
    const handle = handleRef.current;
    const track = trackRef.current;

    const flushPosition = () => {
      rafIdRef.current = null;
      const x = currentXRef.current;
      setDragX(x);
      const trackWidth = track?.offsetWidth ?? 300;
      const maxDrag = Math.max(0, trackWidth - SWIPE_HANDLE_SIZE - 16);
      if (!didCompleteRef.current && maxDrag > 0 && x >= maxDrag * SWIPE_THRESHOLD) {
        didCompleteRef.current = true;
        onCompleteRef.current();
      }
    };

    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      const trackWidth = track?.offsetWidth ?? 300;
      const maxDrag = Math.max(0, trackWidth - SWIPE_HANDLE_SIZE - 16);
      const delta = e.clientX - startXRef.current;
      const next = Math.max(0, Math.min(maxDrag, startDragXRef.current + delta));
      currentXRef.current = next;
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(flushPosition);
      }
    };

    const onUp = () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      flushPosition();
      setIsDragging(false);
    };

    const opts: AddEventListenerOptions = { passive: false };
    handle.addEventListener("pointermove", onMove, opts);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
    return () => {
      handle.removeEventListener("pointermove", onMove, opts);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    };
  }, [isDragging]);

  return (
    <div className="flex items-center gap-3 w-full touch-none">
      <div
        ref={trackRef}
        className="flex-1 h-14 rounded-full bg-slate-700/90 border border-slate-600 flex items-center px-2 relative overflow-hidden touch-none"
      >
        <div
          ref={handleRef}
          className="absolute inset-y-2 left-2 flex items-center cursor-grab active:cursor-grabbing select-none touch-none"
          style={{ left: 8 + dragX, willChange: isDragging ? "left" : "auto" }}
          onPointerDown={handlePointerDown}
          role="slider"
          aria-label="Swipe to sign in"
        >
          <motion.div
            className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-slate-800 shadow-lg shrink-0"
            animate={isDragging ? { scale: 1.05 } : { scale: 1 }}
            transition={{ type: "tween", duration: 0.15 }}
          >
            <ArrowRight className="w-5 h-5 ml-0.5" fill="currentColor" />
          </motion.div>
        </div>
        <div className="flex-1 flex items-center justify-end gap-2 pl-14 pr-4 pointer-events-none">
          <span className="text-white font-medium flex items-center gap-1 py-2 px-2">
            Sign in
            <span className="text-white/80 flex gap-0.5">
              <ChevronRight className="w-4 h-4" />
              <ChevronRight className="w-4 h-4" />
              <ChevronRight className="w-4 h-4" />
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function LoginForm() {
  const { login, loginLoading, showSplash, setShowSplash } = useAuthStore();
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem(LOGIN_EMAIL_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [password, setPassword] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem(LOGIN_PASSWORD_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showRegisterAdmin, setShowRegisterAdmin] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselReady, setCarouselReady] = useState(false);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [isBackgroundLight, setIsBackgroundLight] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileOnboarding, setShowMobileOnboarding] = useState(true);
  const lastCarouselIndexRef = useRef(0);
  const skipNextPersist = useRef(true);

  // Mobile breakpoint: show onboarding with swipe-to-start first
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Pick logo variant: light logo on dark background, dark logo on light background
  const logoExpandUrl = isBackgroundLight ? LOGO_EXPAND_DARK_URL : LOGO_EXPAND_LIGHT_URL;

  // Track previous index when carouselIndex changes (for transition)
  useEffect(() => {
    const prev = lastCarouselIndexRef.current;
    lastCarouselIndexRef.current = carouselIndex;
    if (prev !== carouselIndex) setPreviousIndex(prev);
  }, [carouselIndex]);

  // Preload and decode all carousel images so transitions never wait on network/decode (critical for deployed)
  useEffect(() => {
    const preload = (src: string) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          // Ensure decode completes so first paint of this image is smooth (no flash in production)
          if (img.decode) {
            img.decode().then(resolve).catch(() => resolve());
          } else {
            resolve();
          }
        };
        img.onerror = () => resolve(); // don't block carousel on one bad image
        img.src = src;
      });
    Promise.all(CAROUSEL_IMAGES.map(preload))
      .then(() => setCarouselReady(true))
      .catch(() => setCarouselReady(true));
  }, []);

  // Auto-advance carousel (only after images are ready)
  useEffect(() => {
    if (!carouselReady || CAROUSEL_IMAGES.length <= 1) return;
    const id = setInterval(() => {
      setCarouselIndex((i) => (i + 1) % CAROUSEL_IMAGES.length);
    }, CAROUSEL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [carouselReady]);

  // Detect if current carousel slide is light or dark to choose logo variant (light logo on dark, dark logo on light)
  useEffect(() => {
    if (!carouselReady || CAROUSEL_IMAGES.length === 0) {
      setIsBackgroundLight(false);
      return;
    }
    const src = CAROUSEL_IMAGES[carouselIndex];
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const w = 32;
        const h = 32;
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          sum += (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        }
        const avg = sum / (data.length / 4);
        setIsBackgroundLight(avg > 0.45);
      } catch {
        setIsBackgroundLight(false);
      }
    };
    img.onerror = () => setIsBackgroundLight(false);
    img.src = src;
  }, [carouselReady, carouselIndex]);

  const navigate = useNavigate();
  const location = useLocation();
  const redirectAfterLogin =
    (location.state as { redirectAfterLogin?: string } | null)?.redirectAfterLogin || null;

  // Hydrate from localStorage on mount (in case initial state was empty, e.g. after splash or remount)
  useEffect(() => {
    try {
      const storedEmail = localStorage.getItem(LOGIN_EMAIL_KEY) ?? "";
      const storedPassword = localStorage.getItem(LOGIN_PASSWORD_KEY) ?? "";
      setEmail((prev) => (prev === "" && (storedEmail || storedPassword) ? storedEmail : prev));
      setPassword((prev) => (prev === "" && (storedEmail || storedPassword) ? storedPassword : prev));
    } catch {
      // ignore (e.g. private mode)
    }
  }, []);

  // Persist to localStorage when user changes values; skip first run to avoid clearing
  useEffect(() => {
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    try {
      if (email) localStorage.setItem(LOGIN_EMAIL_KEY, email);
      else localStorage.removeItem(LOGIN_EMAIL_KEY);
      if (password) localStorage.setItem(LOGIN_PASSWORD_KEY, password);
      else localStorage.removeItem(LOGIN_PASSWORD_KEY);
    } catch {
      // ignore storage errors (e.g. private mode)
    }
  }, [email, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusNote(null);
    const result = await login({ email, password });
    setIsLoading(false);

    if (result.success) {
      // Keep email/password in state and localStorage so they persist as "last used" for next visit
      if (redirectAfterLogin && typeof redirectAfterLogin === "string" && redirectAfterLogin.startsWith("/")) {
        navigate(redirectAfterLogin, { replace: true });
      } else {
        navigate("/");
      }
    } else if (result.message) {
      setStatusNote(result.message);
    }
  };

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // Mobile: initial onboarding view (dark theme, carousel playing, headline, swipe to start)
  // Freedom Wall button is shown only with the login form (after swipe), not on this initial preview
  if (isMobile && showMobileOnboarding) {
    return (
      <div className="h-screen max-h-screen w-screen relative overflow-hidden bg-[#1e293b] flex flex-col">
        {/* Carousel background – same playing carousel as desktop */}
        <div className="absolute inset-0">
          {!carouselReady && (
            <>
              <div className="absolute inset-0 flex items-center justify-center opacity-30">
                <div className="w-48 h-48 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 blur-3xl" />
              </div>
              <div
                className="absolute bottom-0 left-0 right-0 h-2/5 bg-gradient-to-t from-slate-800/90 via-blue-900/50 to-transparent"
                aria-hidden
              />
            </>
          )}
          {carouselReady && (
            <>
              <motion.div
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <div className="absolute inset-0">
                  {CAROUSEL_IMAGES.map((src, i) => (
                    <motion.img
                      key={i}
                      src={src}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover object-bottom pointer-events-none"
                      style={{
                        zIndex: i === carouselIndex ? 1 : i === previousIndex ? 2 : 0,
                        willChange: i === carouselIndex || i === previousIndex ? "opacity" : "auto",
                      }}
                      initial={false}
                      animate={{
                        opacity: i === carouselIndex ? 1 : i === previousIndex ? 0 : 0,
                      }}
                      transition={{
                        duration: 0.7,
                        ease: [0.4, 0, 0.2, 1],
                      }}
                      onAnimationComplete={
                        i === previousIndex
                          ? () => setPreviousIndex(null)
                          : undefined
                      }
                    />
                  ))}
                </div>
                <div
                  className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-slate-900/30 pointer-events-none"
                  aria-hidden
                />
              </motion.div>
              {/* Carousel indicators – thin, vertical, center right
              <div className="absolute -right-5 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
                {CAROUSEL_IMAGES.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCarouselIndex(i)}
                    className="w-1 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent"
                    style={{ height: i === carouselIndex ? 24 : 16 }}
                    aria-label={`Go to slide ${i + 1}`}
                    aria-current={i === carouselIndex ? "true" : undefined}
                  >
                    <span
                      className={`block w-[5px] h-full rounded-lg ${
                        i === carouselIndex
                          ? "bg-gradient-to-b from-blue-400 to-cyan-400"
                          : "bg-slate-500 hover:bg-slate-400"
                      }`}
                    />
                  </button>
                ))}
              </div> */}
            </>
          )}
        </div>
        {/* App name */}
        <div className="relative z-10 pt-8 px-5">
          <img
            src={LOGO_EXPAND_LIGHT_URL}
            alt={APP_DISPLAY_NAME}
            className="h-11 w-auto max-w-[200px] object-contain object-left"
          />
        </div>
        {/* Headline */}
        <div className="relative z-10 flex-1 flex items-center px-5 pt-72">
          <h2 className="text-5xl sm:text-5xl font-bold text-white leading-tight max-w-sm">
            Control
            <br />
            Everything in
            <br />
            One Place
          </h2>
        </div>
        {/* Bottom bar: swipe to start */}
        <div className="relative z-10 p-4 pb-8">
          <div className="rounded-full bg-slate-700/80 border border-slate-600 p-3">
            <SwipeToStart onComplete={() => setShowMobileOnboarding(false)} />
          </div>
        </div>
      </div>
    );
  }

  // Animations
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        duration: 0.6,
        stiffness: 80,
        damping: 10,
        when: "beforeChildren",
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  // Mobile login form (dark theme – matches desktop UI)
  const mobileFormContent = (
    <motion.div
      className="w-full max-w-md mx-auto p-4 flex flex-col justify-center min-h-[80vh]"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div
        className={`bg-slate-800/95 rounded-2xl border border-slate-700/50 p-6 sm:p-8 transition-shadow duration-300 ${
          !isLoading ? "shadow-[inset_0_0_0_1px_rgba(52,84,154,0.4)]" : ""
        }`}
      >
        {/* Header – same as desktop */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">
            Sign in
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Enter your credentials to access your account
          </p>
        </div>
        {statusNote && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-950/50 border border-red-800/50 text-red-200 px-4 py-3 rounded-lg text-sm flex items-start gap-3"
          >
            <div className="bg-red-900/50 p-1 rounded-lg shrink-0">
              <AlertCircle className="w-4 h-4 text-red-400" />
            </div>
            <p>{statusNote}</p>
          </motion.div>
        )}
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="mobile-email" className="block text-sm font-medium text-slate-300">
              Email address
            </label>
            <input
              id="mobile-email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full px-3.5 py-2.5 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-sm transition-shadow"
              placeholder="you@company.com"
              autoComplete="username"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="mobile-password" className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-xs font-medium text-blue-400 hover:text-cyan-400 focus:outline-none focus:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                id="mobile-password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-3.5 py-2.5 pr-10 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-sm transition-shadow"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <motion.button
              type="submit"
              disabled={loginLoading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-blue-400 to-cyan-400 shadow-lg shadow-blue-500/50 hover:from-blue-500 hover:to-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <LogIn className="w-4 h-4" />
              {loginLoading ? "Signing in..." : "Sign in"}
            </motion.button>
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-600" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-slate-800 px-3 text-xs text-slate-400">
                or
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/clock")}
            className="w-full flex justify-center items-center gap-2 py-2.5 px-4 text-sm font-medium rounded-lg text-white bg-transparent border border-slate-600 hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors"
          >
            Access Public Clock Interface
          </button>
          <button
            type="button"
            onClick={() => navigate("/coming-soon")}
            className="w-full flex justify-center items-center gap-2 py-2.5 px-4 text-sm font-medium rounded-lg text-white bg-transparent border border-slate-600 hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors"
          >
            Virtual Office
          </button>
          <button
            type="button"
            onClick={() => setShowRegisterAdmin(true)}
            className="w-full flex justify-center items-center gap-2 py-2 px-4 text-xs font-semibold rounded-lg text-cyan-300 bg-blue-950/70 border border-blue-500/50 hover:bg-blue-900/60 hover:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all shadow-md"
          >
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            Register Super Admin
          </button>
        </form>
      </div>
    </motion.div>
  );

  const freedomWallButton = (
    <button
      type="button"
      onClick={() => navigate("/freedom-wall")}
      className="flex items-center gap-2 rounded-full border border-white/20 bg-slate-900/85 px-3 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400"
    >
      Freedom Wall
    </button>
  );

  return (
    <div className="h-screen max-h-screen w-screen relative overflow-hidden flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-black via-blue-950 to-blue-700">
      {/* Freedom Wall: fixed top-right of screen (mobile login view + desktop) */}
      <div className="fixed top-4 right-4 z-50">
        {freedomWallButton}
      </div>
      {isLoading && <LoadingIndicator message="Authenticating..." />}

      {isMobile ? (
        mobileFormContent
      ) : (
      <motion.div
        className="flex flex-row w-full max-w-5xl min-h-auto max-h-auto overflow-hidden rounded-2xl"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Left panel (40%) - Image carousel from assets/logo/images (shown only when preloaded) */}
        <motion.div
          className="w-[40%] min-w-0 shrink-0 relative overflow-hidden rounded-l-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
          variants={itemVariants}
        >
          {/* Header: logo only when carousel ready (Freedom Wall is fixed top-right of screen) */}
          {carouselReady ? (
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-4">
              <div className="w-[140px] flex items-center shrink-0">
                <img
                  src={logoExpandUrl}
                  alt="QUANTUM CLOUD CORPORATION"
                  className="h-auto w-full max-w-full object-contain object-left"
                />
              </div>
            </div>
          ) : (
            /* Logo: centered while loading */
            <motion.div
              className="absolute z-20 flex items-center justify-center"
              initial={false}
              animate={{ left: "50%", top: "50%", x: "-50%", y: "-50%", width: 260 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              <img
                src={logoExpandUrl}
                alt="QUANTUM CLOUD CORPORATION"
                className="h-auto w-full max-w-full object-contain object-left-top"
              />
            </motion.div>
          )}
          {/* Placeholder until all images are loaded */}
          {!carouselReady && (
            <>
              <div className="absolute inset-0 flex items-center justify-center opacity-30">
                <div className="w-48 h-48 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 blur-3xl" />
              </div>
              <div
                className="absolute bottom-0 left-0 right-0 h-2/5 bg-gradient-to-t from-slate-800/90 via-blue-900/50 to-transparent"
                aria-hidden
              />
            </>
          )}
          {/* Carousel: all images kept mounted and opacity-only transition (smooth in deployed env) */}
          {carouselReady && (
            <>
              <motion.div
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <div className="absolute inset-0">
                  {CAROUSEL_IMAGES.map((src, i) => (
                    <motion.img
                      key={i}
                      src={src}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      style={{
                        zIndex: i === carouselIndex ? 1 : i === previousIndex ? 2 : 0,
                        willChange: i === carouselIndex || i === previousIndex ? "opacity" : "auto",
                      }}
                      initial={false}
                      animate={{
                        opacity: i === carouselIndex ? 1 : i === previousIndex ? 0 : 0,
                      }}
                      transition={{
                        duration: 0.7,
                        ease: [0.4, 0, 0.2, 1],
                      }}
                      onAnimationComplete={
                        i === previousIndex
                          ? () => setPreviousIndex(null)
                          : undefined
                      }
                    />
                  ))}
                </div>
              </motion.div>
              {/* Overlay gradient (slate/blue) for contrast */}
              <div
                className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-slate-900/40 pointer-events-none"
                aria-hidden
              />
              {/* Carousel indicators */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {CAROUSEL_IMAGES.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCarouselIndex(i)}
                    className="h-1 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent"
                    style={{ width: i === carouselIndex ? 24 : 16 }}
                    aria-label={`Go to slide ${i + 1}`}
                    aria-current={i === carouselIndex ? "true" : undefined}
                  >
                    <span
                      className={`block w-full h-full rounded-full ${
                        i === carouselIndex
                          ? "bg-gradient-to-r from-blue-400 to-cyan-400"
                          : "bg-slate-500 hover:bg-slate-400"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* Right panel (60%) - Form (slate/blue theme); inset shadow only when not loading/delayed */}
        <motion.div
          className={`w-[60%] min-w-0 shrink-0 flex flex-col bg-slate-800/95 p-6 sm:p-8 rounded-r-2xl border-l border-slate-700/50 transition-shadow duration-300 ${
            carouselReady && !isLoading ? "shadow-[inset_0_0_0_1px_rgba(52,84,154,0.4)]" : ""
          }`}
          variants={itemVariants}
        >
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Sign in
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">
              Enter your credentials to access your account
            </p>
          </div>

          {statusNote && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-red-950/50 border border-red-800/50 text-red-200 px-4 py-3 rounded-lg text-sm flex items-start gap-3"
            >
              <div className="bg-red-900/50 p-1 rounded-lg shrink-0">
                <AlertCircle className="w-4 h-4 text-red-400" />
              </div>
              <p>{statusNote}</p>
            </motion.div>
          )}

          <motion.form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit}>
            {/* Email */}
            <motion.div className="space-y-1.5" variants={itemVariants}>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-300"
              >
                Email address
              </label>
              <motion.input
                whileFocus={{ scale: 1.01 }}
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-3.5 py-2.5 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 sm:text-sm transition-shadow"
                placeholder="you@company.com"
                autoComplete="username"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </motion.div>

            {/* Password */}
            <motion.div className="space-y-1.5" variants={itemVariants}>
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-300"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs font-medium text-blue-400 hover:text-cyan-400 focus:outline-none focus:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <motion.input
                  whileFocus={{ scale: 1.01 }}
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3.5 py-2.5 pr-10 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 sm:text-sm transition-shadow"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </motion.div>

            {/* Submit - SplashScreen accent gradient */}
            <motion.div variants={itemVariants}>
              <motion.button
                type="submit"
                disabled={loginLoading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-blue-400 to-cyan-400 shadow-lg shadow-blue-500/50 hover:from-blue-500 hover:to-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <LogIn className="w-4 h-4" />
                {loginLoading ? "Signing in..." : "Sign in"}
              </motion.button>
            </motion.div>

            {/* Divider */}
            <motion.div className="relative" variants={itemVariants}>
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-600" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-slate-800 px-3 text-xs text-slate-400">
                  or
                </span>
              </div>
            </motion.div>

            {/* Public Clock - secondary action */}
            <motion.div variants={itemVariants}>
              <button
                type="button"
                onClick={() => navigate("/clock")}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 text-sm font-medium rounded-lg text-white bg-transparent border border-slate-600 hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors"
              >
                Access Public Clock Interface
              </button>
            </motion.div>
            {/* Virtual Office - secondary action */}
            <motion.div variants={itemVariants}>
              <button
                type="button"
                onClick={() => navigate("/coming-soon")}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 text-sm font-medium rounded-lg text-white bg-transparent border border-slate-600 hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors"
              >
                Virtual Office
              </button>
            </motion.div>
            {/* Register Super Admin */}
            <motion.div variants={itemVariants}>
              <button
                type="button"
                onClick={() => setShowRegisterAdmin(true)}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 text-xs font-semibold rounded-lg text-cyan-300 bg-blue-950/70 border border-blue-500/50 hover:bg-blue-900/60 hover:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all shadow-md"
              >
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                Register Super Admin
              </button>
            </motion.div>
          </motion.form>
        </motion.div>
      </motion.div>
      )}
      <ForgotPasswordModal
        open={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
      <RegisterAdminModal
        isOpen={showRegisterAdmin}
        onClose={() => setShowRegisterAdmin(false)}
      />
    </div>
  );
}
