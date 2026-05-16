import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import client from "../api/client";
import { motion } from "framer-motion";
import { validatePassword } from "../utils/validatePassword";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="min-h-screen bg-(--kcal-cream) flex items-center justify-center p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="kcal-card w-full max-w-lg overflow-hidden flex flex-col items-center"
      >
        {/* kcal Brand Logo */}
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-(--kcal-green) tracking-tighter">kcal</h1>
        </div>

        {/* Illustration */}
        <div className="w-full max-w-[280px] mb-8">
          <img 
            src="/kcal_healthy_illustration_1778871865032.png" 
            alt="Healthy Life" 
            className="w-full h-auto"
          />
        </div>

        <div className="text-center mb-10 px-4">
          <h2 className="text-2xl font-bold mb-3 text-(--kcal-text-main)">Eat Healthy</h2>
          <p className="text-(--kcal-text-muted) text-sm leading-relaxed max-w-[280px] mx-auto">
            Maintaining good health should be the primary focus of everyone.
          </p>
        </div>

        {error && (
          <div className="bg-(--kcal-coral-light) border border-(--kcal-coral) text-(--kcal-coral) p-4 rounded-[var(--radius-lg)] mb-8 text-xs font-bold w-full">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 w-full">
          <div>
            <input
              type="email"
              className="kcal-input"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <input
              type="password"
              className="kcal-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={12}
              autoComplete="new-password"
              required
            />
            <p className="text-(--kcal-text-muted) text-xs mt-2 leading-relaxed">
              At least 12 characters with uppercase, lowercase, a number, and a symbol (any symbol is fine).
            </p>
          </div>
          <div className="pt-4">
            <button
              type="submit"
              className="kcal-btn-primary w-full"
            >
              Get Started
            </button>
          </div>
        </form>

        <p className="text-center text-(--kcal-text-muted) mt-10 text-xs font-bold uppercase tracking-widest">
          Already Have An Account?{" "}
          <Link to="/login" className="text-(--kcal-green) hover:underline ml-1">
            Log In
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
