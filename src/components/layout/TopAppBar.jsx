import React, { useContext, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { ArrowLeft } from "lucide-react";
import client from "../../api/client";

const TopAppBar = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // If path is not dashboard, render a back button instead of profile avatar
  const isDashboard = location.pathname === "/dashboard";

  useEffect(() => {
    if (isDashboard && user) {
      const fetchWeather = async () => {
        setWeatherLoading(true);
        try {
          const { data } = await client.get("/api/weather");
          setWeather(data);
        } catch (error) {
          console.error("Failed to fetch weather:", error);
        } finally {
          setWeatherLoading(false);
        }
      };
      fetchWeather();
    }
  }, [isDashboard, user]);

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

      {/* Actions: Weather + Notification */}
      <div className="flex items-center gap-2">
        {isDashboard && (
          weatherLoading ? (
            <div className="w-[70px] h-[28px] rounded-full bg-surface-container-low/60 animate-pulse border border-outline-variant/20"></div>
          ) : weather ? (
            <div className="relative group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low/60 hover:bg-surface-container-low border border-outline-variant/30 backdrop-blur-md cursor-pointer transition-all duration-200 shadow-sm text-xs font-medium text-on-surface select-none">
              <span className="material-symbols-outlined text-primary text-[18px]">
                {weather.current.icon}
              </span>
              <span>{weather.current.temp}°C</span>
              
              {/* Elegant glassmorphic tooltip */}
              <div className="absolute top-11 right-0 w-56 p-3 bg-surface-container-lowest/95 backdrop-blur-md border border-outline-variant/40 rounded-xl shadow-xl opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none transition-all duration-200 text-left z-50">
                <div className="font-bold text-on-surface text-[13px] flex items-center justify-between gap-1 mb-1">
                  <span>{weather.location.name}</span>
                  <span className="text-xs font-normal text-on-surface-variant flex items-center gap-0.5">
                    {weather.current.condition} {weather.current.emoji}
                  </span>
                </div>
                <div className="text-[11px] text-on-surface-variant flex flex-col gap-0.5 border-t border-outline-variant/20 pt-1.5 mt-1">
                  <div>Feels like: <span className="font-semibold text-on-surface">{weather.current.feelsLike}°C</span></div>
                  <div>Humidity: <span className="font-semibold text-on-surface">{weather.current.humidity}%</span></div>
                  <div>Wind speed: <span className="font-semibold text-on-surface">{weather.current.windSpeed} km/h</span></div>
                  {weather.current.precipitation > 0 && (
                    <div>Precipitation: <span className="font-semibold text-on-surface">{weather.current.precipitation} mm</span></div>
                  )}
                </div>
              </div>
            </div>
          ) : null
        )}
        
        <button className="w-9 h-9 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors cursor-pointer">
          <span className="material-symbols-outlined">notifications</span>
        </button>
      </div>
    </header>
  );
};

export default TopAppBar;

