import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format } from 'date-fns';

export default function UptimeChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No data available for chart
      </div>
    );
  }

  // Group data by hour and calculate success rate
  const hourlyData = {};
  
  data.forEach(item => {
    const hour = format(new Date(item.timestamp), 'HH:00');
    if (!hourlyData[hour]) {
      hourlyData[hour] = { success: 0, failure: 0 };
    }
    
    if (item.status === 'success') {
      hourlyData[hour].success++;
    } else {
      hourlyData[hour].failure++;
    }
  });

  const chartData = Object.keys(hourlyData).map(hour => {
    const total = hourlyData[hour].success + hourlyData[hour].failure;
    const successRate = total > 0 ? (hourlyData[hour].success / total) * 100 : 0;
    
    return {
      time: hour,
      uptime: parseFloat(successRate.toFixed(2)),
      checks: total
    };
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="time" 
          tick={{ fontSize: 12 }}
        />
        <YAxis 
          label={{ value: 'Uptime %', angle: -90, position: 'insideLeft' }}
          tick={{ fontSize: 12 }}
          domain={[0, 100]}
        />
        <Tooltip 
          contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
          labelStyle={{ fontWeight: 'bold' }}
          formatter={(value, name) => {
            if (name === 'uptime') return [`${value}%`, 'Uptime'];
            return [value, name];
          }}
        />
        <Bar dataKey="uptime" fill="#10b981" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.uptime === 100 ? '#10b981' : entry.uptime >= 80 ? '#f59e0b' : '#ef4444'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
