import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import client from "../api/client";
import MacroChart from "../components/MacroChart";
import FoodSearch from "../components/FoodSearch";
import DailyCheckIn from "../components/DailyCheckIn";
import BarcodeScanner from "../components/BarcodeScanner";
import AchievementToast from "../components/AchievementToast";
import {
  LogOut,
  LayoutDashboard,
  Utensils,
  MessageSquare,
  Flame,
  Search,
  Heart,
  User,
  Plus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [log, setLog] = useState({
    totals: { calories: 0, protein: 0, carbs: 0, fats: 0 },
    foodItems: [],
  });
  const [showToast, setShowToast] = useState(false);
  const [showLoggedItems, setShowLoggedItems] = useState(false);

  useEffect(() => {
    fetchTodayLog();
  }, []);

  const fetchTodayLog = async () => {
    try {
      const today = new Date().toISOString();
      const { data } = await client.get(`/api/logs/daily/${today}`);
      setLog(data);
    } catch (err) {
      console.log("No log for today yet");
    }
  };

  const handleAddFood = async (food) => {
    try {
      const payload = {
        date: new Date().toISOString(),
        foodItems: [{ foodId: food._id, servings: 1 }],
      };
      await client.post("/api/logs/daily", payload);
      fetchTodayLog();
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[var(--kcal-cream)] flex flex-col pb-24 lg:pb-0 lg:pl-72">
      {/* Desktop Sidebar Navigation */}
      <nav className="hidden lg:flex fixed left-0 top-0 h-full w-72 bg-[var(--kcal-white)] border-r border-[var(--kcal-green-light)] p-10 flex-col shadow-sm z-30">
        <div className="mb-12">
          <h1 className="text-3xl font-extrabold text-[var(--kcal-green)] tracking-tighter">
            kcal
          </h1>
        </div>

        <div className="flex-1 space-y-2">
          <button className="w-full flex items-center space-x-3 bg-[var(--kcal-green-light)] text-[var(--kcal-green)] px-5 py-4 rounded-[var(--radius-lg)] transition-all font-bold">
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-sm">Dashboard</span>
          </button>
          <button
            onClick={() => navigate("/meal-plan")}
            className="w-full flex items-center space-x-3 text-[var(--kcal-text-muted)] hover:text-[var(--kcal-green)] px-5 py-4 rounded-[var(--radius-lg)] transition-all font-bold"
          >
            <Utensils className="w-5 h-5" />
            <span className="text-sm">Meal Plan</span>
          </button>
          <button
            onClick={() => navigate("/chat")}
            className="w-full flex items-center space-x-3 text-[var(--kcal-text-muted)] hover:text-[var(--kcal-green)] px-5 py-4 rounded-[var(--radius-lg)] transition-all font-bold"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-sm">AI Coach</span>
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="mt-auto w-full flex items-center space-x-3 text-[var(--kcal-text-muted)] hover:text-[var(--kcal-coral)] px-5 py-4 rounded-[var(--radius-lg)] transition-all font-bold"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm">Log Out</span>
        </button>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-[var(--kcal-white)] border-t border-[var(--kcal-green-light)] px-4 py-2 flex justify-between items-center shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-50">
        <button className="kcal-nav-item active">
          <LayoutDashboard className="w-6 h-6" />
        </button>
        <button
          onClick={() => navigate("/meal-plan")}
          className="kcal-nav-item"
        >
          <Utensils className="w-6 h-6" />
        </button>
        <div className="relative -top-8">
          <button className="bg-[var(--kcal-green)] p-5 rounded-full text-white shadow-xl shadow-[#91C788]/40 active:scale-95 transition-all">
            <Plus className="w-7 h-7" />
          </button>
        </div>
        <button onClick={() => navigate("/chat")} className="kcal-nav-item">
          <MessageSquare className="w-6 h-6" />
        </button>
        <button className="kcal-nav-item" onClick={handleLogout}>
          <LogOut className="w-6 h-6" />
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 md:p-10 lg:p-16 overflow-y-auto max-w-7xl mx-auto w-full">
        <AchievementToast
          isVisible={showToast}
          message="Progress updated! Stay healthy."
          onClose={() => setShowToast(false)}
        />

        <header className="mb-12 md:mb-16 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="h-px w-8 bg-[var(--kcal-green)] hidden md:block"></div>
              <h2 className="text-[var(--kcal-green)] font-black text-[10px] md:text-xs uppercase tracking-[0.3em]">
                KCAL Intelligence Platform
              </h2>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-[var(--kcal-text-main)] tracking-tighter leading-[0.95] max-w-3xl">
              Find, track and eat <span className="text-[var(--kcal-green)]">healthy</span> food.
            </h1>
          </div>
          <div className="hidden lg:flex bg-[var(--kcal-white)] border border-[var(--kcal-green-light)] px-8 py-6 rounded-[3rem] items-center space-x-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-[var(--kcal-coral-light)] p-3 rounded-2xl">
              <Flame className="w-6 h-6 text-[var(--kcal-coral)]" />
            </div>
            <div>
              <p className="text-[10px] font-black text-[var(--kcal-text-muted)] uppercase tracking-widest mb-1">Current Momentum</p>
              <p className="font-black text-[var(--kcal-text-main)] text-lg">{user?.streakCount || 1} Day Streak</p>
            </div>
          </div>
        </header>

        <div className="flex flex-col space-y-12 md:space-y-20">
          {/* Top Row: Search & Scan */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            <div className="h-full">
              <FoodSearch onAddFood={handleAddFood} />
            </div>
            <div className="h-full">
              <BarcodeScanner onAddFood={handleAddFood} />
            </div>
          </div>

          {/* Middle Row: Mood Status */}
          <div className="w-full">
            <DailyCheckIn />
          </div>

          {/* Progress Section */}
          <div className="kcal-card flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-black text-[var(--kcal-text-main)] uppercase tracking-tight">
                Nutritional Velocity
              </h3>
              <div className="flex bg-[var(--kcal-coral-light)] px-4 py-2 rounded-full items-center space-x-2">
                <Flame className="w-4 h-4 text-[var(--kcal-coral)]" />
                <span className="font-bold text-[var(--kcal-coral)] text-xs">
                  {user?.streakCount || 1} Day Streak
                </span>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center min-h-[350px] w-full">
              <MacroChart totals={log.totals} />
            </div>
          </div>

          {/* Collapsible Logged Items */}
          <div className="kcal-card p-0 overflow-hidden">
            <button 
              onClick={() => setShowLoggedItems(!showLoggedItems)}
              className="w-full flex items-center justify-between p-6 hover:bg-[var(--kcal-green-light)] transition-colors group"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-[var(--kcal-green-light)] p-3 rounded-xl group-hover:bg-white transition-colors">
                  <Utensils className="w-5 h-5 text-[var(--kcal-green)]" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-black text-[var(--kcal-text-main)] uppercase tracking-tight">
                    Logged Nutrients
                  </h3>
                  <p className="text-[10px] font-bold text-[var(--kcal-text-muted)] uppercase tracking-widest">
                    {log.foodItems?.length || 0} ITEMS CONSUMED TODAY
                  </p>
                </div>
              </div>
              <div className={`p-2 rounded-full border border-[var(--kcal-green-light)] transition-transform duration-300 ${showLoggedItems ? 'rotate-180' : ''}`}>
                <ChevronDown className="w-5 h-5 text-[var(--kcal-green)]" />
              </div>
            </button>

            <motion.div
              initial={false}
              animate={{ height: showLoggedItems ? 'auto' : 0, opacity: showLoggedItems ? 1 : 0 }}
              className="overflow-hidden"
            >
              <div className="p-6 pt-0 border-t border-[var(--kcal-green-light)] bg-[var(--kcal-cream)]/30">
                <div className="space-y-3 mt-6">
                  {log.foodItems?.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-[var(--radius-lg)] border border-dashed border-[var(--kcal-green-light)]">
                      <p className="text-sm text-[var(--kcal-text-muted)] font-medium">
                        Your intake log is empty.
                      </p>
                    </div>
                  )}
                  {log.foodItems?.map((item, idx) => (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={idx}
                      className="flex justify-between items-center bg-white p-4 rounded-[var(--radius-lg)] shadow-sm border border-[var(--kcal-green-light)]/30"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-[var(--kcal-text-main)] text-sm md:text-base">
                          {item.foodId?.name || "Unknown Food"}
                        </span>
                        <span className="text-[10px] text-[var(--kcal-text-muted)] font-bold uppercase tracking-widest">
                          {item.servings} unit{item.servings > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-[var(--kcal-green)] font-black text-sm md:text-base">
                          {item.foodId?.calories
                            ? Math.round(item.foodId.calories * item.servings)
                            : 0}
                        </p>
                        <p className="text-[8px] font-black text-[var(--kcal-text-muted)] uppercase tracking-tighter">KCAL</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
