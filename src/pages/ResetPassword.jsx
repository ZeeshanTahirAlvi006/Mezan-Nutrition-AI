import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import client from "../api/client";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Real-time strength criteria states
  const [criteria, setCriteria] = useState({
    minLength: false,
    lowercase: false,
    uppercase: false,
    number: false,
    specialChar: false,
  });

  useEffect(() => {
    setCriteria({
      minLength: password.length >= 12,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      specialChar: /[^A-Za-z0-9]/.test(password),
    });
  }, [password]);

  const allCriteriaMet = Object.values(criteria).every(Boolean);
  const passwordsMatch = password && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allCriteriaMet) {
      setError("Please ensure all password criteria are satisfied.");
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await client.post(`/api/users/reset-password/${token}`, { password });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired reset token.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-surface-off-white px-4 relative overflow-hidden">
      {/* Background ambient light effects */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-white border border-outline-variant/30 backdrop-blur-md p-8 md:p-10 rounded-3xl shadow-xl z-10"
      >
        {/* Branding Header */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_4px_16px_rgba(58,105,55,0.25)]">
            <span className="material-symbols-outlined text-white text-[24px]">spa</span>
          </div>
          <span className="font-headline text-xl md:text-2xl font-black text-primary tracking-tight">
            Mezan میزان
          </span>
        </div>

        {/* Content Section */}
        <div className="text-center mb-8">
          <h2 className="font-headline text-2xl font-bold text-text-rich-black mb-2 tracking-tight">
            Reset Password
          </h2>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Please enter your new credentials below to securely finalize your password recovery.
          </p>
        </div>

        {/* Success / Error Banners */}
        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-primary/10 border border-primary/30 text-primary p-5 rounded-2xl mb-6 text-sm font-semibold flex flex-col gap-4"
          >
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined flex-shrink-0 text-[22px]">check_circle</span>
              <div>
                <p className="font-headline font-bold text-sm">Reset Successful</p>
                <p className="font-normal text-xs text-on-surface-variant mt-1">
                  Your password has been successfully updated. You can now log in using your new credentials.
                </p>
              </div>
            </div>
            <Link
              to="/login"
              className="w-full bg-primary hover:bg-primary/95 text-white font-headline text-center py-3 rounded-xl transition-all shadow-md font-bold text-xs"
            >
              Go to Login Page
            </Link>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#FFF0F0] border border-[#FF8E8E] text-[#D94E4E] p-4 rounded-2xl mb-6 text-sm font-semibold flex items-start gap-3"
          >
            <span className="material-symbols-outlined flex-shrink-0 text-[20px]">error</span>
            <span>{error}</span>
          </motion.div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2" htmlFor="password">
                New Password
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-[20px]">
                  lock
                </span>
                <input
                  className="w-full pl-10 pr-12 py-3.5 bg-white border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body text-sm text-on-surface placeholder:text-outline-variant outline-none"
                  id="password"
                  placeholder="••••••••"
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors cursor-pointer flex items-center justify-center"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-[20px]">
                  lock_reset
                </span>
                <input
                  className="w-full pl-10 pr-4 py-3.5 bg-white border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body text-sm text-on-surface placeholder:text-outline-variant outline-none"
                  id="confirmPassword"
                  placeholder="••••••••"
                  required
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Criteria Checklist */}
            <div className="bg-surface-off-white/50 border border-outline-variant/15 p-4 rounded-2xl space-y-2.5">
              <p className="text-[10px] font-bold text-outline uppercase tracking-widest mb-1">
                Password Requirements
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* 12 Chars */}
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-[16px] ${criteria.minLength ? "text-primary" : "text-outline"}`}>
                    {criteria.minLength ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <span className={criteria.minLength ? "text-primary font-medium" : "text-on-surface-variant"}>
                    Min 12 characters
                  </span>
                </div>

                {/* Uppercase */}
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-[16px] ${criteria.uppercase ? "text-primary" : "text-outline"}`}>
                    {criteria.uppercase ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <span className={criteria.uppercase ? "text-primary font-medium" : "text-on-surface-variant"}>
                    Uppercase letter
                  </span>
                </div>

                {/* Lowercase */}
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-[16px] ${criteria.lowercase ? "text-primary" : "text-outline"}`}>
                    {criteria.lowercase ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <span className={criteria.lowercase ? "text-primary font-medium" : "text-on-surface-variant"}>
                    Lowercase letter
                  </span>
                </div>

                {/* Number */}
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-[16px] ${criteria.number ? "text-primary" : "text-outline"}`}>
                    {criteria.number ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <span className={criteria.number ? "text-primary font-medium" : "text-on-surface-variant"}>
                    Numeric digit
                  </span>
                </div>

                {/* Special Char */}
                <div className="flex items-center gap-2 sm:col-span-2">
                  <span className={`material-symbols-outlined text-[16px] ${criteria.specialChar ? "text-primary" : "text-outline"}`}>
                    {criteria.specialChar ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <span className={criteria.specialChar ? "text-primary font-medium" : "text-on-surface-variant"}>
                    Special character (e.g. ! @ # $)
                  </span>
                </div>
              </div>

              {/* Matching Status */}
              {password && (
                <div className="border-t border-outline-variant/15 pt-2 mt-2 flex items-center gap-2 text-xs">
                  <span className={`material-symbols-outlined text-[16px] ${passwordsMatch ? "text-primary" : "text-[#D94E4E]"}`}>
                    {passwordsMatch ? "link" : "link_off"}
                  </span>
                  <span className={passwordsMatch ? "text-primary font-medium" : "text-[#D94E4E]"}>
                    {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                  </span>
                </div>
              )}
            </div>

            {/* Reset Button */}
            <button
              className={`w-full font-headline font-bold py-4 rounded-2xl transition-all transform shadow-lg mt-4 cursor-pointer flex items-center justify-center gap-2 ${
                allCriteriaMet && passwordsMatch
                  ? "bg-primary hover:bg-primary/95 hover:shadow-md text-white active:scale-[0.98]"
                  : "bg-outline-variant/20 text-outline cursor-not-allowed"
              }`}
              type="submit"
              disabled={loading || !allCriteriaMet || !passwordsMatch}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Updating Password...</span>
                </>
              ) : (
                <span>Confirm Reset</span>
              )}
            </button>
          </form>
        )}

        {/* Back to Login */}
        <div className="mt-8 text-center border-t border-outline-variant/20 pt-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors font-bold"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Back to Login</span>
          </Link>
        </div>
      </motion.div>
    </main>
  );
};

export default ResetPassword;
