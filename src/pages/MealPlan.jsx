import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import client from "../api/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Check,
  ArrowRightLeft,
  Loader2,
  CalendarDays,
  PenLine,
  X,
  Download,
  Utensils,
  ArrowLeft,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import TopAppBar from "../components/layout/TopAppBar";
import BottomNav from "../components/layout/BottomNav";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snacks"];

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
        className="fixed inset-0 bg-text-rich-black/45 backdrop-blur-md z-[100] flex items-start justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 border border-outline-variant/30 my-4 md:my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6 border-b border-outline-variant/30 pb-4">
            <div>
              <h3 className="text-[10px] uppercase tracking-wider font-extrabold text-on-surface-variant mb-0.5">
                Food Calibration
              </h3>
              <p className="text-lg font-black text-text-rich-black tracking-tight">
                {food.foodName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="bg-surface-off-white hover:bg-primary-container/10 p-2 rounded-full text-on-surface-variant hover:text-primary transition-all cursor-pointer"
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
                  className="w-full bg-primary hover:bg-primary-dark text-white py-5 rounded-2xl font-bold flex flex-col items-center gap-2.5 transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  <Sparkles
                    className={`w-6 h-6 ${aiLoading ? "animate-spin" : ""}`}
                  />
                  <span className="text-[10px] uppercase tracking-widest">
                    AI Auto-Swap
                  </span>
                </button>

                <button
                  onClick={() => setMode("manual")}
                  className="w-full bg-surface-off-white hover:bg-primary-container/15 text-primary py-5 rounded-2xl font-bold flex flex-col items-center gap-2.5 transition-all border border-outline-variant/20 cursor-pointer"
                >
                  <PenLine className="w-6 h-6" />
                  <span className="text-[10px] uppercase tracking-widest">
                    Manual Entry
                  </span>
                </button>
              </div>
            )}

            {mode === "ai" && (
              <div className="space-y-6">
                {aiLoading ? (
                  <div className="py-12 flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-xs font-bold text-on-surface-variant animate-pulse">
                      Analyzing biological alternatives...
                    </p>
                  </div>
                ) : suggestion ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl bg-primary-container/5 border border-primary/20"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1">
                          Recommended Swap
                        </p>
                        <p className="text-base font-bold text-text-rich-black">
                          {suggestion.foodName}
                        </p>
                      </div>
                      <span className="bg-primary text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                        AI CHOICE
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs font-bold text-on-surface-variant mb-6">
                      <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary"></div>{suggestion.calories} KCAL</span>
                      <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#EC6A52]"></div>{suggestion.protein}g PRO</span>
                    </div>
                    <button
                      onClick={() => onAccept(suggestion)}
                      className="kcal-btn-primary w-full text-xs py-3.5 shadow-sm"
                    >
                      Confirm Selection
                    </button>
                  </motion.div>
                ) : null}

                <button
                  onClick={() => setMode(null)}
                  className="w-full text-xs font-bold text-on-surface-variant hover:text-primary transition-all pt-2 cursor-pointer text-center"
                >
                  Go Back
                </button>
              </div>
            )}

            {mode === "manual" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">
                    Food Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Grilled Chicken"
                    className="kcal-input bg-surface-off-white/50"
                    value={manual.foodName}
                    onChange={(e) =>
                      setManual({ ...manual, foodName: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">
                      Calories
                    </label>
                    <input
                      type="number"
                      placeholder="kcal"
                      className="kcal-input text-center bg-surface-off-white/50"
                      value={manual.calories}
                      onChange={(e) =>
                        setManual({ ...manual, calories: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">
                      Protein (g)
                    </label>
                    <input
                      type="number"
                      placeholder="g"
                      className="kcal-input text-center bg-surface-off-white/50"
                      value={manual.protein}
                      onChange={(e) =>
                        setManual({ ...manual, protein: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">
                      Carbs (g)
                    </label>
                    <input
                      type="number"
                      placeholder="g"
                      className="kcal-input text-center bg-surface-off-white/50"
                      value={manual.carbs}
                      onChange={(e) =>
                        setManual({ ...manual, carbs: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">
                      Fats (g)
                    </label>
                    <input
                      type="number"
                      placeholder="g"
                      className="kcal-input text-center bg-surface-off-white/50"
                      value={manual.fats}
                      onChange={(e) =>
                        setManual({ ...manual, fats: e.target.value })
                      }
                    />
                  </div>
                </div>
                <button
                  onClick={handleManualSubmit}
                  className="kcal-btn-primary w-full mt-4 shadow-md cursor-pointer"
                >
                  Apply Override
                </button>
                <button
                  onClick={() => setMode(null)}
                  className="w-full text-xs font-bold text-on-surface-variant hover:text-primary transition-all pt-2 cursor-pointer text-center"
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
    doc.setTextColor(58, 105, 55); // Brand Primary Color (Mezan Green)
    doc.text("Mezan Nutrition AI", pageWidth / 2, 20, { align: "center" });

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
        headStyles: { fillColor: [58, 105, 55] }, // Mezan Green
        margin: { top: 10 },
        didDrawPage: (data) => {
          yPos = data.cursor.y + 15;
        },
      });

      yPos = doc.lastAutoTable.finalY + 15;
    });

    doc.save("Mezan_Nutrition_Meal_Plan.pdf");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-surface-off-white flex flex-col">
      {/* Top App Bar */}
      <TopAppBar />

      {/* ===== Main Content ===== */}
      <main className="flex-1 pt-16 pb-24 md:pb-8">
        <div className="max-w-[1200px] mx-auto px-[24px] md:px-8 space-y-[32px] mt-6">
          {/* Header */}
          {!loading && !generating && (
            <header className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-[2px] w-8 bg-primary hidden md:block"></div>
                  <h2 className="text-primary font-black text-xs uppercase tracking-widest">
                    PERSONALIZED BIOLOGICAL PLAN
                  </h2>
                </div>
                <h1 className="text-3xl md:text-4xl font-headline font-black text-text-rich-black tracking-tight flex items-center gap-3">
                  <CalendarDays className="w-9 h-9 text-primary" />
                  Meal Protocol
                </h1>
                <p className="text-on-surface-variant font-medium text-sm">
                  {isDraft
                    ? "⚡ Draft Protocol — Review and confirm to save."
                    : plan
                      ? "Your fully optimized, biological nutritional protocol."
                      : "Generate your custom AI meal plan to start your nutritional protocol."}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {isDraft && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="kcal-btn-primary flex items-center gap-2 cursor-pointer shadow-sm"
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
                  className="bg-primary/10 text-primary border border-primary/20 px-6 py-3.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primary hover:text-white transition-all cursor-pointer text-xs md:text-sm shadow-sm"
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
                    className="bg-white border border-outline-variant/30 text-text-rich-black px-6 py-3.5 rounded-xl font-bold flex items-center gap-2 hover:bg-surface-off-white transition-all shadow-sm cursor-pointer text-xs md:text-sm"
                  >
                    <Download className="w-4 h-4 text-primary" />
                    Export PDF
                  </button>
                )}
              </div>
            </header>
          )}

        {/* Loading Overlay */}
        {loading && (
          <div className="flex-1 flex items-center justify-center py-32">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
          </div>
        )}

        {/* Generating State */}
        {generating && (
          <div className="flex-1 flex flex-col items-center justify-center py-24 gap-8 text-center animate-in fade-in zoom-in duration-500">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping opacity-30 scale-150"></div>
              <div className="relative bg-white p-8 rounded-full shadow-xl border border-outline-variant/30 flex items-center justify-center">
                <Sparkles className="w-12 h-12 text-primary animate-pulse" />
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl md:text-3xl font-black text-text-rich-black tracking-tight">Crafting Biological Plan</h2>
              <p className="text-on-surface-variant max-w-md mx-auto font-medium text-sm">
                Our Mezan Intelligence engine is analyzing your biological markers and macro allocations to design the perfect 7-day nutritional journey.
              </p>
            </div>
            <div className="flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }}></div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !generating && !plan && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-8 bg-white border border-outline-variant/20 rounded-2xl shadow-sm p-8">
            <div className="bg-primary/5 p-6 rounded-full border border-primary/10 flex items-center justify-center">
              <Utensils className="w-16 h-16 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-text-rich-black">No active protocol found</h2>
              <p className="text-on-surface-variant max-w-md mx-auto text-sm font-medium">
                Initiate the generation protocol to receive your highly personalized 7-day biological nutritional guidance.
              </p>
            </div>
            <button
              onClick={handleGenerate}
              className="kcal-btn-primary px-8 py-4 text-sm shadow-md cursor-pointer"
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
                    className={`flex-shrink-0 min-w-[105px] p-4 rounded-2xl font-bold transition-all border cursor-pointer text-center ${
                      selectedDay === idx
                        ? "bg-primary text-white border-primary shadow-md active:scale-95"
                        : "bg-white text-on-surface-variant border-outline-variant/35 hover:border-primary/50 hover:bg-surface-off-white"
                    }`}
                  >
                    <div className="text-[9px] uppercase tracking-widest opacity-80 mb-1">
                      {d.toLocaleDateString("en-US", { weekday: "short" })}
                    </div>
                    <div className="text-base tracking-tight">
                      {d.toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                    {isToday && (
                      <div
                        className={`text-[8px] font-black mt-2 tracking-widest px-2 py-0.5 rounded-full ${selectedDay === idx ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}
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
                  <div key={mealType} className="glass-panel p-6 md:p-8 rounded-2xl shadow-sm border border-outline-variant/20 flex flex-col bg-white">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-base md:text-lg font-black text-text-rich-black uppercase tracking-wider flex items-center gap-2.5">
                        <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                        {mealType}
                      </h3>
                      <span className="bg-primary/10 border border-primary/20 text-primary text-xs font-black px-3 py-1 rounded-full">
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
                            className="group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-surface-off-white/40 border border-transparent hover:border-outline-variant/30 hover:bg-white transition-all gap-4"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-white border border-outline-variant/20 flex items-center justify-center text-primary shadow-sm">
                                <Utensils className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-bold text-text-rich-black leading-tight text-sm md:text-base">
                                  {food.foodName}
                                </p>
                                <p className="text-xs text-on-surface-variant font-semibold mt-1">
                                  {food.calories} kcal • {food.protein}g P • {food.carbs}g C • {food.fats}g F
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
                              className="md:opacity-0 md:group-hover:opacity-100 opacity-100 flex items-center gap-2 text-xs font-bold text-primary hover:bg-primary/10 px-4 py-2.5 rounded-xl transition-all border border-primary/20 md:border-transparent cursor-pointer"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
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
                <div className="glass-panel p-6 md:p-8 rounded-2xl shadow-sm border border-primary/20 flex flex-col bg-primary text-white relative overflow-hidden">
                  <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 rounded-full bg-white/5 pointer-events-none"></div>
                  <h3 className="text-xs font-bold uppercase tracking-widest opacity-80 mb-6">
                    Day Summary
                  </h3>
                  <div className="space-y-6">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-4xl font-black">
                          {plan.days[selectedDay].totalCalories}
                        </p>
                        <p className="text-xs font-bold opacity-80 mt-1">
                          Total Calories
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">{targetCalories}</p>
                        <p className="text-[9px] font-bold opacity-60 uppercase tracking-wider mt-1">
                          Target Goal
                        </p>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white transition-all duration-1000 ease-out rounded-full"
                        style={{
                          width: `${Math.min(100, (plan.days[selectedDay].totalCalories / targetCalories) * 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="glass-panel p-6 md:p-8 rounded-2xl shadow-sm border border-outline-variant/20 flex flex-col bg-white">
                  <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-6">
                    Macro Breakdown
                  </h3>
                  <div className="space-y-5">
                    {[
                      {
                        label: "Protein",
                        value: plan.days[selectedDay].meals
                          ? Object.values(plan.days[selectedDay].meals)
                              .flat()
                              .reduce((a, b) => a + (b.protein || 0), 0)
                          : 0,
                        color: "var(--color-primary)",
                        unit: "g",
                      },
                      {
                        label: "Carbs",
                        value: plan.days[selectedDay].meals
                          ? Object.values(plan.days[selectedDay].meals)
                              .flat()
                              .reduce((a, b) => a + (b.carbs || 0), 0)
                          : 0,
                        color: "#EC6A52",
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
                          <span className="text-on-surface-variant">
                            {macro.label}
                          </span>
                          <span className="text-text-rich-black">
                            {macro.value}
                            {macro.unit}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-primary-container/10 border border-outline-variant/15 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{
                              width: `${Math.min(100, (macro.value / (macro.label === "Protein" ? 150 : macro.label === "Carbs" ? 250 : 70)) * 100)}%`,
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
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <BottomNav />

      {/* Swap Modal */}
      {swapTarget && (
        <SwapModal
          food={swapTarget.food}
          mealType={swapTarget.mealType}
          onClose={() => setSwapTarget(null)}
          onAccept={handleSwapAccept}
        />
      )}
    </div>
  );
};

export default MealPlan;
