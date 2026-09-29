import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, Shield } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useAuthStore from "../../../stores/auth/auth.store";
import PasswordStrengthIndicator from "./PasswordStrengthIndicator";

interface ForgotPasswordModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = "email" | "pin" | "reset";

export default function ForgotPasswordModal({
  open,
  onClose,
}: ForgotPasswordModalProps) {
  const {
    requestPasswordResetPin,
    verifyPasswordResetPin,
    resetPassword,
    forgotPasswordLoading,
    verifyPinLoading,
    resetPasswordLoading,
  } = useAuthStore();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    pin?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (open) {
      // Reset state when modal opens
      setStep("email");
      setEmail("");
      setPin(["", "", "", "", "", ""]);
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
    }
  }, [open]);

  useEffect(() => {
    // Focus first PIN input when PIN step is active
    if (step === "pin" && pinInputRefs.current[0]) {
      pinInputRefs.current[0]?.focus();
    }
  }, [step]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!email || !email.includes("@")) {
      setErrors({ email: "Please enter a valid email address" });
      return;
    }

    const success = await requestPasswordResetPin(email);
    if (success) {
      setStep("pin");
    }
  };

  const handlePinChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setErrors({});

    // Auto-focus next input
    if (value && index < 5) {
      pinInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePinPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newPin = pastedData.split("").concat(Array(6 - pastedData.length).fill(""));
      setPin(newPin.slice(0, 6));
      const nextIndex = Math.min(pastedData.length, 5);
      pinInputRefs.current[nextIndex]?.focus();
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const pinString = pin.join("");
    if (pinString.length !== 6) {
      setErrors({ pin: "Please enter the complete 6-digit PIN" });
      return;
    }

    const success = await verifyPasswordResetPin(email, pinString);
    if (success) {
      setStep("reset");
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate password
    if (newPassword.length < 8) {
      setErrors({ password: "Password must be at least 8 characters long" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    const pinString = pin.join("");
    const success = await resetPassword(email, pinString, newPassword);
    if (success) {
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  if (!open) return null;

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 !mt-0 overflow-y-auto">
        <motion.div
          className="absolute inset-0 bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          aria-hidden
        />
        <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4 min-h-screen">
          <motion.div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8">
              {/* Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {step === "email" && "Forgot Password"}
                  {step === "pin" && "Enter Verification PIN"}
                  {step === "reset" && "Reset Password"}
                </h2>
                <p className="text-sm text-gray-600">
                  {step === "email" &&
                    "Enter your email address to receive a verification PIN"}
                  {step === "pin" &&
                    "We've sent a 6-digit PIN to your email address"}
                  {step === "reset" &&
                    "Enter your new password below"}
                </p>
              </div>

              {/* Progress Steps */}
              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step === "email"
                        ? "bg-blue-600 text-white"
                        : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                  </div>
                  <div
                    className={`h-1 w-12 ${
                      step === "pin" || step === "reset"
                        ? "bg-blue-600"
                        : "bg-gray-300"
                    }`}
                  />
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step === "pin"
                        ? "bg-blue-600 text-white"
                        : step === "reset"
                        ? "bg-blue-100 text-blue-600"
                        : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                  </div>
                  <div
                    className={`h-1 w-12 ${
                      step === "reset" ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  />
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step === "reset"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Step 1: Email */}
              <AnimatePresence mode="wait">
                {step === "email" && (
                  <motion.form
                    key="email"
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    onSubmit={handleEmailSubmit}
                    className="space-y-4"
                  >
                    <div>
                      <label
                        htmlFor="reset-email"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Email address
                      </label>
                      <input
                        id="reset-email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setErrors({});
                        }}
                        className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                          errors.email ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Enter your email"
                        autoComplete="email"
                        required
                      />
                      {errors.email && (
                        <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                      )}
                    </div>

                    <div className="flex space-x-3 pt-2">
                      <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={forgotPasswordLoading}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                      >
                        {forgotPasswordLoading ? (
                          "Sending..."
                        ) : (
                          <>
                            Continue
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </button>
                    </div>
                  </motion.form>
                )}

                {/* Step 2: PIN */}
                {step === "pin" && (
                  <motion.form
                    key="pin"
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    onSubmit={handlePinSubmit}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                        Enter 6-digit PIN
                      </label>
                      <div className="flex justify-center space-x-2">
                        {pin.map((digit, index) => (
                          <input
                            key={index}
                            ref={(el) => (pinInputRefs.current[index] = el)}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handlePinChange(index, e.target.value)}
                            onKeyDown={(e) => handlePinKeyDown(index, e)}
                            onPaste={index === 0 ? handlePinPaste : undefined}
                            className={`w-12 h-12 text-center text-xl font-semibold border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              errors.pin
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                            required
                          />
                        ))}
                      </div>
                      {errors.pin && (
                        <p className="mt-2 text-xs text-red-600 text-center">
                          {errors.pin}
                        </p>
                      )}
                    </div>

                    <div className="flex space-x-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setStep("email");
                          setPin(["", "", "", "", "", ""]);
                          setErrors({});
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={verifyPinLoading || pin.join("").length !== 6}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                      >
                        {verifyPinLoading ? (
                          "Verifying..."
                        ) : (
                          <>
                            Verify
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </button>
                    </div>
                  </motion.form>
                )}

                {/* Step 3: Reset Password */}
                {step === "reset" && (
                  <motion.form
                    key="reset"
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    onSubmit={handlePasswordSubmit}
                    className="space-y-4"
                  >
                    <div>
                      <label
                        htmlFor="new-password"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          id="new-password"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => {
                            setNewPassword(e.target.value);
                            setErrors({});
                          }}
                          className={`w-full px-3 py-2 pr-10 border rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                            errors.password ? "border-red-500" : "border-gray-300"
                          }`}
                          placeholder="Enter new password"
                          autoComplete="new-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          aria-label={
                            showNewPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="mt-1 text-xs text-red-600">{errors.password}</p>
                      )}
                      <PasswordStrengthIndicator password={newPassword} />
                    </div>

                    <div>
                      <label
                        htmlFor="confirm-password"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setErrors({});
                          }}
                          className={`w-full px-3 py-2 pr-10 border rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                            errors.confirmPassword
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                          placeholder="Confirm new password"
                          autoComplete="new-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          aria-label={
                            showConfirmPassword
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.confirmPassword}
                        </p>
                      )}
                      {confirmPassword &&
                        newPassword === confirmPassword &&
                        !errors.confirmPassword && (
                          <p className="mt-1 text-xs text-green-600">
                            Passwords match
                          </p>
                        )}
                    </div>

                    <div className="flex space-x-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setStep("pin");
                          setNewPassword("");
                          setConfirmPassword("");
                          setErrors({});
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={
                          resetPasswordLoading ||
                          !newPassword ||
                          !confirmPassword ||
                          newPassword !== confirmPassword
                        }
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {resetPasswordLoading ? "Resetting..." : "Reset Password"}
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}

