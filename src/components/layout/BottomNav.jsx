import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

const navItems = [
  { icon: "dashboard", label: "Home", path: "/dashboard" },
  { icon: "restaurant_menu", label: "Log", path: "/meal-plan" },
  { icon: "smart_toy", label: "AI Coach", path: "/chat" },
  { icon: "person", label: "Profile", path: "/profile" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-4 pt-2 bg-surface-container-lowest shadow-[0_-4px_6px_-1px_rgba(17,24,39,0.05)] rounded-t-xl">
      {navItems.map((item) => {
        const isActive = item.id
          ? false
          : location.pathname === item.path ||
            (item.path === "/chat" && location.pathname.startsWith("/chat"));

        return (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center px-4 py-1 rounded-full transition-all duration-200 active:scale-90 cursor-pointer ${
              isActive
                ? "bg-secondary-container text-primary"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            <span
              className="material-symbols-outlined mb-0.5"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {item.icon}
            </span>
            <span className="text-[11px] font-semibold tracking-wide">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
