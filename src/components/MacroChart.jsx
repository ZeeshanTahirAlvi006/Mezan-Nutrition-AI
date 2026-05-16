import React from 'react';
import { RadialBarChart, RadialBar, Legend, Tooltip, ResponsiveContainer } from 'recharts';

const MacroChart = ({ totals }) => {
  const data = [
    { name: 'Calories', value: totals.calories || 0, fill: '#91C788' }, // kcal-green
    { name: 'Protein', value: totals.protein || 0, fill: '#FF8473' },   // kcal-coral
    { name: 'Carbs', value: totals.carbs || 0, fill: '#FFC857' },       // soft yellow
    { name: 'Fats', value: totals.fats || 0, fill: '#4E89AE' }          // soft blue
  ];

  // Detect if screen is small for legend positioning (Sync with platform lg breakpoint)
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 1024);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="h-80 w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart 
          cx="50%" 
          cy={isMobile ? "45%" : "50%"} 
          innerRadius="20%" 
          outerRadius="100%" 
          barSize={isMobile ? 10 : 12} 
          data={data}
        >
          <RadialBar
            minAngle={15}
            background={{ fill: 'rgba(145, 199, 136, 0.1)' }}
            clockWise
            dataKey="value"
            cornerRadius={10}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #eef7ed', 
              borderRadius: '16px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
            itemStyle={{ padding: '2px 0' }}
          />
          <Legend 
            iconSize={isMobile ? 8 : 10} 
            layout={isMobile ? "horizontal" : "vertical"} 
            verticalAlign={isMobile ? "bottom" : "middle"} 
            align={isMobile ? "center" : "right"}
            wrapperStyle={{ 
              fontSize: isMobile ? '10px' : '11px', 
              fontWeight: '800',
              color: '#7C7C7C',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              paddingTop: isMobile ? '20px' : '0'
            }} 
          />
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MacroChart;
