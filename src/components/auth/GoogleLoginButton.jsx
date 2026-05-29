import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const GoogleLoginButton = ({ onSuccess, onError, rememberMe = true }) => {
  const [loading, setLoading] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [customEmail, setCustomEmail] = useState("");
  const [simulatedRole, setSimulatedRole] = useState("user");

  // Read environment variable
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "your-google-client-id";
  const isMocked = !googleClientId || googleClientId === "your-google-client-id" || googleClientId.includes("your-");

  // Dynamically load Google Identity Services script
  useEffect(() => {
    if (!isMocked) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);

      return () => {
        // Safe cleanup
        const activeScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
        if (activeScript && document.body.contains(activeScript)) {
          document.body.removeChild(activeScript);
        }
      };
    }
  }, [isMocked]);

  const handleGoogleSignIn = () => {
    if (isMocked) {
      // Launch sandbox simulation console
      setShowSimulator(true);
      return;
    }

    if (!window.google?.accounts?.oauth2) {
      if (onError) onError("Google SDK failed to load. Please try again or refresh.");
      return;
    }

    setLoading(true);
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
        callback: (response) => {
          if (response.error) {
            setLoading(false);
            if (onError) onError(response.error_description || "Google Authentication canceled.");
            return;
          }
          if (response.access_token) {
            onSuccess({ accessToken: response.access_token });
          }
        },
      });
      client.requestAccessToken({ prompt: "consent" });
    } catch (err) {
      setLoading(false);
      if (onError) onError(err.message || "Failed to trigger Google Consent.");
    }
  };

  const handleSimulateSuccess = (emailAddress) => {
    setLoading(true);
    setShowSimulator(false);
    
    // Simulate slight latency for premium feel
    setTimeout(() => {
      onSuccess({
        isMock: true,
        email: emailAddress,
      });
      setLoading(false);
    }, 800);
  };

  return (
    <>
      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        type="button"
        className="w-full bg-white hover:bg-surface-off-white border border-outline-variant/30 text-on-surface font-headline font-bold py-3.5 px-4 rounded-2xl transition-all transform active:scale-[0.98] shadow-sm flex items-center justify-center gap-3 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed group relative overflow-hidden"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <span className="text-on-surface-variant font-medium">Authenticating...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.87-4.53-6.01-4.53z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            <span>Continue with Google</span>
          </>
        )}
      </button>

      {/* Glassmorphic Developer Simulator Modal */}
      <AnimatePresence>
        {showSimulator && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white/95 dark:bg-[#0c111d]/95 border border-amber-500/30 p-6 md:p-8 rounded-3xl shadow-2xl max-w-md w-full relative z-50 text-left font-body"
            >
              {/* Simulator Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
                    <span className="material-symbols-outlined text-[24px]">terminal</span>
                  </div>
                  <div>
                    <h3 className="font-headline font-extrabold text-lg text-text-rich-black dark:text-white uppercase tracking-tight">
                      OAuth Simulator
                    </h3>
                    <p className="text-xs text-on-surface-variant">
                      Local Developer Sandbox Environment
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSimulator(false)}
                  className="w-8 h-8 rounded-full bg-outline-variant/10 hover:bg-outline-variant/20 flex items-center justify-center text-outline cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <p className="text-xs text-on-surface-variant leading-relaxed mb-6 border-b border-outline-variant/10 pb-4">
                No Google Developer Client ID environment variable is defined in this workspace. Select a simulation persona or enter a custom address to bypass remote API restrictions:
              </p>

              {/* Persona Options */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => handleSimulateSuccess("tester@gmail.com")}
                  className="w-full p-3.5 bg-surface-off-white/80 border border-outline-variant/20 hover:border-primary rounded-2xl flex items-center justify-between text-left cursor-pointer transition-all hover:shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[18px]">person</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-text-rich-black">tester@gmail.com</p>
                      <p className="text-[10px] text-on-surface-variant font-medium">Standard Nutrition Profile</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
                </button>

                <button
                  onClick={() => handleSimulateSuccess("admin-tester@gmail.com")}
                  className="w-full p-3.5 bg-surface-off-white/80 border border-outline-variant/20 hover:border-primary rounded-2xl flex items-center justify-between text-left cursor-pointer transition-all hover:shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                      <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-text-rich-black">admin-tester@gmail.com</p>
                      <p className="text-[10px] text-on-surface-variant font-medium">Administrative Controls</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
                </button>
              </div>

              {/* Custom Email Input */}
              <div className="space-y-3">
                <label className="block text-[10px] font-bold text-outline uppercase tracking-wider">
                  Custom Simulated Address
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-grow">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                      alternate_email
                    </span>
                    <input
                      type="email"
                      placeholder="custom-user@gmail.com"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-3 bg-white border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-xs font-body outline-none transition-all placeholder:text-outline-variant text-on-surface"
                    />
                  </div>
                  <button
                    disabled={!customEmail || !customEmail.includes("@")}
                    onClick={() => handleSimulateSuccess(customEmail.trim().toLowerCase())}
                    className="bg-amber-600 disabled:bg-outline-variant/20 disabled:text-outline hover:bg-amber-700 text-white font-headline text-xs font-bold px-4 rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer flex items-center"
                  >
                    Simulate
                  </button>
                </div>
              </div>

              <div className="mt-6 border-t border-outline-variant/10 pt-4 text-center">
                <p className="text-[10px] text-amber-600/90 font-headline font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">shield</span>
                  Active Mode: Simulated Developer Loop
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GoogleLoginButton;
