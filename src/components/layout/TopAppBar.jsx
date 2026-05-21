import React, { useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { ArrowLeft } from "lucide-react";

const TopAppBar = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  // If path is not dashboard, render a back button instead of profile avatar
  const isDashboard = location.pathname === "/dashboard";

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-6 h-16 bg-surface-container-lowest/80 backdrop-blur-md shadow-sm transition-transform duration-150">
      {/* Left Action: Profile Avatar or Back Button */}
      <div className="flex items-center">
        {!isDashboard ? (
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary transition-all cursor-pointer group bg-surface-container-lowest border border-outline-variant/30 px-4 py-2 rounded-full shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </button>
        ) : (
          <button
            onClick={() => navigate("/profile")}
            className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-primary-container flex items-center justify-center shadow-sm cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all duration-150 active:scale-95"
            title="View Profile"
          >
            {user?.profilePic ? (
              <img alt="Profile" className="w-full h-full object-cover" src={user.profilePic} />
            ) : (
              <span className="material-symbols-outlined text-on-primary-container text-[20px]">person</span>
            )}
          </button>
        )}
      </div>

      {/* Brand */}
      <div className="font-headline text-xl font-bold text-primary tracking-tight">
        Mezan میزان
      </div>

      {/* Notification Bell */}
      <button className="w-9 h-9 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors cursor-pointer">
        <span className="material-symbols-outlined">notifications</span>
      </button>
    </header>
  );
};

export default TopAppBar;
