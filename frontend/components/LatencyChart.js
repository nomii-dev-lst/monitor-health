import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

export default function LatencyChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No data available for chart
      </div>
    );
  }

  // Format data for chart
  const chartData = data.map(item => ({
    time: format(new Date(item.timestamp), 'HH:mm'),
    latency: item.latency,
    status: item.status
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="time" 
          tick={{ fontSize: 12 }}
        />
        <YAxis 
          label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft' }}
          tick={{ fontSize: 12 }}
        />
        <Tooltip 
          contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
          labelStyle={{ fontWeight: 'bold' }}
        />
        <Line 
          type="monotone" 
          dataKey="latency" 
          stroke="#0ea5e9" 
          strokeWidth={2}
          dot={{ fill: '#0ea5e9', r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
