import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import client from "../api/client";
import MacroChart from "../components/MacroChart";
import FoodSearch from "../components/FoodSearch";
import DailyCheckIn from "../components/DailyCheckIn";
import BarcodeScanner from "../components/BarcodeScanner";
import AchievementToast from "../components/AchievementToast";
import TopAppBar from "../components/layout/TopAppBar";
import BottomNav from "../components/layout/BottomNav";
import PantryManager from "../components/PantryManager";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const Dashboard = () => {
  const { user, logout, refreshUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [log, setLog] = useState({
    totals: { calories: 0, protein: 0, carbs: 0, fats: 0 },
    foodItems: [],
  });
  const [showToast, setShowToast] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchTodayLog();
    refreshUser();
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
      refreshUser();
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

  // Calculate percentages for progress rings
  const calorieGoal = user?.targetCalories || 2000;
  const proteinGoal = user?.proteinGoal || 150;
  const carbsGoal = user?.carbsGoal || 250;
  const fatsGoal = user?.fatsGoal || 65;

  const caloriePct = Math.min(100, Math.round((log.totals.calories / calorieGoal) * 100));
  const proteinPct = Math.min(100, Math.round((log.totals.protein / proteinGoal) * 100));
  const carbsPct = Math.min(100, Math.round((log.totals.carbs / carbsGoal) * 100));
  const fatsPct = Math.min(100, Math.round((log.totals.fats / fatsGoal) * 100));

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="min-h-screen bg-surface-off-white flex flex-col">
      {/* Top App Bar */}
      <TopAppBar />

      {/* Main Content */}
      <main className="flex-1 pt-16 pb-24 md:pb-8">
        <div className="max-w-[1200px] mx-auto px-[24px] md:px-8 space-y-[32px] mt-6">

          <AchievementToast
            isVisible={showToast}
            message="Progress updated! Stay healthy."
            onClose={() => setShowToast(false)}
          />

          {/* Greeting */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-1"
          >
            <h1 className="font-headline text-2xl md:text-[32px] font-semibold text-text-rich-black leading-tight tracking-tight">
              {getGreeting()}, {user?.name?.split(' ')[0] || 'there'} 👋
            </h1>
            <p className="text-sm md:text-base text-on-surface-variant">
              Here's your nutrition summary for today.
            </p>
          </motion.section>

          {/* ════ Daily Calories Card ════ */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-surface-container-lowest rounded-2xl p-6 card-shadow-soft border border-outline-variant/30"
          >
            <div className="flex items-center gap-2 mb-5">
              <span className="material-symbols-outlined text-primary">local_fire_department</span>
              <h2 className="font-headline text-lg font-semibold text-on-surface">Daily Calories</h2>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Circular Progress Ring */}
              <div className="relative w-44 h-44 md:w-52 md:h-52 flex-shrink-0">
                <div
                  className="w-full h-full rounded-full flex items-center justify-center circular-progress"
                  style={{
                    '--progress-pct': `${caloriePct}%`,
                    '--progress-color': '#3a6937',
                  }}
                >
                  <div className="text-center">
                    <p className="font-headline text-3xl md:text-4xl font-bold text-text-rich-black leading-none">
                      {Math.round(log.totals.calories)}
                    </p>
                    <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-widest mt-1">
                      of {calorieGoal.toLocaleString()} kcal
                    </p>
                  </div>
                </div>
              </div>

              {/* Calorie info text */}
              <div className="flex-1 text-center md:text-left space-y-3">
                <p className="text-sm md:text-base text-on-surface-variant leading-relaxed">
                  You've consumed <span className="font-bold text-primary">{Math.round(log.totals.calories)}</span> of your <span className="font-bold text-text-rich-black">{calorieGoal.toLocaleString()}</span> kcal goal today.
                  {caloriePct < 50 ? " Keep going!" : caloriePct < 90 ? " Great progress!" : " Almost there!"}
                </p>
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <div className="bg-primary-container/20 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[16px]">trending_up</span>
                    <span className="text-xs font-bold text-primary">{user?.streakCount ?? 0} Day Streak</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* ════ Macro Breakdown Grid ════ */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {/* Protein Card */}
            <div className="bg-surface-container-lowest rounded-xl p-5 card-shadow-soft border border-outline-variant/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-data-protein"></div>
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Protein</span>
                </div>
                <span className="font-headline text-lg font-bold text-text-rich-black">{Math.round(log.totals.protein)}g</span>
              </div>
              <div className="w-full h-2.5 bg-surface-container-low rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${proteinPct}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="h-full bg-data-protein rounded-full"
                />
              </div>
              <p className="text-[11px] text-on-surface-variant mt-2 font-medium">
                {Math.round(log.totals.protein)} / {proteinGoal}g
              </p>
            </div>

            {/* Carbs Card */}
            <div className="bg-surface-container-lowest rounded-xl p-5 card-shadow-soft border border-outline-variant/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-data-carbs"></div>
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Carbs</span>
                </div>
                <span className="font-headline text-lg font-bold text-text-rich-black">{Math.round(log.totals.carbs)}g</span>
              </div>
              <div className="w-full h-2.5 bg-surface-container-low rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${carbsPct}%` }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="h-full bg-data-carbs rounded-full"
                />
              </div>
              <p className="text-[11px] text-on-surface-variant mt-2 font-medium">
                {Math.round(log.totals.carbs)} / {carbsGoal}g
              </p>
            </div>

            {/* Fats Card */}
            <div className="bg-surface-container-lowest rounded-xl p-5 card-shadow-soft border border-outline-variant/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-data-fats"></div>
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Fats</span>
                </div>
                <span className="font-headline text-lg font-bold text-text-rich-black">{Math.round(log.totals.fats)}g</span>
              </div>
              <div className="w-full h-2.5 bg-surface-container-low rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${fatsPct}%` }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="h-full bg-data-fats rounded-full"
                />
              </div>
              <p className="text-[11px] text-on-surface-variant mt-2 font-medium">
                {Math.round(log.totals.fats)} / {fatsGoal}g
              </p>
            </div>
          </motion.section>

          {/* ════ Tab Switch: Overview / Search / Check-in ════ */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-[24px] px-[24px]">
            {[
              { key: "overview", icon: "bar_chart", label: "Overview" },
              { key: "pantry", icon: "kitchen", label: "My Pantry" },
              { key: "search", icon: "search", label: "Search Food" },
              { key: "scan", icon: "qr_code_scanner", label: "Barcode" },
              { key: "checkin", icon: "mood", label: "Check-in" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-primary text-on-primary shadow-sm"
                    : "bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ════ Tab Content ════ */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {activeTab === "overview" && (
              <div className="space-y-[32px]">
                {/* Nutritional Velocity Chart */}
                <div className="bg-surface-container-lowest rounded-2xl p-6 card-shadow-soft border border-outline-variant/30">
                  <h3 className="font-headline text-base font-semibold text-on-surface mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">analytics</span>
                    Nutritional Velocity
                  </h3>
                  <div className="min-h-[300px] w-full flex items-center justify-center">
                    <MacroChart totals={log.totals} />
                  </div>
                </div>

                {/* Recent Meals / Logged Items */}
                <div className="bg-surface-container-lowest rounded-2xl card-shadow-soft border border-outline-variant/30 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/20">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">restaurant</span>
                      <h3 className="font-headline text-base font-semibold text-on-surface">Recent Meals</h3>
                    </div>
                    <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-widest">
                      {log.foodItems?.length || 0} items
                    </span>
                  </div>

                  <div className="divide-y divide-outline-variant/15">
                    {log.foodItems?.length === 0 && (
                      <div className="text-center py-10 px-6">
                        <span className="material-symbols-outlined text-outline-variant text-[40px] mb-3 block">lunch_dining</span>
                        <p className="text-sm text-on-surface-variant font-medium">
                          No meals logged yet today.
                        </p>
                        <p className="text-xs text-outline mt-1">Search for food above to start tracking.</p>
                      </div>
                    )}
                    {log.foodItems?.map((item, idx) => (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={idx}
                        className="flex items-center justify-between px-5 py-4 hover:bg-surface-container-low/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary-container/15 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-primary text-[20px]">nutrition</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-text-rich-black">
                              {item.foodId?.name || "Unknown Food"}
                            </p>
                            <p className="text-[11px] text-on-surface-variant font-medium">
                              {item.servings} serving{item.servings > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-headline text-sm font-bold text-primary">
                            {item.foodId?.calories
                              ? Math.round(item.foodId.calories * item.servings)
                              : 0}
                          </p>
                          <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">kcal</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "pantry" && (
              <PantryManager />
            )}

            {activeTab === "search" && (
              <div className="bg-surface-container-lowest rounded-2xl p-5 card-shadow-soft border border-outline-variant/30">
                <FoodSearch onAddFood={handleAddFood} />
              </div>
            )}

            {activeTab === "scan" && (
              <div className="bg-surface-container-lowest rounded-2xl p-5 card-shadow-soft border border-outline-variant/30">
                <BarcodeScanner onAddFood={handleAddFood} />
              </div>
            )}

            {activeTab === "checkin" && (
              <div className="bg-surface-container-lowest rounded-2xl p-5 card-shadow-soft border border-outline-variant/30">
                <DailyCheckIn />
              </div>
            )}
          </motion.div>

          {/* Desktop-only: Quick Actions */}
          <div className="hidden md:grid grid-cols-3 gap-4">
            <button
              onClick={() => navigate("/meal-plan")}
              className="bg-surface-container-lowest rounded-xl p-5 card-shadow-soft border border-outline-variant/30 flex items-center gap-3 hover:shadow-md hover:border-primary/30 transition-all group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-primary-container/15 flex items-center justify-center group-hover:bg-primary-container/30 transition-colors">
                <span className="material-symbols-outlined text-primary">restaurant_menu</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-text-rich-black">Meal Plan</p>
                <p className="text-[11px] text-on-surface-variant">Generate AI plans</p>
              </div>
            </button>

            <button
              onClick={() => navigate("/chat")}
              className="bg-surface-container-lowest rounded-xl p-5 card-shadow-soft border border-outline-variant/30 flex items-center gap-3 hover:shadow-md hover:border-primary/30 transition-all group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-primary-container/15 flex items-center justify-center group-hover:bg-primary-container/30 transition-colors">
                <span className="material-symbols-outlined text-primary">smart_toy</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-text-rich-black">AI Coach</p>
                <p className="text-[11px] text-on-surface-variant">Chat with Mezan</p>
              </div>
            </button>

            <button
              onClick={handleLogout}
              className="bg-surface-container-lowest rounded-xl p-5 card-shadow-soft border border-outline-variant/30 flex items-center gap-3 hover:shadow-md hover:border-error/30 transition-all group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-error-container/30 flex items-center justify-center group-hover:bg-error-container/50 transition-colors">
                <span className="material-symbols-outlined text-error">logout</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-text-rich-black">Log Out</p>
                <p className="text-[11px] text-on-surface-variant">Sign out safely</p>
              </div>
            </button>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <BottomNav />
    </div>
  );
};

export default Dashboard;
