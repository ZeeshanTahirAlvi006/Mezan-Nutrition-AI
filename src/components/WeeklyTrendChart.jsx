import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import client from '../api/client';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * WeeklyTrendChart — Fetches the last 7 days of daily logs and renders
 * a smooth area chart with metric toggle buttons.
 */

const METRICS = [
  { key: 'calories', label: 'Calories', color: '#3a6937', unit: 'kcal' },
  { key: 'protein',  label: 'Protein',  color: '#92C68A', unit: 'g' },
  { key: 'carbs',    label: 'Carbs',    color: '#FCD34D', unit: 'g' },
  { key: 'fats',     label: 'Fats',     color: '#FB7185', unit: 'g' },
];

// Generate the last N dates as ISO strings (midnight-local → ISO)
const getLastNDates = (n) => {
  const dates = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    dates.push(d);
  }
  return dates;
};

const SHORT_DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CustomTooltip = ({ active, payload, label, activeMetric }) => {
  if (!active || !payload?.length) return null;
  const metric = METRICS.find((m) => m.key === activeMetric);
  return (
    <div className="bg-surface-container-lowest rounded-xl px-4 py-3 card-shadow-soft border border-outline-variant/30">
      <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="font-headline text-base font-bold" style={{ color: metric?.color }}>
        {Math.round(payload[0].value).toLocaleString()} {metric?.unit}
      </p>
    </div>
  );
};

const WeeklyTrendChart = () => {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState([]);
  const [activeMetric, setActiveMetric] = useState('calories');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeekData();
  }, []);

  const fetchWeekData = async () => {
    try {
      const dates = getLastNDates(7);
      const requests = dates.map((d) =>
        client
          .get(`/api/logs/daily/${d.toISOString()}`)
          .then((res) => res.data)
          .catch(() => ({
            totals: { calories: 0, protein: 0, carbs: 0, fats: 0 },
          }))
      );

      const results = await Promise.all(requests);

      const chartData = dates.map((d, i) => ({
        day: SHORT_DAY[d.getDay()],
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        calories: Math.round(results[i]?.totals?.calories || 0),
        protein: Math.round(results[i]?.totals?.protein || 0),
        carbs: Math.round(results[i]?.totals?.carbs || 0),
        fats: Math.round(results[i]?.totals?.fats || 0),
      }));

      setData(chartData);
    } catch (err) {
      console.error('[WeeklyTrendChart] Error fetching week data:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentMetric = METRICS.find((m) => m.key === activeMetric);

  // Calculate weekly average for display
  const weekAvg =
    data.length > 0
      ? Math.round(data.reduce((sum, d) => sum + d[activeMetric], 0) / data.length)
      : 0;

  // Calculate trend (today vs 3-day avg)
  const todayVal = data.length > 0 ? data[data.length - 1][activeMetric] : 0;
  const prevAvg =
    data.length >= 4
      ? Math.round(
          data.slice(-4, -1).reduce((s, d) => s + d[activeMetric], 0) / 3
        )
      : weekAvg;
  const trendPct = prevAvg > 0 ? Math.round(((todayVal - prevAvg) / prevAvg) * 100) : 0;

  return (
    <div className="bg-surface-container-lowest rounded-2xl card-shadow-soft border border-outline-variant/30 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">insights</span>
            <h3 className="font-headline text-base font-semibold text-on-surface">
              7-Day Trends
            </h3>
          </div>

          {/* Weekly stats pill */}
          <div className="flex items-center gap-2">
            <div className="bg-surface-container-low px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                Avg
              </span>
              <span
                className="font-headline text-xs font-bold"
                style={{ color: currentMetric?.color }}
              >
                {weekAvg.toLocaleString()} {currentMetric?.unit}
              </span>
            </div>
            {trendPct !== 0 && (
              <div
                className={`px-2 py-1 rounded-full flex items-center gap-0.5 ${
                  trendPct > 0
                    ? 'bg-success-green/15 text-success-green'
                    : 'bg-error-container/30 text-error'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {trendPct > 0 ? 'trending_up' : 'trending_down'}
                </span>
                <span className="text-[10px] font-bold">
                  {trendPct > 0 ? '+' : ''}{trendPct}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Metric toggle chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setActiveMetric(m.key)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-semibold tracking-wide transition-all cursor-pointer whitespace-nowrap ${
                activeMetric === m.key
                  ? 'text-white shadow-sm'
                  : 'bg-surface-container-low border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'
              }`}
              style={
                activeMetric === m.key
                  ? { backgroundColor: m.color }
                  : undefined
              }
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 pb-4">
        {loading ? (
          <div className="h-[220px] flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeMetric}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="h-[220px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data}
                  margin={{ top: 10, right: 16, left: -12, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id={`grad-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={currentMetric?.color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={currentMetric?.color} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-outline-variant)"
                    opacity={0.25}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 11,
                      fontWeight: 600,
                      fill: 'var(--color-on-surface-variant)',
                      fontFamily: 'Inter, sans-serif',
                    }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 10,
                      fill: 'var(--color-on-surface-variant)',
                      fontFamily: 'Inter, sans-serif',
                    }}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
                  />
                  <Tooltip
                    content={<CustomTooltip activeMetric={activeMetric} />}
                    cursor={{
                      stroke: currentMetric?.color,
                      strokeWidth: 1,
                      strokeDasharray: '4 4',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={activeMetric}
                    stroke={currentMetric?.color}
                    strokeWidth={2.5}
                    fill={`url(#grad-${activeMetric})`}
                    dot={{
                      r: 4,
                      fill: 'var(--color-surface-container-lowest)',
                      stroke: currentMetric?.color,
                      strokeWidth: 2,
                    }}
                    activeDot={{
                      r: 6,
                      fill: currentMetric?.color,
                      stroke: 'var(--color-surface-container-lowest)',
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default WeeklyTrendChart;
