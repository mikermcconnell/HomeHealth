import React from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface ScoreGaugeProps {
  score: number;
}

const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score }) => {
  const getColor = (s: number) => {
    if (s >= 80) return '#059669'; // Emerald
    if (s >= 50) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const data = [
    { name: 'Score', value: score, fill: getColor(score) }
  ];

  return (
    <div className="relative w-full h-48 flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart 
          innerRadius="70%" 
          outerRadius="100%" 
          barSize={10} 
          data={data} 
          startAngle={180} 
          endAngle={0}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            background
            dataKey="value"
            cornerRadius={30}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-4 text-center">
        <span className={`text-4xl font-bold`} style={{ color: getColor(score) }}>
          {score}%
        </span>
        <p className="text-gray-400 text-xs uppercase tracking-wide mt-1">Health Score</p>
      </div>
    </div>
  );
};

export default ScoreGauge;