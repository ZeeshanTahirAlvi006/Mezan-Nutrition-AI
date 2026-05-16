import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import client from "../api/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  LayoutDashboard,
  Utensils,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Check,
  ArrowRightLeft,
  Loader2,
  CalendarDays,
  PenLine,
  Bot,
  X,
  Download,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snacks"];
const MEAL_EMOJIS = {
  Breakfast: "🌅",
  Lunch: "☀️",
  Dinner: "🌙",
  Snacks: "🍿",
};

// ───── Swap Modal ─────
const SwapModal = ({ food, mealType, onClose, onAccept }) => {
  const [mode, setMode] = useState(null); // null | 'ai' | 'manual'
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [manual, setManual] = useState({
    foodName: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
  });

  const handleAiSuggest = async () => {
    setAiLoading(true);
    setMode("ai");
    try {
      const { data } = await client.post("/api/meal-plan/suggest-replacement", {
        foodName: food.foodName,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fats: food.fats,
        mealType,
      });
      setSuggestion(data.suggestion);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "AI suggestion failed. Please try again.";
      alert(msg);
      setMode(null);
    } finally {
      setAiLoading(false);
    }
  };

  const handleManualSubmit = () => {
    if (!manual.foodName.trim()) return alert("Please enter a food name.");
    onAccept({
      foodName: manual.foodName.trim(),
      calories: Number(manual.calories) || 0,
      protein: Number(manual.protein) || 0,
      carbs: Number(manual.carbs) || 0,
      fats: Number(manual.fats) || 0,
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-(--kcal-green)/10 backdrop-blur-xl z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="kcal-card w-full max-w-md shadow-2xl p-8 bg-(--kcal-white)"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-8 border-b border-(--kcal-green-light) pb-5">
            <div>
              <h3 className="text-xs uppercase tracking-widest font-bold text-(--kcal-text-muted) mb-1">
                Food Calibration
              </h3>
              <p className="text-xl font-black text-(--kcal-text-main) tracking-tight">
                {food.foodName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="bg-(--kcal-green-light) p-2 rounded-full text-(--kcal-text-muted) hover:text-(--kcal-green) transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            {!mode && (
              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={handleAiSuggest}
                  disabled={aiLoading}
                  className="w-full bg-(--kcal-green) hover:bg-[#7FB677] text-white py-5 rounded-[var(--radius-xl)] font-bold flex flex-col items-center gap-2 transition-all shadow-lg shadow-[#91C788]/20 disabled:opacity-50"
                >
                  <Sparkles
                    className={`w-6 h-6 ${aiLoading ? "animate-spin" : ""}`}
                  />
                  <span className="text-xs uppercase tracking-widest">
                    AI Auto-Swap
                  </span>
                </button>

                <button
                  onClick={() => setMode("manual")}
                  className="w-full bg-(--kcal-green-light) hover:bg-[#E8F2E5] text-(--kcal-green) py-5 rounded-[var(--radius-xl)] font-bold flex flex-col items-center gap-2 transition-all"
                >
                  <PenLine className="w-6 h-6" />
                  <span className="text-xs uppercase tracking-widest">
                    Manual Entry
                  </span>
                </button>
              </div>
            )}

            {mode === "ai" && (
              <div className="space-y-6">
                {aiLoading ? (
                  <div className="py-12 flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-(--kcal-green)" />
                    <p className="text-xs font-bold text-(--kcal-text-muted) animate-pulse">
                      Analyzing alternatives...
                    </p>
                  </div>
                ) : suggestion ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-[var(--radius-xl)] bg-(--kcal-green-light) border border-(--kcal-green)"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-[10px] font-bold text-(--kcal-text-muted) uppercase tracking-widest mb-1">
                          Recommended Swap
                        </p>
                        <p className="text-lg font-bold text-(--kcal-text-main)">
                          {suggestion.foodName}
                        </p>
                      </div>
                      <span className="bg-(--kcal-green) text-white text-[10px] px-2 py-1 rounded-full font-black">
                        AI CHOICE
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs font-bold text-(--kcal-text-muted) mb-6">
                      <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-(--kcal-green)"></div>{suggestion.calories} KCAL</span>
                      <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-(--kcal-coral)"></div>{suggestion.protein}g PRO</span>
                    </div>
                    <button
                      onClick={() => onAccept(suggestion)}
                      className="kcal-btn-primary w-full text-xs py-3"
                    >
                      Confirm Selection
                    </button>
                  </motion.div>
                ) : null}

                <button
                  onClick={() => setMode(null)}
                  className="w-full text-xs font-bold text-(--kcal-text-muted) hover:text-(--kcal-green) transition-all pt-2"
                >
                  Go Back
                </button>
              </div>
            )}

            {mode === "manual" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-(--kcal-text-muted) uppercase tracking-widest mb-2 ml-1">
                    Food Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Grilled Chicken"
                    className="kcal-input"
                    value={manual.foodName}
                    onChange={(e) =>
                      setManual({ ...manual, foodName: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-(--kcal-text-muted) uppercase tracking-widest mb-2 ml-1">
                      Calories
                    </label>
                    <input
                      type="number"
                      placeholder="kcal"
                      className="kcal-input text-center"
                      value={manual.calories}
                      onChange={(e) =>
                        setManual({ ...manual, calories: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-(--kcal-text-muted) uppercase tracking-widest mb-2 ml-1">
                      Protein (g)
                    </label>
                    <input
                      type="number"
                      placeholder="g"
                      className="kcal-input text-center"
                      value={manual.protein}
                      onChange={(e) =>
                        setManual({ ...manual, protein: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-(--kcal-text-muted) uppercase tracking-widest mb-2 ml-1">
                      Carbs (g)
                    </label>
                    <input
                      type="number"
                      placeholder="g"
                      className="kcal-input text-center"
                      value={manual.carbs}
                      onChange={(e) =>
                        setManual({ ...manual, carbs: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-(--kcal-text-muted) uppercase tracking-widest mb-2 ml-1">
                      Fats (g)
                    </label>
                    <input
                      type="number"
                      placeholder="g"
                      className="kcal-input text-center"
                      value={manual.fats}
                      onChange={(e) =>
                        setManual({ ...manual, fats: e.target.value })
                      }
                    />
                  </div>
                </div>
                <button
                  onClick={handleManualSubmit}
                  className="kcal-btn-primary w-full mt-4 shadow-lg shadow-[#91C788]/20"
                >
                  Apply Override
                </button>
                <button
                  onClick={() => setMode(null)}
                  className="w-full text-xs font-bold text-(--kcal-text-muted) hover:text-(--kcal-green) transition-all pt-2"
                >
                  Cancel and Go Back
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ───── Main Page ─────
const MealPlan = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [targetCalories, setTargetCalories] = useState(2000);
  const [selectedDay, setSelectedDay] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [swapTarget, setSwapTarget] = useState(null); // { dayIdx, mealType, foodIdx, food }

  useEffect(() => {
    fetchCurrentPlan();
  }, []);

  const fetchCurrentPlan = async () => {
    setLoading(true);
    try {
      const { data } = await client.get("/api/meal-plan/current");
      if (data.plan && data.plan.days?.length > 0) {
        setPlan(data.plan);
        setIsDraft(false);
      } else {
        setPlan(null);
      }
      setTargetCalories(data.targetCalories || 2000);
    } catch (err) {
      console.error("Failed to fetch meal plan", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data } = await client.post("/api/meal-plan/generate");
      setPlan({ days: data.draft.days });
      setTargetCalories(data.targetCalories);
      setIsDraft(true);
      setSelectedDay(0);
    } catch (err) {
      console.error("Failed to generate meal plan", err);
      const msg =
        err.response?.data?.message ||
        "Failed to generate meal plan. Please try again.";
      alert(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      const { data } = await client.post("/api/meal-plan/save", {
        days: plan.days,
      });
      setPlan(data);
      setIsDraft(false);
    } catch (err) {
      console.error("Failed to save meal plan", err);
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Called by the modal when user accepts a replacement (AI or manual)
  const handleSwapAccept = async (newFood) => {
    if (!swapTarget) return;
    const { dayIdx, mealType, foodIdx } = swapTarget;
    const dayDate = new Date(plan.days[dayIdx].date)
      .toISOString()
      .split("T")[0];

    // Update local state immediately (works for both draft & saved)
    setPlan((prev) => {
      const updated = JSON.parse(JSON.stringify(prev)); // deep clone
      updated.days[dayIdx].meals[mealType][foodIdx] = {
        ...newFood,
        status: "active",
      };
      // Recalculate day total
      let total = 0;
      MEAL_TYPES.forEach((mt) => {
        updated.days[dayIdx].meals[mt]?.forEach((item) => {
          total += item.calories || 0;
        });
      });
      updated.days[dayIdx].totalCalories = total;
      return updated;
    });

    // If it's a saved plan (not draft), also commit to DB
    if (!isDraft) {
      try {
        await client.post("/api/meal-plan/commit-replacement", {
          dayDate,
          mealType,
          foodIndex: foodIdx,
          newFood,
        });
      } catch (err) {
        console.error("Failed to commit replacement to DB", err);
      }
    }

    setSwapTarget(null);
  };

  const handleDownloadPDF = () => {
    if (!plan || !plan.days) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(22);
    doc.setTextColor(111, 66, 193); // Brand Primary Color (approx)
    doc.text("Antigravity Nutrition", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text("Your Personalized 7-Day Meal Plan", pageWidth / 2, 30, {
      align: "center",
    });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Target Daily Calories: ${targetCalories} kcal`,
      pageWidth / 2,
      38,
      { align: "center" },
    );
    doc.text(
      `Generated on: ${new Date().toLocaleDateString()}`,
      pageWidth / 2,
      44,
      { align: "center" },
    );

    let yPos = 55;

    plan.days.forEach((day, index) => {
      if (index > 0 && yPos > 200) {
        doc.addPage();
        yPos = 20;
      }

      const d = new Date(day.date);
      const dateStr = d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });

      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`${dateStr} (Total: ${day.totalCalories} kcal)`, 14, yPos);
      yPos += 5;

      const tableData = [];
      MEAL_TYPES.forEach((mealType) => {
        const items = day.meals[mealType] || [];
        items.forEach((item, idx) => {
          tableData.push([
            idx === 0 ? mealType : "",
            item.foodName,
            item.calories,
            `${item.protein}g`,
            `${item.carbs}g`,
            `${item.fats}g`,
          ]);
        });
      });

      autoTable(doc, {
        startY: yPos,
        head: [["Meal", "Food Item", "Kcal", "Protein", "Carbs", "Fats"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [145, 199, 136] }, // KCAL Green (91C788)
        margin: { top: 10 },
        didDrawPage: (data) => {
          yPos = data.cursor.y + 15;
        },
      });

      yPos = doc.lastAutoTable.finalY + 15;
    });

    doc.save("Antigravity_Meal_Plan.pdf");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const currentDay = plan?.days?.[selectedDay];

  const getCalorieColor = (actual, target) => {
    const ratio = actual / target;
    if (ratio >= 0.95 && ratio <= 1.05) return "text-emerald-400";
    if (ratio < 0.85) return "text-amber-400";
    return "text-rose-400";
  };

  const getCalorieBarWidth = (actual, target) =>
    Math.min((actual / target) * 100, 100);

  return (
    <div className="min-h-screen bg-(--kcal-cream) flex flex-col pb-24 lg:pb-0 lg:pl-72">
      {/* Desktop Sidebar Navigation */}
      <nav className="hidden lg:flex fixed left-0 top-0 h-full w-72 bg-(--kcal-white) border-r border-(--kcal-green-light) p-10 flex-col shadow-sm z-30">
        <div className="mb-12">
          <h1 className="text-3xl font-extrabold text-(--kcal-green) tracking-tighter">
            kcal
          </h1>
        </div>

        <div className="flex-1 space-y-2">
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full flex items-center space-x-3 text-(--kcal-text-muted) hover:text-(--kcal-green) px-5 py-4 rounded-[var(--radius-lg)] transition-all font-bold"
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-sm">Dashboard</span>
          </button>
          <button className="w-full flex items-center space-x-3 bg-(--kcal-green-light) text-(--kcal-green) px-5 py-4 rounded-[var(--radius-lg)] transition-all font-bold">
            <Utensils className="w-5 h-5" />
            <span className="text-sm">Meal Plan</span>
          </button>
          <button
            onClick={() => navigate("/chat")}
            className="w-full flex items-center space-x-3 text-(--kcal-text-muted) hover:text-(--kcal-green) px-5 py-4 rounded-[var(--radius-lg)] transition-all font-bold"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-sm">AI Coach</span>
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="mt-auto w-full flex items-center space-x-3 text-(--kcal-text-muted) hover:text-(--kcal-coral) px-5 py-4 rounded-[var(--radius-lg)] transition-all font-bold"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm">Log Out</span>
        </button>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-(--kcal-white) border-t border-(--kcal-green-light) px-4 py-2 flex justify-between items-center shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-50">
        <button
          onClick={() => navigate("/dashboard")}
          className="kcal-nav-item"
        >
          <LayoutDashboard className="w-6 h-6" />
        </button>
        <button className="kcal-nav-item active">
          <Utensils className="w-6 h-6" />
        </button>
        <div className="relative -top-8">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-(--kcal-green) p-5 rounded-full text-white shadow-xl shadow-[#91C788]/40 active:scale-95 transition-all"
          >
            <Sparkles
              className={`w-7 h-7 ${generating ? "animate-spin" : ""}`}
            />
          </button>
        </div>
        <button onClick={() => navigate("/chat")} className="kcal-nav-item">
          <MessageSquare className="w-6 h-6" />
        </button>
        <button className="kcal-nav-item" onClick={handleLogout}>
          <LogOut className="w-6 h-6" />
        </button>
      </nav>

      {/* ===== Main Content ===== */}
      <main className="flex-1 p-6 md:p-10 lg:p-16 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <header className="mb-12 flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-4xl font-black text-(--kcal-text-main) tracking-tight flex items-center gap-4">
              <CalendarDays className="w-10 h-10 text-(--kcal-green)" />
              Meal Plan
            </h1>
            <p className="text-(--kcal-text-muted) mt-2 font-medium">
              {isDraft
                ? "⚡ Draft Protocol — Pending Confirmation."
                : plan
                  ? "Your optimized nutritional protocol."
                  : "Start your journey by generating a plan."}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {isDraft && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="kcal-btn-primary flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Confirm Plan
              </button>
            )}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-(--kcal-green-light) text-(--kcal-green) px-6 py-4 rounded-[var(--radius-lg)] font-bold flex items-center gap-2 hover:bg-[#E8F2E5] transition-all"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {plan ? "Recalibrate" : "Generate Plan"}
            </button>
            {plan && !isDraft && (
              <button
                onClick={handleDownloadPDF}
                className="bg-(--kcal-white) border border-(--kcal-green-light) text-(--kcal-text-main) px-6 py-4 rounded-[var(--radius-lg)] font-bold flex items-center gap-2 hover:bg-(--kcal-cream) transition-all shadow-sm"
              >
                <Download className="w-4 h-4 text-(--kcal-green)" />
                Export PDF
              </button>
            )}
          </div>
        </header>

        {/* Loading Overlay */}
        {loading && (
          <div className="flex-1 flex items-center justify-center py-32">
            <Loader2 className="w-12 h-12 text-[var(--kcal-green)] animate-spin" />
          </div>
        )}

        {/* Generating State */}
        {generating && (
          <div className="flex-1 flex flex-col items-center justify-center py-32 gap-8 text-center animate-in fade-in zoom-in duration-500">
            <div className="relative">
              <div className="absolute inset-0 bg-(--kcal-green) rounded-full animate-ping opacity-20 scale-150"></div>
              <div className="relative bg-white p-10 rounded-full shadow-2xl border border-(--kcal-green-light)">
                <Sparkles className="w-16 h-16 text-(--kcal-green) animate-pulse" />
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-black text-(--kcal-text-main) tracking-tight">Crafting Your Protocol</h2>
              <p className="text-(--kcal-text-muted) max-w-md mx-auto font-medium">
                Our KCAL Intelligence engine is analyzing your biological markers to design the perfect 7-day nutritional journey.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-3 h-3 bg-(--kcal-green) rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }}></div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !generating && !plan && (
          <div className="flex-1 flex flex-col items-center justify-center py-32 text-center gap-8">
            <div className="bg-[var(--kcal-green-light)] p-8 rounded-full">
              <Utensils className="w-20 h-20 text-[var(--kcal-green)]" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-[var(--kcal-text-main)] mb-3">
                No active plan
              </h2>
              <p className="text-[var(--kcal-text-muted)] max-w-md mx-auto">
                Initiate the generation protocol to receive your personalized
                7-day nutritional guidance.
              </p>
            </div>
            <button
              onClick={handleGenerate}
              className="kcal-btn-primary scale-110"
            >
              Generate 7-Day Plan
            </button>
          </div>
        )}

        {/* ===== Active Plan ===== */}
        {!loading && !generating && plan && plan.days?.length > 0 && (
          <div className="space-y-8">
            {/* Day Tabs */}
            <div className="flex items-center gap-3 overflow-x-auto pb-4 custom-scrollbar">
              {plan.days.map((day, idx) => {
                const d = new Date(day.date);
                const isToday =
                  d.toISOString().split("T")[0] ===
                  new Date().toISOString().split("T")[0];
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDay(idx)}
                    className={`flex-shrink-0 min-w-[100px] p-4 rounded-[var(--radius-xl)] font-bold transition-all border ${
                      selectedDay === idx
                        ? "bg-(--kcal-green) text-white border-(--kcal-green) shadow-lg shadow-[#91C788]/20"
                        : "bg-(--kcal-white) text-(--kcal-text-muted) border-(--kcal-green-light) hover:border-(--kcal-green)"
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-widest opacity-80 mb-1">
                      {d.toLocaleDateString("en-US", { weekday: "short" })}
                    </div>
                    <div className="text-lg tracking-tighter">
                      {d.toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                    {isToday && (
                      <div
                        className={`text-[8px] font-black mt-2 tracking-widest px-2 py-0.5 rounded-full ${selectedDay === idx ? "bg-white/20" : "bg-(--kcal-green-light) text-(--kcal-green)"}`}
                      >
                        TODAY
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Day Content */}
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Meals List */}
              <div className="lg:col-span-2 space-y-6">
                {MEAL_TYPES.map((mealType) => (
                  <div key={mealType} className="kcal-card overflow-hidden">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-black text-(--kcal-text-main) uppercase tracking-tight flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-(--kcal-green) rounded-full"></span>
                        {mealType}
                      </h3>
                      <span className="bg-(--kcal-green-light) text-(--kcal-green) text-xs font-black px-3 py-1 rounded-full">
                        {plan.days[selectedDay].meals[mealType]?.reduce(
                          (acc, curr) => acc + (curr.calories || 0),
                          0,
                        ) || 0}{" "}
                        kcal
                      </span>
                    </div>
                    <div className="space-y-3">
                      {plan.days[selectedDay].meals[mealType]?.map(
                        (food, fIdx) => (
                          <div
                            key={fIdx}
                            className="group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-[var(--radius-lg)] bg-(--kcal-cream) border border-transparent hover:border-(--kcal-green-light) hover:bg-(--kcal-white) transition-all gap-4"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-(--kcal-white) flex items-center justify-center text-(--kcal-green) shadow-sm">
                                <Utensils className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-bold text-(--kcal-text-main) leading-tight">
                                  {food.foodName}
                                </p>
                                <p className="text-xs text-(--kcal-text-muted) font-medium mt-0.5">
                                  {food.calories} kcal • {food.protein}g protein
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                setSwapTarget({
                                  dayIdx: selectedDay,
                                  mealType,
                                  foodIdx: fIdx,
                                  food,
                                })
                              }
                              className="md:opacity-0 md:group-hover:opacity-100 opacity-100 flex items-center gap-2 text-xs font-bold text-(--kcal-green) hover:bg-(--kcal-green-light) px-4 py-2 rounded-lg transition-all border border-(--kcal-green-light) md:border-transparent"
                            >
                              <ArrowRightLeft className="w-3 h-3" />
                              Swap Food
                            </button>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Day Summary / Stats */}
              <div className="space-y-6">
                <div className="kcal-card bg-(--kcal-green) border-none text-white">
                  <h3 className="text-sm font-bold uppercase tracking-widest opacity-80 mb-6">
                    Day Summary
                  </h3>
                  <div className="space-y-6">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-4xl font-black">
                          {plan.days[selectedDay].totalCalories}
                        </p>
                        <p className="text-xs font-bold opacity-80">
                          Total Calories
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">{targetCalories}</p>
                        <p className="text-[10px] font-bold opacity-60 uppercase tracking-tighter">
                          Target Goal
                        </p>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white transition-all duration-1000 ease-out"
                        style={{
                          width: `${Math.min(100, (plan.days[selectedDay].totalCalories / targetCalories) * 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="kcal-card">
                  <h3 className="text-xs font-bold text-(--kcal-text-muted) uppercase tracking-widest mb-6">
                    Macro Breakdown
                  </h3>
                  <div className="space-y-4">
                    {[
                      {
                        label: "Protein",
                        value: plan.days[selectedDay].meals
                          ? Object.values(plan.days[selectedDay].meals)
                              .flat()
                              .reduce((a, b) => a + (b.protein || 0), 0)
                          : 0,
                        color: "var(--kcal-green)",
                        unit: "g",
                      },
                      {
                        label: "Carbs",
                        value: plan.days[selectedDay].meals
                          ? Object.values(plan.days[selectedDay].meals)
                              .flat()
                              .reduce((a, b) => a + (b.carbs || 0), 0)
                          : 0,
                        color: "var(--kcal-coral)",
                        unit: "g",
                      },
                      {
                        label: "Fats",
                        value: plan.days[selectedDay].meals
                          ? Object.values(plan.days[selectedDay].meals)
                              .flat()
                              .reduce((a, b) => a + (b.fats || 0), 0)
                          : 0,
                        color: "#FFB84D",
                        unit: "g",
                      },
                    ].map((macro) => (
                      <div key={macro.label} className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-(--kcal-text-muted)">
                            {macro.label}
                          </span>
                          <span className="text-(--kcal-text-main)">
                            {macro.value}
                            {macro.unit}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-(--kcal-green-light) rounded-full">
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{
                              width: "60%",
                              backgroundColor: macro.color,
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Swap Modal */}
      {swapTarget && (
        <SwapModal
          food={swapTarget.food}
          onClose={() => setSwapTarget(null)}
          onAccept={handleSwapAccept}
        />
      )}
    </div>
  );
};

export default MealPlan;
