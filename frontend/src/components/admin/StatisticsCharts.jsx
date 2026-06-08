// src/components/admin/StatisticsCharts.jsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#800000', '#ab1f1f', '#cc2929', '#e04545', '#f5a9a9'];

export default function StatisticsCharts({ stats }) {
  if (!stats) {
    return (
      <div className="card p-6">
        <p className="text-gray-500 text-center">No statistics available.</p>
      </div>
    );
  }

  const statusData = [
    { name: 'Active', value: stats.activeCases || stats.totalMissing || 0 },
    { name: 'Found', value: stats.foundCases || 0 },
    { name: 'Archived', value: stats.archivedCases || 0 },
  ].filter((d) => d.value > 0);

  const matchData = [
    { name: 'Verified', value: stats.verifiedMatches || 0 },
    { name: 'Rejected', value: stats.rejectedMatches || 0 },
    { name: 'Pending', value: stats.pendingMatches || 0 },
    { name: 'Investigating', value: stats.investigatingMatches || 0 },
  ].filter((d) => d.value > 0);

  const weeklyData = stats.weeklyStats || [
    { day: 'Mon', sightings: 12, matches: 4 },
    { day: 'Tue', sightings: 19, matches: 6 },
    { day: 'Wed', sightings: 15, matches: 5 },
    { day: 'Thu', sightings: 22, matches: 8 },
    { day: 'Fri', sightings: 18, matches: 7 },
    { day: 'Sat', sightings: 25, matches: 10 },
    { day: 'Sun', sightings: 14, matches: 3 },
  ];

  return (
    <div className="space-y-6">
      {/* Weekly Bar Chart */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Overview</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <Tooltip />
            <Bar dataKey="sightings" fill="#800000" radius={[4, 4, 0, 0]} name="Sightings" />
            <Bar dataKey="matches" fill="#f5a9a9" radius={[4, 4, 0, 0]} name="Matches" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {statusData.length > 0 && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Case Status</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {matchData.length > 0 && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Match Status</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={matchData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {matchData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}