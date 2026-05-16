import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { motion } from "framer-motion";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await login(email, password);
      navigate(data.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || "Failed to login");
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
          <h1 className="text-4xl font-extrabold text-(--kcal-green) tracking-tighter">
            kcal
          </h1>
        </div>

        {/* Illustration */}
        <div className="w-full max-w-[280px] mb-8">
          <img
            src="/kcal_tracking_illustration_1778871907710.png"
            alt="Track Health"
            className="w-full h-auto"
          />
        </div>

        <div className="text-center mb-10 px-4">
          <h2 className="text-2xl font-bold mb-3 text-(--kcal-text-main)">
            Track Your Health
          </h2>
          <p className="text-(--kcal-text-muted) text-sm leading-relaxed max-w-[280px] mx-auto">
            With smart tools you can track your progress and stay on target.
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
              required
            />
          </div>
          <div className="pt-4">
            <button type="submit" className="kcal-btn-primary w-full">
              Log In
            </button>
          </div>
        </form>

        <p className="text-center text-(--kcal-text-muted) mt-10 text-xs font-bold uppercase tracking-widest">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-(--kcal-green) hover:underline ml-1"
          >
            Register
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
