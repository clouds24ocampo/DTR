import { motion } from "framer-motion";
import { Home, ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Error404() {
  const navigate = useNavigate();

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

  const floatingVariants = {
    animate: {
      y: [0, -20, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut" as const,
      },
    },
  };

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
        className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-red-500/30 blur-3xl"
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
        className="flex flex-col items-center justify-center w-full max-w-3xl space-y-6 sm:space-y-8 md:space-y-10 text-center z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* 404 Number */}
        <motion.div
          className="relative"
          variants={floatingVariants}
          animate="animate"
        >
          <motion.h1
            className="text-8xl sm:text-9xl md:text-[12rem] lg:text-[14rem] font-bold text-white/20 select-none"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            404
          </motion.h1>
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gradient-to-br from-red-400 to-orange-400 rounded-full flex items-center justify-center shadow-2xl shadow-red-500/50">
              <Search className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" />
            </div>
          </motion.div>
        </motion.div>

        {/* Error Message */}
        <motion.div variants={itemVariants} className="space-y-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white">
            Page Not Found
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-white/80 max-w-xl px-4">
            Oops! The page you're looking for doesn't exist or has been moved.
            Let's get you back on track.
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center justify-center w-full px-4"
          variants={itemVariants}
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/")}
            className="flex items-center gap-2 bg-white text-blue-600 px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto justify-center"
          >
            <Home className="w-4 h-4 sm:w-5 sm:h-5" />
            Go to Home
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 bg-white/10 backdrop-blur-md text-white border border-white/20 px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-sm sm:text-base shadow-lg hover:bg-white/20 transition-all duration-300 w-full sm:w-auto justify-center"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            Go Back
          </motion.button>
        </motion.div>

        {/* Decorative Elements */}
        <motion.div
          className="flex gap-2 sm:gap-4 mt-4 sm:mt-6"
          variants={itemVariants}
        >
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 sm:w-3 sm:h-3 bg-white/40 rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}

