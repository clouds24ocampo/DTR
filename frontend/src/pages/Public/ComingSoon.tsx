import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Clock, Mail, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function ComingSoon() {
  const navigate = useNavigate();
  // Set your target date here (example: 30 days from now)
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 30);

  const calculateTimeLeft = (): TimeLeft => {
    const difference = +targetDate - +new Date();

    if (difference > 0) {
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }

    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut" as const,
      },
    },
  };

  const countdownVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 200,
        damping: 15,
      },
    },
  };

  const CountdownBox = ({
    value,
    label,
  }: {
    value: number;
    label: string;
  }) => (
    <motion.div
      className="flex flex-col items-center justify-center bg-white/10 backdrop-blur-md rounded-lg p-4 sm:p-6 md:p-8 border border-white/20 shadow-xl min-w-[70px] sm:min-w-[90px] md:min-w-[120px]"
      variants={countdownVariants}
      whileHover={{ scale: 1.05, y: -5 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <motion.div
        className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2"
        key={value}
        initial={{ scale: 1.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {String(value).padStart(2, "0")}
      </motion.div>
      <div className="text-xs sm:text-sm md:text-base text-white/80 font-medium uppercase tracking-wider">
        {label}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen w-screen relative overflow-hidden bg-gradient-to-br from-black via-blue-950 to-blue-700 flex items-center justify-center p-4 sm:p-6 md:p-8">
      {/* Background Blobs */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-500/30 blur-3xl"
        animate={{ y: [0, 10, 0], x: [0, 6, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-cyan-400/30 blur-3xl"
        animate={{ y: [0, -10, 0], x: [0, -6, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="flex flex-col items-center justify-center w-full max-w-4xl space-y-8 sm:space-y-10 md:space-y-12 text-center z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Icon */}
        <motion.div variants={itemVariants}>
          <motion.div
            className="relative mb-6"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="absolute inset-0 animate-ping opacity-20">
              <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 mx-auto bg-blue-500 rounded-full"></div>
            </div>
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 mx-auto bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/50">
              <Clock className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-white" />
            </div>
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.h1
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 sm:mb-6"
          variants={itemVariants}
        >
          Coming Soon
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="text-base sm:text-lg md:text-xl text-white/80 max-w-2xl px-4"
          variants={itemVariants}
        >
          We're working hard to bring you something amazing. Stay tuned for our
          grand launch!
        </motion.p>

        {/* Countdown Timer */}
        <motion.div
          className="flex flex-wrap gap-3 sm:gap-4 md:gap-6 justify-center w-full px-4"
          variants={itemVariants}
        >
          <CountdownBox value={timeLeft.days} label="Days" />
          <CountdownBox value={timeLeft.hours} label="Hours" />
          <CountdownBox value={timeLeft.minutes} label="Minutes" />
          <CountdownBox value={timeLeft.seconds} label="Seconds" />
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center justify-center w-full px-4"
          variants={itemVariants}
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/login")}
            className="flex items-center gap-2 bg-white text-blue-600 px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto justify-center"
          >
            <Home className="w-4 h-4 sm:w-5 sm:h-5" />
            Go to Home
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 bg-white/10 backdrop-blur-md text-white border border-white/20 px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-sm sm:text-base shadow-lg hover:bg-white/20 transition-all duration-300 w-full sm:w-auto justify-center"
          >
            <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
            Notify Me
          </motion.button>
        </motion.div>

        {/* Footer Text */}
        <motion.p
          className="text-sm sm:text-base text-white/60 mt-4 sm:mt-6"
          variants={itemVariants}
        >
          Thank you for your patience!
        </motion.p>
      </motion.div>
    </div>
  );
}

