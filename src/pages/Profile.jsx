import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import client from "../api/client";
import {
  ArrowLeft,
  User,
  Scale,
  ShieldCheck,
  Flame,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Sparkles,
  MapPin,
  Heart,
  Award,
  Trophy
} from "lucide-react";

const Profile = () => {
  const { user, refreshUser } = useContext(AuthContext);
  const navigate = useNavigate();

  // Profile Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [healthGoals, setHealthGoals] = useState("Maintenance");
  const [location, setLocation] = useState("UAE");
  const [restrictions, setRestrictions] = useState([]);
  const [targetCalories, setTargetCalories] = useState("2000");

  const [preferredLanguage, setPreferredLanguage] = useState("English");
  const [biologicalSex, setBiologicalSex] = useState("Male");
  const [activityLevel, setActivityLevel] = useState("Moderately Active");
  const [dietPreference, setDietPreference] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [medicalConditions, setMedicalConditions] = useState([]);
  const [pregnancyStatus, setPregnancyStatus] = useState("None");

  // Password Update States
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Security Recovery States
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [hasSecurityQuestion, setHasSecurityQuestion] = useState(false);
  const [secLoading, setSecLoading] = useState(false);
  const [secSuccessMsg, setSecSuccessMsg] = useState("");
  const [secErrorMsg, setSecErrorMsg] = useState("");

  // Status Alerts
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Popular Dietary Restrictions list
  const POPULAR_RESTRICTIONS = [
    "Gluten-Free",
    "Lactose-Free",
    "Vegan",
    "Vegetarian",
    "Keto",
    "Paleo",
    "Nut-Free",
    "Egg-Free",
    "Seafood-Free"
  ];

  // Initialize Form
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setAge(user.age || "");
      setWeight(user.weight || "");
      setHeight(user.height || "");
      setHealthGoals(user.healthGoals || "Maintenance");
      setLocation(user.location || "UAE");
      setRestrictions(user.restrictions || []);
      setTargetCalories(user.targetCalories !== undefined && user.targetCalories !== null ? String(user.targetCalories) : "2000");
      setHasSecurityQuestion(!!user.hasSecurityQuestion);
      setPreferredLanguage(user.preferredLanguage || "English");
      setBiologicalSex(user.biologicalSex || "Male");
      setActivityLevel(user.activityLevel || "Moderately Active");
      setDietPreference(user.dietPreference || []);
      setAllergies(user.allergies || []);
      setMedicalConditions(user.medicalConditions || []);
      setPregnancyStatus(user.pregnancyStatus || "None");
    }
  }, [user]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Live Password Checklist
  const passwordCriteria = {
    length: newPassword.length >= 12,
    lowercase: /[a-z]/.test(newPassword),
    uppercase: /[A-Z]/.test(newPassword),
    number: /\d/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword)
  };

  const isPasswordAttempted = newPassword.length > 0;
  const isPasswordValid =
    passwordCriteria.length &&
    passwordCriteria.lowercase &&
    passwordCriteria.uppercase &&
    passwordCriteria.number &&
    passwordCriteria.special;

  const isPasswordMatch = newPassword === confirmPassword;

  // Determine if Save is Blocked
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isSaveBlocked =
    loading ||
    !isEmailValid ||
    (isPasswordAttempted && (!isPasswordValid || !isPasswordMatch)) ||
    (age !== "" && (Number(age) < 1 || Number(age) > 120)) ||
    (weight !== "" && (Number(weight) <= 0 || Number(weight) > 500)) ||
    (height !== "" && (Number(height) <= 0 || Number(height) > 300)) ||
    (targetCalories !== "" && (Number(targetCalories) < 500 || Number(targetCalories) > 10000 || !Number.isInteger(Number(targetCalories))));

  // Live BMI Calculator
  const numWeight = parseFloat(weight);
  const numHeight = parseFloat(height);
  const bmi =
    numWeight && numHeight
      ? (numWeight / Math.pow(numHeight / 100, 2)).toFixed(1)
      : null;

  const estimatedTdee =
    numWeight && numHeight && age
      ? (() => {
        const isFemale = biologicalSex === "Female";
        let bmr = 10 * numWeight + 6.25 * numHeight - 5 * parseInt(age) + (isFemale ? -161 : 5);

        let multiplier = 1.55;
        if (activityLevel === "Sedentary") multiplier = 1.2;
        else if (activityLevel === "Lightly Active") multiplier = 1.375;
        else if (activityLevel === "Moderately Active") multiplier = 1.55;
        else if (activityLevel === "Very Active") multiplier = 1.725;

        let tdee = Math.round(bmr * multiplier);
        if (healthGoals === "Weight Loss") tdee = Math.round(tdee * 0.8);
        if (healthGoals === "Muscle Gain") tdee = Math.round(tdee * 1.15);
        return tdee;
      })()
      : null;

  let bmiCategory = "";
  let bmiColor = "text-on-surface-variant";
  let bmiProgressColor = "bg-outline-variant/30";
  let bmiPercent = 0; // mapped to typical range 15 to 35

  if (bmi) {
    const numBmi = parseFloat(bmi);
    bmiPercent = Math.min(Math.max(((numBmi - 15) / 20) * 100, 5), 95);
    if (numBmi < 18.5) {
      bmiCategory = "Underweight";
      bmiColor = "text-sky-500 font-bold";
      bmiProgressColor = "bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]";
    } else if (numBmi >= 18.5 && numBmi < 25) {
      bmiCategory = "Normal Weight";
      bmiColor = "text-emerald-500 font-bold";
      bmiProgressColor = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]";
    } else if (numBmi >= 25 && numBmi < 30) {
      bmiCategory = "Overweight";
      bmiColor = "text-amber-500 font-bold";
      bmiProgressColor = "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]";
    } else {
      bmiCategory = "Obese";
      bmiColor = "text-rose-500 font-bold";
      bmiProgressColor = "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]";
    }
  }

  // Ideal weight range calculation (Devine Formula approximation)
  const idealWeightMin = numHeight ? (18.5 * Math.pow(numHeight / 100, 2)).toFixed(0) : null;
  const idealWeightMax = numHeight ? (24.9 * Math.pow(numHeight / 100, 2)).toFixed(0) : null;

  // Toggle dietary chips
  const handleToggleRestriction = (tag) => {
    if (restrictions.includes(tag)) {
      setRestrictions(restrictions.filter((r) => r !== tag));
    } else {
      setRestrictions([...restrictions, tag]);
    }
  };

  const handleToggleDietPreference = (tag) => {
    if (dietPreference.includes(tag)) {
      setDietPreference(dietPreference.filter((d) => d !== tag));
    } else {
      setDietPreference([...dietPreference, tag]);
    }
  };

  const handleToggleAllergy = (tag) => {
    if (allergies.includes(tag)) {
      setAllergies(allergies.filter((a) => a !== tag));
    } else {
      setAllergies([...allergies, tag]);
    }
  };

  const handleToggleMedicalCondition = (tag) => {
    if (medicalConditions.includes(tag)) {
      setMedicalConditions(medicalConditions.filter((m) => m !== tag));
    } else {
      setMedicalConditions([...medicalConditions, tag]);
    }
  };

  // Submit profile edits
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (isSaveBlocked) return;

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const payload = {
        name,
        email,
        age: age === "" ? null : Number(age),
        weight: weight === "" ? null : Number(weight),
        height: height === "" ? null : Number(height),
        healthGoals,
        location,
        restrictions,
        targetCalories: targetCalories === "" ? 2000 : Number(targetCalories),
        preferredLanguage,
        biologicalSex,
        activityLevel,
        dietPreference,
        allergies,
        medicalConditions,
        pregnancyStatus
      };

      // Add password to payload only if user successfully entered a validated password
      if (isPasswordAttempted) {
        payload.password = newPassword;
      }

      await client.put("/api/users/profile", payload);
      await refreshUser();

      setSuccessMsg("✨ Profile saved successfully!");
      setNewPassword("");
      setConfirmPassword("");

      // Clear toast after 4s
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Save security question + answer independently
  const handleSaveSecurityQuestion = async (e) => {
    e.preventDefault();
    const q = securityQuestion.trim();
    const a = securityAnswer.trim();
    if (!q || !a) {
      setSecErrorMsg("Both question and answer are required.");
      return;
    }
    setSecLoading(true);
    setSecErrorMsg("");
    setSecSuccessMsg("");
    try {
      const { data } = await client.put("/api/users/profile", {
        securityQuestion: q,
        securityAnswer: a,
      });
      setSecSuccessMsg("🔒 Security question saved successfully!");
      setSecurityQuestion("");
      setSecurityAnswer("");
      if (data?.hasSecurityQuestion !== undefined) {
        setHasSecurityQuestion(data.hasSecurityQuestion);
      }
      setTimeout(() => setSecSuccessMsg(""), 4000);
    } catch (err) {
      setSecErrorMsg(err.response?.data?.message || "Failed to save. Please try again.");
    } finally {
      setSecLoading(false);
    }
  };

  // Navigation context (Admins vs Users)
  const isAdmin = user?.role === "admin";
  const backRoute = isAdmin ? "/admin" : "/dashboard";
  const backLabel = isAdmin ? "Back to Admin Panel" : "Back to Dashboard";

  return (
    <div className="min-h-screen bg-surface-off-white flex flex-col pb-24 md:pb-8">
      {/* Premium Sticky Top Navigation */}
      <header className="sticky top-0 w-full z-50 bg-surface-container-lowest/80 backdrop-blur-md shadow-sm transition-transform duration-150 h-16 flex items-center px-4 md:px-6">
        <div className="max-w-[1200px] w-full mx-auto flex justify-between items-center">
          <button
            onClick={() => navigate(backRoute)}
            className="flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary transition-all cursor-pointer group bg-surface-container-lowest border border-outline-variant/30 px-4 py-2 rounded-full shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>{backLabel}</span>
          </button>

          <div className="font-headline text-xl font-bold text-primary tracking-tight">
            Mezan میزان
          </div>

          <div className="w-12 h-12 flex items-center justify-center">
            {isAdmin && (
              <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full">
                Admin
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Profile canvas */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-[24px] md:px-8 mt-8 space-y-8">

        {/* Dynamic Alert Toasts */}
        {successMsg && (
          <div className="bg-emerald-50 text-emerald-800 border border-emerald-200/50 p-4 rounded-2xl flex items-center gap-3 shadow-md animate-slide-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <p className="text-sm font-semibold">{successMsg}</p>
          </div>
        )}

        {errorMsg && (
          <div className="bg-rose-50 text-rose-800 border border-rose-200/50 p-4 rounded-2xl flex items-center gap-3 shadow-md animate-slide-in">
            <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <p className="text-sm font-semibold">{errorMsg}</p>
          </div>
        )}

        {/* Heading & Streak Flame Header card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-gradient-to-r from-primary to-primary-container p-6 md:p-8 rounded-3xl text-white shadow-md relative overflow-hidden flex flex-col justify-between min-h-[160px]">
            <div className="z-10">
              <h1 className="text-3xl font-headline font-black tracking-tight">My Profile</h1>
              <p className="text-white/80 text-sm font-medium mt-1">
                Manage your metrics, customized restrictions, and login security credentials.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-4 z-10 bg-white/10 backdrop-blur-sm self-start px-4 py-1.5 rounded-full border border-white/10">
              <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse" />
              <span className="text-xs font-bold text-white/90">Role: {user?.role || "User"}</span>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10 translate-x-12 translate-y-12">
              <User className="w-64 h-64" />
            </div>
          </div>

          {/* Daily streak card */}
          <div className="bg-surface-container-lowest border border-outline-variant/30 p-6 rounded-3xl shadow-sm flex items-center justify-between relative overflow-hidden group">
            <div className="space-y-1">
              <h3 className="text-xs uppercase font-black text-on-surface-variant tracking-wider">
                Mezan Streak
              </h3>
              <p className="text-4xl font-headline font-black text-text-rich-black">
                {user?.streakCount || 0} <span className="text-base font-bold text-on-surface-variant">days</span>
              </p>
              <p className="text-xs text-on-surface-variant font-medium">
                Log items daily to keep your AI accurate.
              </p>
            </div>
            <div className="bg-amber-500/10 p-4 rounded-full border border-amber-500/20 text-amber-500 transition-transform group-hover:scale-110 duration-300">
              <Flame className="w-10 h-10 fill-current animate-bounce" />
            </div>
          </div>
        </div>

        {/* Profile form & biological metrics widget */}
        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Editable Details Panel */}
          <div className="lg:col-span-2 space-y-8">

            {/* Section 1: Personal Parameters */}
            <div className="bg-surface-container-lowest border border-outline-variant/30 p-6 rounded-3xl shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-4">
                <div className="bg-primary/10 p-2 rounded-xl text-primary">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-text-rich-black">Personal Parameters</h2>
                  <p className="text-xs text-on-surface-variant">Your primary metrics used for nutrition calculation.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name / Nickname Input */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-text-rich-black uppercase tracking-wider block">
                    Nickname / Account Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="How should Mezan greet you?"
                    className="w-full bg-surface-off-white border border-outline-variant/35 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary font-medium"
                    required
                  />
                </div>

                {/* Preferred Language Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-rich-black uppercase tracking-wider block">
                    Preferred Language
                  </label>
                  <select
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    className="w-full bg-surface-off-white border border-outline-variant/35 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary font-medium"
                  >
                    <option value="English">English</option>
                    <option value="Urdu">Urdu (اردو)</option>
                    <option value="Arabic">Arabic (العربية)</option>
                  </select>
                </div>

                {/* Biological Sex Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-rich-black uppercase tracking-wider block">
                    Biological Sex
                  </label>
                  <select
                    value={biologicalSex}
                    onChange={(e) => {
                      setBiologicalSex(e.target.value);
                      if (e.target.value !== "Female") setPregnancyStatus("None");
                    }}
                    className="w-full bg-surface-off-white border border-outline-variant/35 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary font-medium"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                {/* Pregnancy Status Input (Only shown if Female) */}
                {biologicalSex === "Female" && (
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-text-rich-black uppercase tracking-wider block">
                      Pregnancy or Lactation Status
                    </label>
                    <select
                      value={pregnancyStatus}
                      onChange={(e) => setPregnancyStatus(e.target.value)}
                      className="w-full bg-surface-off-white border border-outline-variant/35 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary font-medium"
                    >
                      <option value="None">Not Pregnant / Not Lactating</option>
                      <option value="Pregnant">Pregnant</option>
                      <option value="Lactating">Lactating</option>
                    </select>
                  </div>
                )}

                {/* Age Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-rich-black uppercase tracking-wider block">
                    Age (years)
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Enter age (e.g. 28)"
                    className="w-full bg-surface-off-white border border-outline-variant/35 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary font-medium"
                    min="1"
                    max="120"
                  />
                  {age !== "" && (Number(age) < 1 || Number(age) > 120) && (
                    <p className="text-[11px] text-rose-500 font-semibold">Age must be between 1 and 120.</p>
                  )}
                </div>

                {/* Location Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-rich-black uppercase tracking-wider block">
                    Location
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. UAE, Saudi Arabia"
                      className="w-full bg-surface-off-white border border-outline-variant/35 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary font-medium"
                    />
                    <MapPin className="w-4 h-4 text-on-surface-variant absolute left-3.5 top-3.5" />
                  </div>
                </div>

                {/* Height Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-rich-black uppercase tracking-wider block">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="Enter height (e.g. 175)"
                    className="w-full bg-surface-off-white border border-outline-variant/35 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary font-medium"
                    min="1"
                    max="300"
                  />
                  {height !== "" && (Number(height) <= 0 || Number(height) > 300) && (
                    <p className="text-[11px] text-rose-500 font-semibold">Height must be up to 300cm.</p>
                  )}
                </div>

                {/* Weight Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-rich-black uppercase tracking-wider block">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="Enter weight (e.g. 72.5)"
                    className="w-full bg-surface-off-white border border-outline-variant/35 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary font-medium"
                    min="0.1"
                    max="500"
                  />
                  {weight !== "" && (Number(weight) <= 0 || Number(weight) > 500) && (
                    <p className="text-[11px] text-rose-500 font-semibold">Weight must be up to 500kg.</p>
                  )}
                </div>

                {/* Target Calories Input */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-text-rich-black uppercase tracking-wider block">
                    Target Daily Calories (kcal)
                  </label>
                  <input
                    type="number"
                    value={targetCalories}
                    onChange={(e) => setTargetCalories(e.target.value)}
                    placeholder="Enter custom daily calorie target (e.g. 2000)"
                    className="w-full bg-surface-off-white border border-outline-variant/35 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary font-medium font-mono"
                    min="500"
                    max="10000"
                  />
                  {targetCalories !== "" && (Number(targetCalories) < 500 || Number(targetCalories) > 10000 || !Number.isInteger(Number(targetCalories))) && (
                    <p className="text-[11px] text-rose-500 font-semibold">Daily calories must be an integer between 500 and 10000.</p>
                  )}
                </div>
              </div>
              {/* Section 2: Health, Lifestyle & Dietary Requirements */}
              <div className="bg-surface-container-lowest border border-outline-variant/30 p-6 rounded-3xl shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-4">
                  <div className="bg-primary/10 p-2 rounded-xl text-primary">
                    <Heart className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-text-rich-black">Health, Lifestyle & Targets</h2>
                    <p className="text-xs text-on-surface-variant">Customize your goals, activity levels, diet types, and health guardrails.</p>
                  </div>
                </div>

                {/* Health Goal */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-rich-black uppercase tracking-wider block">
                    Dietary Goal
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {["Weight Loss", "Muscle Gain", "Maintenance", "Disease Management"].map((goal) => {
                      const active = healthGoals === goal;
                      return (
                        <button
                          key={goal}
                          type="button"
                          onClick={() => setHealthGoals(goal)}
                          className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${active
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "bg-surface-off-white text-on-surface-variant border-outline-variant/35 hover:bg-surface-container-low"
                            }`}
                        >
                          {goal}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Activity Level */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-rich-black uppercase tracking-wider block">
                    Activity Level
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {["Sedentary", "Lightly Active", "Moderately Active", "Very Active"].map((level) => {
                      const active = activityLevel === level;
                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setActivityLevel(level)}
                          className={`py-3 px-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${active
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "bg-surface-off-white text-on-surface-variant border-outline-variant/35 hover:bg-surface-container-low"
                            }`}
                        >
                          {level}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Diet Type / Preference */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-text-rich-black uppercase tracking-wider block">
                    Diet Type / Preference
                  </label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {["Halal", "Vegetarian", "Vegan", "Keto", "None"].map((pref) => {
                      const selected = dietPreference.includes(pref);
                      return (
                        <button
                          key={pref}
                          type="button"
                          onClick={() => handleToggleDietPreference(pref)}
                          className={`px-4 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${selected
                            ? "bg-primary-container text-primary border-primary/30"
                            : "bg-surface-off-white text-on-surface-variant border-outline-variant/35 hover:bg-surface-container-low"
                            }`}
                        >
                          {pref}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Allergies & Intolerances */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-text-rich-black uppercase tracking-wider block">
                    Allergies & Intolerances
                  </label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {["Peanuts", "Dairy", "Gluten", "Soy", "Shellfish", "Tree Nuts", "Egg"].map((alg) => {
                      const selected = allergies.includes(alg);
                      return (
                        <button
                          key={alg}
                          type="button"
                          onClick={() => handleToggleAllergy(alg)}
                          className={`px-4 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${selected
                            ? "bg-error-container text-error border-error/30"
                            : "bg-surface-off-white text-on-surface-variant border-outline-variant/35 hover:bg-surface-container-low"
                            }`}
                        >
                          {alg}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Medical Conditions */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-text-rich-black uppercase tracking-wider block">
                    Medical Conditions
                  </label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {["Type 2 Diabetes", "Hypertension", "Hyperthyroidism", "None"].map((cond) => {
                      const selected = medicalConditions.includes(cond);
                      return (
                        <button
                          key={cond}
                          type="button"
                          onClick={() => handleToggleMedicalCondition(cond)}
                          className={`px-4 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${selected
                            ? "bg-primary-container text-primary border-primary/30"
                            : "bg-surface-off-white text-on-surface-variant border-outline-variant/35 hover:bg-surface-container-low"
                            }`}
                        >
                          {cond}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dietary Restrictions Toggles */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-text-rich-black uppercase tracking-wider block">
                    Other Dietary Exclusions
                  </label>
                  <p className="text-[11px] text-on-surface-variant font-medium">
                    We'll customize your AI Coach meal ideas & daily generated Meal Plans based on these tags.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {POPULAR_RESTRICTIONS.map((tag) => {
                      const selected = restrictions.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleToggleRestriction(tag)}
                          className={`px-4 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${selected
                            ? "bg-primary-container text-primary border-primary/30"
                            : "bg-surface-off-white text-on-surface-variant border-outline-variant/35 hover:bg-surface-container-low"
                            }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section 3: Account Credentials & Security */}
              <div className="bg-surface-container-lowest border border-outline-variant/30 p-6 rounded-3xl shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-4">
                  <div className="bg-primary/10 p-2 rounded-xl text-primary">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-text-rich-black">Account Credentials & Security</h2>
                    <p className="text-xs text-on-surface-variant">Update your registered email or change passwords securely.</p>
                  </div>
                </div>

                {/* Email Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-rich-black uppercase tracking-wider block">
                    Registered Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full bg-surface-off-white border border-outline-variant/35 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary font-medium"
                    required
                  />
                  {!isEmailValid && (
                    <p className="text-[11px] text-rose-500 font-semibold">Please enter a valid email format.</p>
                  )}
                </div>

                {/* Change Password Sub-fields */}
                <div className="border-t border-outline-variant/20 pt-6 space-y-4">
                  <h3 className="text-sm font-bold text-text-rich-black">Change Security Password</h3>
                  <p className="text-xs text-on-surface-variant">Leave these fields blank if you do not wish to update your password.</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* New Password */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-text-rich-black uppercase tracking-wider block">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter 12+ char password"
                          className="w-full bg-surface-off-white border border-outline-variant/35 rounded-xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:border-primary font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-3 text-on-surface-variant hover:text-primary cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-text-rich-black uppercase tracking-wider block">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          className="w-full bg-surface-off-white border border-outline-variant/35 rounded-xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:border-primary font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-3 text-on-surface-variant hover:text-primary cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Password Criteria Live Checklist */}
                  {isPasswordAttempted && (
                    <div className="bg-surface-container-lowest border border-outline-variant/20 p-4 rounded-2xl space-y-2 mt-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-text-rich-black block">
                        Password Requirements:
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {[
                          { key: "length", text: "At least 12 characters" },
                          { key: "lowercase", text: "One lowercase letter" },
                          { key: "uppercase", text: "One uppercase letter" },
                          { key: "number", text: "One numeric digit" },
                          { key: "special", text: "One special symbol" }
                        ].map((item) => {
                          const passed = passwordCriteria[item.key];
                          return (
                            <div key={item.key} className="flex items-center gap-2 text-xs font-medium">
                              {passed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-500" />
                              )}
                              <span className={passed ? "text-text-rich-black" : "text-on-surface-variant"}>
                                {item.text}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="border-t border-outline-variant/20 pt-3 flex items-center gap-2 text-xs font-medium">
                        {isPasswordMatch ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-500" />
                        )}
                        <span className={isPasswordMatch ? "text-text-rich-black" : "text-on-surface-variant"}>
                          Passwords match exactly
                        </span>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Sticky/Floating Save Action Bar */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaveBlocked}
                  className={`px-8 py-3.5 rounded-2xl text-sm font-bold shadow-md cursor-pointer transition-all duration-200 ${isSaveBlocked
                    ? "bg-outline-variant/40 text-on-surface-variant cursor-not-allowed shadow-none"
                    : "bg-primary text-white hover:bg-primary-container hover:shadow-lg active:scale-95"
                    }`}
                >
                  {loading ? "Saving Profile..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>

          {/* Biological Metrics Sidebar Widget */}
          <div className="space-y-6">
            <div className="bg-surface-container-lowest border border-outline-variant/30 p-6 rounded-3xl shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-4">
                <div className="bg-primary/10 p-2 rounded-xl text-primary">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-text-rich-black">Biological Metrics</h2>
                  <p className="text-xs text-on-surface-variant">Real-time physiological estimates from your height & weight.</p>
                </div>
              </div>

              {bmi ? (
                <div className="space-y-6">
                  {/* BMI Visual Gauge */}
                  <div className="bg-surface-off-white p-5 rounded-2xl border border-outline-variant/20 space-y-4">
                    <div className="text-center space-y-1">
                      <p className="text-[11px] font-black tracking-widest text-on-surface-variant uppercase">
                        Body Mass Index (BMI)
                      </p>
                      <h4 className="text-4xl font-headline font-black text-text-rich-black">
                        {bmi}
                      </h4>
                      <p className={`text-xs ${bmiColor} uppercase tracking-wider`}>
                        {bmiCategory}
                      </p>
                    </div>

                    {/* Gauge range progression */}
                    <div className="space-y-1.5">
                      <div className="h-2 w-full bg-outline-variant/20 rounded-full relative overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ease-out ${bmiProgressColor}`}
                          style={{ width: `${bmiPercent}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[9px] font-bold text-on-surface-variant tracking-wide px-0.5">
                        <span>18.5 (Min)</span>
                        <span>24.9 (Ideal)</span>
                        <span>30.0 (Obese)</span>
                      </div>
                    </div>
                  </div>

                  {/* Ideal weight card */}
                  {idealWeightMin && idealWeightMax && (
                    <div className="bg-primary/5 border border-primary/10 p-5 rounded-2xl space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-primary block">
                        Calculated Target Range
                      </span>
                      <p className="text-sm text-text-rich-black font-medium">
                        Based on your stature, your healthy weight margin lies between:
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-2xl font-headline font-black text-primary">
                          {idealWeightMin} - {idealWeightMax} <span className="text-sm font-bold text-on-surface-variant">kg</span>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Calculated daily calorie requirements estimate */}
                  {estimatedTdee && (
                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-2xl space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">
                        Recommended Calorie Target Needs
                      </span>
                      <p className="text-sm text-text-rich-black font-medium leading-relaxed">
                        Your estimated daily energy requirement based on health goal <strong>{healthGoals}</strong>:
                      </p>
                      <div className="flex items-center justify-between gap-3 pt-1">
                        <span className="text-2xl font-headline font-black text-emerald-600">
                          {estimatedTdee} <span className="text-sm font-bold text-on-surface-variant">kcal</span>
                        </span>
                        {Number(targetCalories) !== estimatedTdee && (
                          <button
                            type="button"
                            onClick={() => setTargetCalories(String(estimatedTdee))}
                            className="bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] font-bold py-1.5 px-3 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 border-none"
                            title="Auto-fill target calories field"
                          >
                            Apply Estimate
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* BMI Information snippet */}
                  <div className="text-[11px] text-on-surface-variant leading-relaxed space-y-1.5 font-medium">
                    <p>💡 **Underweight**: Below 18.5 BMI</p>
                    <p>💡 **Normal Margin**: 18.5 to 24.9 BMI</p>
                    <p>💡 **Overweight Margin**: 25.0 to 29.9 BMI</p>
                    <p>💡 **Obese Margin**: 30.0+ BMI</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-on-surface-variant space-y-2 font-medium">
                  <Scale className="w-10 h-10 mx-auto opacity-30 text-on-surface-variant" />
                  <p className="text-sm">Please input valid Weight and Height values to see your biological metrics analysis.</p>
                </div>
              )}
            </div>

            {/* Achievements & Badges Widget */}
            <div className="bg-surface-container-lowest border border-outline-variant/30 p-6 rounded-3xl shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-4">
                <div className="bg-primary/10 p-2 rounded-xl text-primary">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-text-rich-black">Achievements & Badges</h2>
                  <p className="text-xs text-on-surface-variant">Earn rewards by keeping up your logging habits.</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  {
                    name: "First Log",
                    description: "Logged your first meal!",
                    unlocked: (user?.streakCount > 0),
                    icon: Sparkles,
                    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
                  },
                  {
                    name: "3-Day Streak",
                    description: "Logged for 3 consecutive days!",
                    unlocked: (user?.streakCount >= 3),
                    icon: Flame,
                    color: "text-orange-500 bg-orange-500/10 border-orange-500/20",
                  },
                  {
                    name: "7-Day Streak",
                    description: "Logged for 7 consecutive days!",
                    unlocked: (user?.streakCount >= 7),
                    icon: Trophy,
                    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
                  },
                ].map((badge, idx) => {
                  const IconComponent = badge.icon;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${
                        badge.unlocked
                          ? "bg-surface-off-white border-outline-variant/25 opacity-100"
                          : "bg-surface-off-white/40 border-outline-variant/10 opacity-60"
                      }`}
                    >
                      <div
                        className={`p-3 rounded-xl border ${
                          badge.unlocked
                            ? badge.color
                            : "text-on-surface-variant bg-outline-variant/10 border-outline-variant/20"
                        }`}
                      >
                        <IconComponent className={`w-5 h-5 ${badge.unlocked && badge.name === 'Flame' ? 'animate-pulse' : ''}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-text-rich-black truncate">{badge.name}</h4>
                          {badge.unlocked ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/20">
                              Unlocked
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-outline-variant/10 text-on-surface-variant rounded-full border border-outline-variant/20">
                              Locked
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                          {badge.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </form>

        {/* ── Standalone Security Question Card ── */}
        <form
          onSubmit={handleSaveSecurityQuestion}
          className="bg-surface-container-lowest border border-outline-variant/30 p-6 rounded-3xl shadow-sm space-y-6 max-w-[1200px] w-full mx-auto px-[24px] md:px-8"
        >
          {/* Section header */}
          <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-4">
            <div className="bg-primary/10 p-2 rounded-xl text-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-text-rich-black">Password Recovery Question</h2>
              <p className="text-xs text-on-surface-variant">
                {hasSecurityQuestion
                  ? "✅ A security question is already set. Fill both fields below to update it."
                  : "⚠️ No security question set yet. Add one to recover your account without email."}
              </p>
            </div>
          </div>

          {/* Feedback banners */}
          {secSuccessMsg && (
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-200/50 p-4 rounded-2xl flex items-center gap-3 shadow-sm animate-slide-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <p className="text-sm font-semibold">{secSuccessMsg}</p>
            </div>
          )}
          {secErrorMsg && (
            <div className="bg-rose-50 text-rose-800 border border-rose-200/50 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
              <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
              <p className="text-sm font-semibold">{secErrorMsg}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Question input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-rich-black uppercase tracking-wider block">
                Custom Security Question
              </label>
              <input
                type="text"
                value={securityQuestion}
                onChange={(e) => setSecurityQuestion(e.target.value)}
                placeholder='e.g., "What was my first car brand?"'
                className="w-full bg-surface-off-white border border-outline-variant/35 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary font-medium"
              />
              <p className="text-[10px] text-on-surface-variant">
                💡 Choose something unique and memorable that only you'd know.
              </p>
            </div>

            {/* Answer input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-rich-black uppercase tracking-wider block">
                Your Answer
              </label>
              <input
                type="text"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                placeholder='e.g., "Toyota"'
                className="w-full bg-surface-off-white border border-outline-variant/35 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary font-medium"
              />
              <p className="text-[10px] text-on-surface-variant">
                🔒 Your question is stored as-is. Only your answer is salted and hashed for security.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={secLoading || !securityQuestion.trim() || !securityAnswer.trim()}
              className={`px-8 py-3.5 rounded-2xl text-sm font-bold shadow-md cursor-pointer transition-all duration-200 ${secLoading || !securityQuestion.trim() || !securityAnswer.trim()
                ? "bg-outline-variant/40 text-on-surface-variant cursor-not-allowed shadow-none"
                : "bg-primary text-white hover:bg-primary-container hover:shadow-lg active:scale-95"
                }`}
            >
              {secLoading ? "Saving..." : hasSecurityQuestion ? "Update Security Question" : "Set Security Question"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default Profile;
