import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import client from "../api/client";

// Step 1: enter email → fetch question
// Step 2: question is displayed → enter answer → verify → navigate to reset

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  // Step 1 state
  const [email, setEmail] = useState("");
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  // Step 2 state (question fetched from server)
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  // Step 1: fetch the plain-text security question for the given email
  const handleFetchQuestion = async (e) => {
    e.preventDefault();
    setFetchLoading(true);
    setFetchError("");
    try {
      const { data } = await client.post("/api/users/get-security-question", { email });
      setSecurityQuestion(data.securityQuestion);
      setStep(2);
    } catch (err) {
      setFetchError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setFetchLoading(false);
    }
  };

  // Step 2: verify answer and navigate to reset password
  const handleVerifyAnswer = async (e) => {
    e.preventDefault();
    setVerifyLoading(true);
    setVerifyError("");
    try {
      const { data } = await client.post("/api/users/verify-security-recovery", {
        email,
        securityAnswer: answer,
      });
      navigate(`/reset-password/${data.resetToken}`);
    } catch (err) {
      setVerifyError(err.response?.data?.message || "Incorrect answer. Please try again.");
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-surface-off-white px-4 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-white border border-outline-variant/30 backdrop-blur-md p-8 md:p-10 rounded-3xl shadow-xl z-10"
      >
        {/* Branding */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_4px_16px_rgba(58,105,55,0.25)]">
            <span className="material-symbols-outlined text-white text-[24px]">spa</span>
          </div>
          <span className="font-headline text-xl md:text-2xl font-black text-primary tracking-tight">
            Mezan میزان
          </span>
        </div>

        {/* Step progress pills */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${
                step >= s
                  ? "bg-primary text-white shadow-[0_2px_8px_rgba(58,105,55,0.3)]"
                  : "bg-outline-variant/20 text-on-surface-variant"
              }`}>
                {step > s
                  ? <span className="material-symbols-outlined text-[14px]">check</span>
                  : s}
              </div>
              {s < 2 && (
                <div className={`w-12 h-0.5 rounded-full transition-all duration-300 ${step > s ? "bg-primary" : "bg-outline-variant/30"}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ── STEP 1: Enter Email ── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.25 }}
            >
              <div className="text-center mb-6">
                <h2 className="font-headline text-xl font-bold text-text-rich-black tracking-tight">
                  Recover Your Account
                </h2>
                <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">
                  Enter your registered email to retrieve your security question.
                </p>
              </div>

              {fetchError && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[#FFF0F0] border border-[#FF8E8E] text-[#D94E4E] p-4 rounded-2xl mb-5 text-sm font-semibold flex items-start gap-3"
                >
                  <span className="material-symbols-outlined flex-shrink-0 text-[20px]">error</span>
                  <span>{fetchError}</span>
                </motion.div>
              )}

              <form onSubmit={handleFetchQuestion} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2" htmlFor="fp-email">
                    Email Address
                  </label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-[20px]">
                      mail
                    </span>
                    <input
                      id="fp-email"
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={fetchLoading}
                      className="w-full pl-10 pr-4 py-3.5 bg-white border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body text-sm text-on-surface placeholder:text-outline-variant outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={fetchLoading || !email.trim()}
                  className={`w-full font-headline font-bold py-4 rounded-2xl transition-all transform shadow-lg flex items-center justify-center gap-2 ${
                    !fetchLoading && email.trim()
                      ? "bg-primary hover:bg-primary/95 text-white active:scale-[0.98] cursor-pointer"
                      : "bg-outline-variant/20 text-outline cursor-not-allowed"
                  }`}
                >
                  {fetchLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Looking up account...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                      <span>Continue</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* ── STEP 2: Display Question, Collect Answer ── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
            >
              <div className="text-center mb-6">
                <h2 className="font-headline text-xl font-bold text-text-rich-black tracking-tight">
                  Answer Your Question
                </h2>
                <p className="text-xs text-on-surface-variant mt-1">
                  Recovering access for <strong className="text-text-rich-black">{email}</strong>
                </p>
              </div>

              {/* Display the fetched security question */}
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-6">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">shield_lock</span>
                  Your Security Question
                </p>
                <p className="text-base font-bold text-text-rich-black leading-snug">
                  {securityQuestion}
                </p>
              </div>

              {verifyError && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[#FFF0F0] border border-[#FF8E8E] text-[#D94E4E] p-4 rounded-2xl mb-5 text-sm font-semibold flex items-start gap-3"
                >
                  <span className="material-symbols-outlined flex-shrink-0 text-[20px]">error</span>
                  <span>{verifyError}</span>
                </motion.div>
              )}

              <form onSubmit={handleVerifyAnswer} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2" htmlFor="fp-answer">
                    Your Answer
                  </label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-[20px]">
                      lock
                    </span>
                    <input
                      id="fp-answer"
                      type="text"
                      required
                      autoFocus
                      placeholder="Type your answer..."
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      disabled={verifyLoading}
                      className="w-full pl-10 pr-4 py-3.5 bg-white border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body text-sm text-on-surface placeholder:text-outline-variant outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-1.5 ml-1">
                    Answers are case-insensitive. Spacing is ignored.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setAnswer(""); setVerifyError(""); }}
                    className="flex-shrink-0 border border-outline-variant/30 text-on-surface-variant hover:text-primary hover:border-primary font-bold py-4 px-4 rounded-2xl transition-all text-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={verifyLoading || !answer.trim()}
                    className={`flex-1 font-headline font-bold py-4 rounded-2xl transition-all transform shadow-lg flex items-center justify-center gap-2 ${
                      !verifyLoading && answer.trim()
                        ? "bg-primary hover:bg-primary/95 text-white active:scale-[0.98] cursor-pointer"
                        : "bg-outline-variant/20 text-outline cursor-not-allowed"
                    }`}
                  >
                    {verifyLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[20px]">verified_user</span>
                        <span>Verify &amp; Reset Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

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

export default ForgotPassword;
