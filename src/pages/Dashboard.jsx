import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import client from "../api/client";
import FoodSearch from "../components/FoodSearch";
import DailyCheckIn from "../components/DailyCheckIn";
import BarcodeScanner from "../components/BarcodeScanner";
import AchievementToast from "../components/AchievementToast";
import TopAppBar from "../components/layout/TopAppBar";
import BottomNav from "../components/layout/BottomNav";
import PantryManager from "../components/PantryManager";
import ConcentricRings from "../components/ConcentricRings";
import WeeklyTrendChart from "../components/WeeklyTrendChart";
import VoiceInput from "../components/VoiceInput";
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
  const [toastMessage, setToastMessage] = useState("Progress updated! Stay healthy.");
  const [activeTab, setActiveTab] = useState("overview");
  const [voiceLoading, setVoiceLoading] = useState(false);

  const [waterIntake, setWaterIntake] = useState(() => {
    const saved = localStorage.getItem(`water_${new Date().toDateString()}`);
    return saved ? Number(saved) : 0;
  });

  const handleAddWater = (amount) => {
    const newIntake = waterIntake + amount;
    setWaterIntake(newIntake);
    localStorage.setItem(`water_${new Date().toDateString()}`, newIntake);
    setToastMessage(`Logged ${amount}ml of water! 💧`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  const fetchTodayLog = async () => {
    try {
      const today = new Date().toISOString();
      const { data } = await client.get(`/api/logs/daily/${today}`);
      setLog(data);
    } catch {
      console.log("No log for today yet");
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchTodayLog();
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleAddFood = async (food) => {
    try {
      const payload = {
        date: new Date().toISOString(),
        foodItems: [{ 
          foodId: food._id || null,
          name: food.name,
          calories: Number(food.calories) || 0,
          protein: Number(food.protein) || 0,
          carbs: Number(food.carbs) || 0,
          fats: Number(food.fats) || 0,
          servings: 1 
        }],
      };
      await client.post("/api/logs/daily", payload);
      fetchTodayLog();
      refreshUser();
      setToastMessage("Progress updated! Stay healthy.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFood = async (index) => {
    try {
      const today = new Date().toISOString();
      await client.delete(`/api/logs/daily/${today}/item/${index}`);
      fetchTodayLog();
      refreshUser();
      setToastMessage("Food item removed successfully!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } catch (err) {
      console.error("Failed to remove food item", err);
      setToastMessage("Failed to remove food item. Please try again.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    }
  };

  // Voice-to-Log: send transcribed speech to AI chat for automatic meal logging
  const handleVoiceResult = async (text) => {
    setVoiceLoading(true);
    try {
      // 1. Create a temporary chat session
      const { data: session } = await client.post("/api/chat/session", {});
      const sessionId = session._id;

      // 2. Send the voice transcript as a user message
      const { data: aiReply } = await client.post("/api/chat/message", {
        sessionId,
        role: "user",
        content: text,
      });

      let logSuccess = false;
      let loggedFoodName = "";

      // 3. If the AI wants to call a tool (like log_meal), execute it
      const toolCalls = aiReply.toolCalls || [];
      for (const tc of toolCalls) {
        let toolArgs = {};
        try {
          toolArgs =
            typeof tc.function.arguments === "string"
              ? JSON.parse(tc.function.arguments)
              : tc.function.arguments || {};
        } catch {
          toolArgs = {};
        }

        // Execute the tool
        const { data: toolResult } = await client.post("/api/chat/execute-tool", {
          sessionId,
          toolCallId: tc.id,
          toolName: tc.function.name,
          toolArgs,
        });

        // Verify if tool executed successfully without errors
        const isSuccess = toolResult.result && !toolResult.result.startsWith("Error") && !toolResult.result.startsWith("Failed");

        // Intercept log_water_intake to sync with local hydration state
        if (tc.function.name === "log_water_intake" && toolArgs.amount_ml && isSuccess) {
          logSuccess = true;
          loggedFoodName = `${toolArgs.amount_ml}ml Water`;
          handleAddWater(Number(toolArgs.amount_ml));
        }

        if (tc.function.name === "log_meal" && isSuccess) {
          logSuccess = true;
          loggedFoodName = toolArgs.name || "meal";
        }

        // Send tool result back to AI for final confirmation message
        await client.post("/api/chat/message", {
          sessionId,
          role: "tool",
          content: toolResult.result || JSON.stringify(toolResult),
          toolCallId: tc.id,
          name: tc.function.name,
        });
      }

      // 4. Refresh the daily log to show new entries
      await fetchTodayLog();
      refreshUser();

      if (toolCalls.length > 0 && logSuccess) {
        setToastMessage(`🎤 Logged successfully: ${loggedFoodName}!`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
      } else {
        // Did not match or failed to log: inform user and redirect to chat to log separately
        setToastMessage("⚠️ Could not verify food. Opening AI Coach to log ingredients...");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
          navigate(`/chat/${sessionId}`);
        }, 3000);
      }
    } catch (err) {
      console.error("[Voice Log] Error:", err);
      setToastMessage("Voice logging failed. Try again.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } finally {
      setVoiceLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // ── Calculated macro goals (mirrors backend Mifflin-St Jeor) ──
  const weight = Number(user?.weight) || 0;

  const calorieGoal = user?.targetCalories || 2000;

  const proteinGoal = user?.proteinGoal || Math.round((calorieGoal * 0.25) / 4);
  const carbsGoal = user?.carbsGoal || Math.round((calorieGoal * 0.45) / 4);
  const fatsGoal = user?.fatsGoal || Math.round((calorieGoal * 0.30) / 9);
  const waterGoal = weight > 0 ? Math.round(weight * 35) : 2500;

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
            message={toastMessage}
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

          {/* ════ Concentric Progress Rings Section ════ */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 card-shadow-soft border border-outline-variant/25"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 mb-6 border-b border-outline-variant/15">
              <div>
                <h2 className="font-headline text-lg font-bold text-text-rich-black">Daily Progress</h2>
                <p className="text-xs text-on-surface-variant font-medium">Track your nutrition & hydration goals</p>
              </div>
              <div className="flex items-center gap-4">
                {/* Streak Badge */}
                <div className="bg-primary-container/20 px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[18px]">trending_up</span>
                  <span className="text-xs font-bold text-primary">{user?.streakCount ?? 0} Day Streak</span>
                </div>
                {/* Water Logger Controls */}
                <div className="flex items-center gap-2 bg-surface-container-low/55 rounded-full p-1 border border-outline-variant/20">
                  <button
                    onClick={() => handleAddWater(250)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-[#3B82F6] hover:bg-[#3B82F6]/10 active:scale-95 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">water_drop</span>
                    +250ml
                  </button>
                  <button
                    onClick={() => handleAddWater(500)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-[#1D4ED8] hover:bg-[#1D4ED8]/10 active:scale-95 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">local_drink</span>
                    +500ml
                  </button>
                </div>
              </div>
            </div>

            {/* Concentric Rings component rendering Calories, Protein, Carbs, Fats, Water */}
            <div className="flex justify-center py-2">
              <ConcentricRings
                rings={[
                  {
                    value: Math.round(log.totals.calories),
                    max: calorieGoal,
                    color: "var(--color-primary)",
                    label: "Calories",
                    unit: "kcal",
                  },
                  {
                    value: Math.round(log.totals.protein),
                    max: proteinGoal,
                    color: "var(--color-data-protein)",
                    label: "Protein",
                    unit: "g",
                  },
                  {
                    value: Math.round(log.totals.carbs),
                    max: carbsGoal,
                    color: "var(--color-data-carbs)",
                    label: "Carbs",
                    unit: "g",
                  },
                  {
                    value: Math.round(log.totals.fats),
                    max: fatsGoal,
                    color: "var(--color-data-fats)",
                    label: "Fats",
                    unit: "g",
                  },
                  {
                    value: waterIntake,
                    max: waterGoal,
                    color: "#60A5FA",
                    label: "Water",
                    unit: "ml",
                  },
                ]}
                size={220}
                gap={6}
                strokeWidth={11}
                centerLabel="Remaining"
                centerValue={(Math.max(0, calorieGoal - Math.round(log.totals.calories))).toLocaleString()}
                centerUnit="kcal"
              />
            </div>
          </motion.section>

          {/* ════ Tab Switch: Overview / Search / Check-in ════ */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-[24px] px-[24px]">
            {[
              { key: "overview", icon: "insights", label: "Trends" },
              { key: "pantry", icon: "kitchen", label: "My Pantry" },
              { key: "search", icon: "search", label: "Log Food" },
              { key: "scan", icon: "qr_code_scanner", label: "Barcode" },
              { key: "checkin", icon: "mood", label: "Check-in" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer whitespace-nowrap ${activeTab === tab.key
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
                {/* 7-Day Trend Chart */}
                <WeeklyTrendChart />

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
                        <p className="text-xs text-outline mt-1">Use the Log Food tab or voice input to start tracking.</p>
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
                              {item.name || "Unknown Food"}
                            </p>
                            <p className="text-[11px] text-on-surface-variant font-medium">
                              {item.servings} serving{item.servings > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-headline text-sm font-bold text-primary">
                              {item.calories !== undefined
                                ? Math.round(item.calories * item.servings)
                                : 0}
                            </p>
                            <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">kcal</p>
                          </div>
                          <button
                            onClick={() => handleRemoveFood(idx)}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-error hover:bg-error/10 transition-colors cursor-pointer border-none bg-transparent"
                            title="Remove food item"
                            aria-label="Remove food item"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
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
              <div className="space-y-4">
                {/* Voice Input */}
                <div className="bg-surface-container-lowest rounded-2xl p-5 card-shadow-soft border border-outline-variant/30">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-primary text-[20px]">mic</span>
                    <h3 className="font-headline text-sm font-semibold text-on-surface">Voice Log</h3>
                    {voiceLoading && (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin ml-auto" />
                    )}
                  </div>
                  <VoiceInput onResult={handleVoiceResult} />
                </div>

                {/* Manual food search */}
                <div className="bg-surface-container-lowest rounded-2xl p-5 card-shadow-soft border border-outline-variant/30">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-primary text-[20px]">search</span>
                    <h3 className="font-headline text-sm font-semibold text-on-surface">Search Database</h3>
                  </div>
                  <FoodSearch onAddFood={handleAddFood} />
                </div>
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
                <p className="text-[11px] text-on-surface-variant">Chat with Nova</p>
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
