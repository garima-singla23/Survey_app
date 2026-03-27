import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const StatCard = ({ label, value, color = 'bg-blue-500' }) => (
  <div className={`${color} rounded-lg p-6 text-white shadow-lg`}>
    <p className="text-sm font-medium opacity-90">{label}</p>
    <p className="text-3xl font-bold mt-2">{value}</p>
  </div>
);

const ChartCard = ({ title, children, loading = false }) => (
  <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
    <h3 className="text-xl font-bold mb-4 text-gray-800">{title}</h3>
    {loading ? (
      <div className="flex items-center justify-center h-64 text-gray-500">Loading chart...</div>
    ) : (
      children
    )}
  </div>
);

export default function Admin() {
  const [dashboardStats, setDashboardStats] = useState(null);
  const [personalityData, setPersonalityData] = useState([]);
  const [scoresDistribution, setScoresDistribution] = useState(null);
  const [goalsData, setGoalsData] = useState([]);
  const [stressData, setStressData] = useState([]);
  const [sleepData, setSleepData] = useState([]);
  const [studyData, setStudyData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAllAnalytics();
  }, []);

  const fetchAllAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const endpoints = [
        { key: 'dashboardStats', url: '/admin/dashboard-stats' },
        { key: 'personalityData', url: '/admin/personality-distribution' },
        { key: 'scoresDistribution', url: '/admin/scores-distribution' },
        { key: 'goalsData', url: '/admin/goals-distribution' },
        { key: 'stressData', url: '/admin/stress-levels' },
        { key: 'sleepData', url: '/admin/sleep-patterns' },
        { key: 'studyData', url: '/admin/study-hours' },
        { key: 'attendanceData', url: '/admin/attendance-distribution' }
      ];

      const results = await Promise.all(
        endpoints.map(ep =>
          fetch(`${API_BASE}/dna${ep.url}`)
            .then(res => res.json())
            .then(data => ({ key: ep.key, data }))
            .catch(err => ({ key: ep.key, error: err }))
        )
      );

      results.forEach(result => {
        if (result.key === 'dashboardStats') setDashboardStats(result.data);
        else if (result.key === 'personalityData') setPersonalityData(result.data || []);
        else if (result.key === 'scoresDistribution') setScoresDistribution(result.data);
        else if (result.key === 'goalsData') setGoalsData(result.data || []);
        else if (result.key === 'stressData') setStressData(result.data || []);
        else if (result.key === 'sleepData') setSleepData(result.data || []);
        else if (result.key === 'studyData') setStudyData(result.data || []);
        else if (result.key === 'attendanceData') setAttendanceData(result.data || []);
      });
    } catch (err) {
      setError('Failed to fetch analytics data');
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const transformScoresData = () => {
    if (!scoresDistribution) return [];
    const { disciplines, chaos, ambition } = scoresDistribution;
    return Object.keys(disciplines).map(range => ({
      range,
      Discipline: disciplines[range],
      Chaos: chaos[range],
      Ambition: ambition[range]
    }));
  };

  if (error && !dashboardStats) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="text-red-600 text-center">{error}</div>
        <button
          onClick={fetchAllAnalytics}
          className="block mx-auto mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Analytics Dashboard</h1>
        <p className="text-gray-600">Real-time survey data and insights from Student DNA Report</p>
      </div>

      {/* Key Stats */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {dashboardStats.stats?.map((stat, idx) => (
            <StatCard
              key={idx}
              label={stat.label}
              value={stat.value}
              color={[
                'bg-blue-500',
                'bg-green-500',
                'bg-purple-500',
                'bg-orange-500',
                'bg-red-500'
              ][idx % 5]}
            />
          ))}
        </div>
      )}

      {/* Refresh Button */}
      <div className="mb-6">
        <button
          onClick={fetchAllAnalytics}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
        >
          {loading ? 'Loading...' : 'Refresh Data'}
        </button>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personality Distribution - Pie Chart */}
        {personalityData.length > 0 && (
          <ChartCard title="Personality Type Distribution" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={personalityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {personalityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} responses`} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Stress Levels - Pie Chart */}
        {stressData.length > 0 && (
          <ChartCard title="Stress Level Distribution" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stressData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stressData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} students`} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Scores Distribution - Bar Chart */}
        {scoresDistribution && (
          <ChartCard title="Score Range Distribution" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={transformScoresData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Discipline" fill="#3b82f6" />
                <Bar dataKey="Chaos" fill="#ef4444" />
                <Bar dataKey="Ambition" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Top Goals - Bar Chart */}
        {goalsData.length > 0 && (
          <ChartCard title="Primary Goals Distribution" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={goalsData.slice(0, 6)}
                layout="vertical"
                margin={{ left: 200, right: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={190} />
                <Tooltip />
                <Bar dataKey="value" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Sleep Patterns - Horizontal Bar Chart */}
        {sleepData.length > 0 && (
          <ChartCard title="Sleep Patterns" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={sleepData}
                layout="vertical"
                margin={{ left: 200, right: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={190} fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Study Hours - Bar Chart */}
        {studyData.length > 0 && (
          <ChartCard title="Daily Study Hours" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={studyData}
                layout="vertical"
                margin={{ left: 150, right: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={140} fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="#ec4899" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Attendance - Bar Chart */}
        {attendanceData.length > 0 && (
          <ChartCard title="Attendance Distribution" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={attendanceData}
                layout="vertical"
                margin={{ left: 180, right: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={170} fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="#14b8a6" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Top Personalities Table */}
        {dashboardStats?.topPersonalities && (
          <ChartCard title="Top Personality Types" loading={loading}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-3 font-semibold">Personality Type</th>
                    <th className="text-right p-3 font-semibold">Count</th>
                    <th className="text-right p-3 font-semibold">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardStats.topPersonalities.map((item, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-3">{item._id || 'Unknown'}</td>
                      <td className="text-right p-3 font-semibold">{item.count}</td>
                      <td className="text-right p-3">
                        {dashboardStats.totalResponses > 0
                          ? ((item.count / dashboardStats.totalResponses) * 100).toFixed(1)
                          : 0}
                        %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        )}

        {/* Average Scores Table */}
        {dashboardStats?.stats && (
          <ChartCard title="Average Metrics Summary" loading={loading}>
            <div className="space-y-4">
              {dashboardStats.stats
                .filter(stat => stat.label.includes('Avg'))
                .map((stat, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
                  >
                    <span className="font-medium text-gray-700">{stat.label}</span>
                    <span className="text-2xl font-bold text-blue-600">{stat.value}</span>
                  </div>
                ))}
            </div>
          </ChartCard>
        )}
      </div>

      {/* Summary Section */}
      <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Data Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
          <div>
            <p className="font-semibold">Total Survey Responses: {dashboardStats?.totalResponses || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Last Updated: {new Date().toLocaleString()}</p>
          </div>
          <div>
            <p className="font-semibold">Charts Available: {[personalityData, sleepData, studyData, attendanceData].filter(d => d?.length > 0).length}</p>
            <p className="text-sm text-gray-600 mt-1">All data is connected to MongoDB</p>
          </div>
        </div>
      </div>
    </div>
  );
}
