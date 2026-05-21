import React, { useState, useContext, useEffect } from "react";
import client from "../api/client";
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext } from "../context/AuthContext";

const STAPLES = [
  { name: "Eggs", icon: "egg" },
  { name: "Chicken Breast", icon: "poultry" },
  { name: "Oats", icon: "grain" },
  { name: "Greek Yogurt", icon: "flatware" },
  { name: "Rice", icon: "grain" },
  { name: "Banana", icon: "nutrition" },
  { name: "Avocado", icon: "nutrition" },
  { name: "Spinach", icon: "eco" },
  { name: "Milk", icon: "local_drinking_water" },
  { name: "Peanut Butter", icon: "cookie" },
  { name: "Salmon", icon: "flatware" },
  { name: "Almonds", icon: "energy_savings_leaf" },
];

const PantryManager = () => {
  const { user, refreshUser } = useContext(AuthContext);
  const [pantry, setPantry] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("All items synced");

  useEffect(() => {
    if (user?.pantry) {
      setPantry(user.pantry);
    }
  }, [user]);

  const updatePantryOnBackend = async (updatedPantry) => {
    setIsUpdating(true);
    setStatusMessage("Saving changes...");
    try {
      const { data } = await client.put("/api/users/profile", {
        pantry: updatedPantry,
      });
      setPantry(data.pantry || []);
      if (refreshUser) await refreshUser();
      setStatusMessage("All items synced");
    } catch (err) {
      console.error("Failed to update pantry", err);
      setStatusMessage("Sync failed. Trying again...");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddItem = async (e) => {
    if (e) e.preventDefault();
    const cleanItem = newItem.trim();
    if (!cleanItem) return;

    // Check for duplicates (case-insensitive)
    if (pantry.some((item) => item.toLowerCase() === cleanItem.toLowerCase())) {
      setNewItem("");
      return;
    }

    const updated = [...pantry, cleanItem];
    setPantry(updated);
    setNewItem("");
    await updatePantryOnBackend(updated);
  };

  const handleQuickAdd = async (itemName) => {
    if (pantry.some((item) => item.toLowerCase() === itemName.toLowerCase())) {
      return;
    }
    const updated = [...pantry, itemName];
    setPantry(updated);
    await updatePantryOnBackend(updated);
  };

  const handleRemoveItem = async (indexToRemove) => {
    const updated = pantry.filter((_, idx) => idx !== indexToRemove);
    setPantry(updated);
    await updatePantryOnBackend(updated);
  };

  return (
    <div className="glass-panel p-6 md:p-8 rounded-2xl shadow-sm border border-outline-variant/20 space-y-6">
      {/* Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/15 pb-4">
        <div>
          <h3 className="text-base md:text-lg font-black text-text-rich-black uppercase tracking-wider">
            My Pantry & Kitchen
          </h3>
          <p className="text-xs text-on-surface-variant mt-1 font-medium">
            List the items you have at home. Mezan AI Coach and Meal Planner will keep these in view!
          </p>
        </div>

        {/* Sync Status Badge */}
        <div className="flex items-center gap-1.5 self-start sm:self-center">
          <span
            className={`w-2 h-2 rounded-full ${
              isUpdating
                ? "bg-amber-400 animate-pulse"
                : statusMessage.includes("failed")
                ? "bg-red-500"
                : "bg-success-green"
            }`}
          />
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            {statusMessage}
          </span>
        </div>
      </div>

      {/* Add Item Form */}
      <form onSubmit={handleAddItem} className="flex gap-2">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
            shopping_basket
          </span>
          <input
            type="text"
            placeholder="Add an item (e.g. Eggs, Whole wheat bread)..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            className="kcal-input py-3.5 text-sm"
            style={{ paddingLeft: "2.75rem" }}
          />
        </div>
        <button
          type="submit"
          disabled={isUpdating}
          className="bg-primary hover:bg-[#2e542c] disabled:opacity-50 text-white p-3.5 rounded-xl transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-sm"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
        </button>
      </form>

      {/* Quick Add Staples */}
      <div className="space-y-2.5">
        <h4 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
          Quick Add Kitchen Staples
        </h4>
        <div className="flex flex-wrap gap-2">
          {STAPLES.map((staple) => {
            const isAlreadyAdded = pantry.some(
              (item) => item.toLowerCase() === staple.name.toLowerCase()
            );

            return (
              <button
                key={staple.name}
                type="button"
                onClick={() => handleQuickAdd(staple.name)}
                disabled={isAlreadyAdded}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide border transition-all cursor-pointer ${
                  isAlreadyAdded
                    ? "bg-primary-container/10 border-primary/20 text-primary opacity-50 cursor-not-allowed"
                    : "bg-surface-off-white border-outline-variant/30 text-on-surface-variant hover:border-primary hover:text-primary hover:bg-white"
                }`}
              >
                {staple.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pantry List */}
      <div className="space-y-3">
        <h4 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center justify-between">
          <span>Current Items at Home ({pantry.length})</span>
          {pantry.length > 0 && (
            <button
              type="button"
              onClick={() => updatePantryOnBackend([])}
              className="text-[10px] text-error font-bold tracking-widest hover:underline cursor-pointer uppercase"
            >
              Clear All
            </button>
          )}
        </h4>

        <div className="bg-surface-off-white rounded-2xl border border-outline-variant/20 p-4 min-h-[180px] max-h-[350px] overflow-y-auto">
          <AnimatePresence initial={false}>
            {pantry.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center text-center py-10 px-4 space-y-3"
              >
                <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[28px]">
                    kitchen
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-rich-black">
                    Your kitchen is empty
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Start adding items above to tailor your AI experience.
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {pantry.map((item, index) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -5 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-between bg-white pl-4 pr-2 py-2.5 rounded-xl border border-outline-variant/15 shadow-sm group hover:border-primary/20 transition-all"
                  >
                    <span className="text-sm font-semibold text-text-rich-black truncate">
                      {item}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        close
                      </span>
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default PantryManager;
