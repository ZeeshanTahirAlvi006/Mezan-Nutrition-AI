import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import client from "../api/client";
import { motion } from "framer-motion";
import { validatePassword } from "../utils/validatePassword";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    try {
      await client.post("/api/users/register", { email, password });
      await login(email, password);
      navigate("/onboarding"); 
    } catch (err) {
      setError(err.response?.data?.message || "Failed to register");
    }
  };

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-surface-off-white">
      {/* Hero Section */}
      <section className="relative w-full md:w-1/2 min-h-[353px] md:min-h-screen overflow-hidden">
        <img 
          className="absolute inset-0 w-full h-full object-cover" 
          alt="A serene and bright lifestyle photography scene showing fresh organic vegetables"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAINVVgM3Fn4kwgwDtFOQAKwFFM6N2SnApj97JfMYLLy5iNREdKJ4Dw4dRgoHf2PdCOeHEMap3-dznNZJoYOe50WQ-jXmQpz9gBegKCO_GObxhlAEO_RMm1ounUZ6SGpMnILW3SvXjOpYUhwQ1Y2QV0xPmxR2QDqA1vW0GB27c4AlzJCqbjraW4zH72NIDp2hJie2BEsHivQnn3JdYmoOfj-8IOWUBNU748CuunpDfND15Jui5RTNOOqyCIC1aW8xy8-HSBUnC-A-kG"
        />
        <div className="absolute inset-0 bg-primary/15 backdrop-blur-[1px]"></div>
        
        {/* Decorative Sun rays / morning lighting effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-white/10 pointer-events-none"></div>

        <div className="absolute bottom-0 left-0 p-6 md:p-12 z-10 w-full">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-surface-container-lowest/90 backdrop-blur-md p-6 md:p-8 rounded-2xl shadow-xl max-w-sm"
          >
            <h1 className="font-headline text-2xl md:text-3xl font-extrabold text-primary mb-2 tracking-tight">
              Clinical Wellness AI
            </h1>
            <p className="text-sm md:text-base text-on-surface-variant leading-relaxed">
              Precision nutrition and clinical wellness insights designed for your daily journey.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Register Form Section */}
      <section className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-24 bg-surface-off-white">
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Branding */}
          <div className="mb-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_4px_16px_rgba(58,105,55,0.25)]">
              <span className="material-symbols-outlined text-white text-[24px]">spa</span>
            </div>
            <span className="font-headline text-xl md:text-2xl font-black text-primary tracking-tight">
              Mezan میزان
            </span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="font-headline text-2xl md:text-3xl font-bold text-text-rich-black mb-2 tracking-tight">
              Create Your Account
            </h2>
            <p className="text-sm text-on-surface-variant">
              Precision nutrition starts with a personalized biological profile.
            </p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#FFF0F0] border border-[#FF8E8E] text-[#D94E4E] p-4 rounded-xl mb-6 text-sm font-semibold"
            >
              {error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2" htmlFor="email">
                EMAIL ADDRESS
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-[20px]">
                  mail
                </span>
                <input 
                  className="w-full pl-10 pr-4 py-3.5 bg-white border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body text-sm text-on-surface placeholder:text-outline-variant outline-none" 
                  id="email" 
                  name="email" 
                  placeholder="name@example.com" 
                  required 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2" htmlFor="password">
                PASSWORD
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-[20px]">
                  lock
                </span>
                <input 
                  className="w-full pl-10 pr-12 py-3.5 bg-white border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body text-sm text-on-surface placeholder:text-outline-variant outline-none" 
                  id="password" 
                  name="password" 
                  placeholder="••••••••" 
                  required 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={12}
                  autoComplete="new-password"
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
              <p className="text-xs text-on-surface-variant mt-2 leading-relaxed font-medium">
                At least 12 characters with uppercase, lowercase, a number, and a symbol.
              </p>
            </div>

            <button 
              className="w-full bg-primary hover:bg-primary/95 hover:shadow-md text-white font-headline font-bold py-4 rounded-2xl transition-all transform active:scale-[0.98] shadow-lg mt-4 cursor-pointer" 
              type="submit"
            >
              Get Started
            </button>
          </form>

          {/* Login Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-on-surface-variant">
              Already have an account? 
              <Link className="text-primary font-bold hover:underline ml-1.5" to="/login">
                Log In
              </Link>
            </p>
          </div>
        </motion.div>
      </section>

      {/* Contextual Health Tip (Minimalist Overlay) */}
      <div className="fixed bottom-6 right-6 hidden md:block z-50">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-white border border-outline-variant/30 p-4 rounded-xl shadow-lg max-w-[280px] flex items-start gap-3"
        >
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-on-primary-container text-[18px]">lightbulb</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-primary mb-0.5 uppercase tracking-widest">HEALTH TIP</p>
            <p className="text-xs leading-normal text-on-surface-variant font-medium">Tracking your macros daily increases weight loss success by 40%.</p>
          </div>
        </motion.div>
      </div>
    </main>
  );
};

export default Register;

