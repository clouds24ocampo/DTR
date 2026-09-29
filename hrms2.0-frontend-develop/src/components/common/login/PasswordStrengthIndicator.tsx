import { motion } from "framer-motion";

type PasswordStrength = "weak" | "fair" | "good" | "strong";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export default function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  const calculateStrength = (pwd: string): PasswordStrength => {
    if (pwd.length === 0) return "weak";
    
    let strength = 0;
    
    // Length check
    if (pwd.length >= 8) strength += 1;
    if (pwd.length >= 12) strength += 1;
    
    // Character variety checks
    if (/[a-z]/.test(pwd)) strength += 1;
    if (/[A-Z]/.test(pwd)) strength += 1;
    if (/[0-9]/.test(pwd)) strength += 1;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength += 1;
    
    if (strength <= 2) return "weak";
    if (strength === 3) return "fair";
    if (strength === 4) return "good";
    return "strong";
  };

  const getStrengthColor = (strength: PasswordStrength) => {
    switch (strength) {
      case "weak":
        return "bg-red-500";
      case "fair":
        return "bg-yellow-500";
      case "good":
        return "bg-blue-500";
      case "strong":
        return "bg-green-500";
      default:
        return "bg-gray-300";
    }
  };

  const getStrengthText = (strength: PasswordStrength) => {
    switch (strength) {
      case "weak":
        return "Weak";
      case "fair":
        return "Fair";
      case "good":
        return "Good";
      case "strong":
        return "Strong";
      default:
        return "";
    }
  };

  const getStrengthWidth = (strength: PasswordStrength) => {
    switch (strength) {
      case "weak":
        return "25%";
      case "fair":
        return "50%";
      case "good":
        return "75%";
      case "strong":
        return "100%";
      default:
        return "0%";
    }
  };

  const strength = calculateStrength(password);

  if (password.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">Password strength:</span>
        <span
          className={`font-medium ${
            strength === "weak"
              ? "text-red-600"
              : strength === "fair"
              ? "text-yellow-600"
              : strength === "good"
              ? "text-blue-600"
              : "text-green-600"
          }`}
        >
          {getStrengthText(strength)}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
        <motion.div
          className={`h-full ${getStrengthColor(strength)}`}
          initial={{ width: "0%" }}
          animate={{ width: getStrengthWidth(strength) }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
      <div className="text-xs text-gray-500 mt-1">
        {password.length < 8 && "At least 8 characters"}
        {password.length >= 8 &&
          !/[A-Z]/.test(password) &&
          "Include uppercase letters"}
        {password.length >= 8 &&
          /[A-Z]/.test(password) &&
          !/[0-9]/.test(password) &&
          "Include numbers"}
        {password.length >= 8 &&
          /[A-Z]/.test(password) &&
          /[0-9]/.test(password) &&
          !/[^a-zA-Z0-9]/.test(password) &&
          "Include special characters"}
        {strength === "strong" && "Password is strong!"}
      </div>
    </div>
  );
}

