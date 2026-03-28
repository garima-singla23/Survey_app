import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const ADMIN_PASSWORD = 'admin2024';
const SESSION_UNLOCK_KEY = 'adminUnlocked';
const SESSION_MODE_KEY = 'adminMode';

const PIE_COLORS = ['#00c8ff', '#ff5d5d', '#7c3aed', '#0ea5e9', '#14b8a6', '#f59e0b', '#22c55e', '#ec4899'];

const toChartData = (mapObj) => Object.entries(mapObj || {}).map(([name, value]) => ({ name, value }));

const formatLastSync = (iso) => {
  if (!iso) {
    return 'Never';
  }
  return new Date(iso).toLocaleString();
};

const safePercent = (part, total) => {
  if (!total) {
    return 0;
  }
  return Number(((part / total) * 100).toFixed(1));
};

const rankClass = (rank) => {
  if (rank === 1) {
    return 'rank-gold';
  }
  if (rank === 2) {
    return 'rank-silver';
  }
  if (rank === 3) {
    return 'rank-bronze';
  }
  return '';
};

const csvEscape = (value) => {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const SkeletonStatCard = () => (
  <div className="admin-stat-card skeleton-block">
    <div className="skeleton-line short" />
    <div className="skeleton-line large" />
  </div>
);

const SkeletonChartCard = () => (
  <article className="admin-card skeleton-block chart-card">
    <div className="skeleton-line medium" />
    <div className="skeleton-chart" />
  </article>
);

const ThemeToggleButton = ({ mode, onToggle }) => (
  <button
    type="button"
    className="theme-toggle-btn"
    onClick={onToggle}
    title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
  >
    {mode === 'dark' ? '☀️' : '🌙'}
  </button>
);

export default function Admin() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [mode, setMode] = useState('dark');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [backendStatus, setBackendStatus] = useState({
    ok: false,
    checked: false,
    message: 'Not checked'
  });

  useEffect(() => {
    const unlocked = sessionStorage.getItem(SESSION_UNLOCK_KEY) === 'true';
    const savedMode = sessionStorage.getItem(SESSION_MODE_KEY);
    setIsUnlocked(unlocked);
    if (savedMode === 'light' || savedMode === 'dark') {
      setMode(savedMode);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(SESSION_MODE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    if (isUnlocked) {
      fetchAnalytics();
    }
  }, [isUnlocked]);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const healthResponse = await fetch(`${API_BASE}/api/health`);
      if (!healthResponse.ok) {
        const text = await healthResponse.text();
        console.error('Health API error:', healthResponse.status, text);
        setBackendStatus({
          ok: false,
          checked: true,
          message: `Backend unavailable (Error ${healthResponse.status})`
        });
        throw {
          status: healthResponse.status,
          error: 'Backend health check failed',
          details: text || 'Health route is not reachable'
        };
      }

      setBackendStatus({
        ok: true,
        checked: true,
        message: 'Backend connected'
      });

      const response = await fetch(`${API_BASE}/api/admin/analytics`, {
        headers: {
          'x-admin-key': ADMIN_PASSWORD
        }
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('Admin API error:', response.status, text);

        let parsed = {};
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = { error: text || 'Request failed' };
        }

        throw {
          status: response.status,
          ...parsed
        };
      }

      const payload = await response.json();
      setData(payload);
    } catch (err) {
      const status = err?.status ? ` (Error ${err.status})` : '';
      setError({
        error: `⚠️ Failed to load analytics${status}. Check MongoDB connection or admin key.`,
        details: err?.details || err?.error || err?.message || 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isUnlocked) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (!document.hidden) {
        fetchAnalytics();
      }
    }, 30000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchAnalytics();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isUnlocked, fetchAnalytics]);

  const handleUnlock = (event) => {
    event.preventDefault();
    if (passwordDraft !== ADMIN_PASSWORD) {
      setUnlockError('Invalid password.');
      return;
    }
    sessionStorage.setItem(SESSION_UNLOCK_KEY, 'true');
    setUnlockError('');
    setPasswordDraft('');
    setIsUnlocked(true);
  };

  const handleExportCsv = () => {
    if (!data?.rawResponses?.length) {
      return;
    }

    const headers = [
      'Name',
      'StudentType',
      'DisciplineScore',
      'ChaosScore',
      'AmbitionScore',
      'SleepTime',
      'StudyHours',
      'Attendance',
      'ExamPrepTiming',
      'Timestamp'
    ];

    const lines = [headers.join(',')];
    data.rawResponses.forEach((row) => {
      lines.push(
        [
          row.name,
          row.studentType,
          row.disciplineScore,
          row.chaosScore,
          row.ambitionScore,
          row.sleepTime,
          row.studyHours,
          row.attendance,
          row.examPrepTiming,
          row.timestamp
        ]
          .map(csvEscape)
          .join(',')
      );
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `student-dna-responses-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalResponses = data?.totalResponses || 0;

  const typeDistribution = useMemo(() => toChartData(data?.studentTypeDistribution), [data]);
  const sleepData = useMemo(() => toChartData(data?.answerBreakdowns?.sleepTime), [data]);
  const studyData = useMemo(() => toChartData(data?.answerBreakdowns?.studyHours), [data]);
  const examPrepData = useMemo(() => toChartData(data?.answerBreakdowns?.examPrepTiming), [data]);
  const screenData = useMemo(() => toChartData(data?.answerBreakdowns?.screenTime), [data]);
  const motivationData = useMemo(() => toChartData(data?.answerBreakdowns?.motivationFrequency), [data]);

  const stressData = useMemo(() => {
    const bins = data?.answerBreakdowns?.stressLevel || {};
    return ['1', '2', '3', '4', '5'].map((level) => ({
      level,
      value: Number(bins[level] || 0)
    }));
  }, [data]);

  const mostCommonType = useMemo(() => {
    if (!typeDistribution.length) {
      return 'N/A';
    }
    return [...typeDistribution].sort((a, b) => b.value - a.value)[0].name;
  }, [typeDistribution]);

  const averageScores = useMemo(() => {
    if (!data?.avgScores) {
      return [];
    }
    return [
      { name: 'Discipline', value: Number(data.avgScores.discipline || 0), fill: '#00c8ff' },
      { name: 'Chaos', value: Number(data.avgScores.chaos || 0), fill: '#ef4444' },
      { name: 'Ambition', value: Number(data.avgScores.ambition || 0), fill: '#7c3aed' }
    ];
  }, [data]);

  const tableRows = data?.topStudents || [];

  const chartAxisColor = mode === 'dark' ? '#8b949e' : '#4a5568';
  const chartGridColor = mode === 'dark' ? '#30363d' : '#e2e8f0';
  const tooltipStyle = {
    backgroundColor: mode === 'dark' ? '#161b22' : '#ffffff',
    border: `1px solid ${mode === 'dark' ? '#30363d' : '#d0d7de'}`,
    color: mode === 'dark' ? '#e6edf3' : '#1f2328'
  };

  if (!isUnlocked) {
    return (
      <section className={`admin-panel ${mode}`}>
        <div className="admin-login-wrap">
          <form className="admin-login-card" onSubmit={handleUnlock}>
            <h2>ADMIN PANEL ACCESS</h2>
            <p>Enter password to unlock analytics.</p>
            <input
              type="password"
              value={passwordDraft}
              onChange={(event) => setPasswordDraft(event.target.value)}
              placeholder="Password"
              autoComplete="current-password"
            />
            {unlockError && <p className="admin-inline-error">{unlockError}</p>}
            <button type="submit">UNLOCK</button>
            <ThemeToggleButton 
              mode={mode} 
              onToggle={() => setMode((prev) => (prev === 'dark' ? 'light' : 'dark'))}
            />
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className={`admin-panel ${mode}`}>
      <div className="admin-inner">
        <header className="admin-header">
          <div>
            <h1>🧬 STUDENT DNA — ADMIN ANALYTICS</h1>
            <p>Real-time insights from MongoDB</p>
          </div>
          <div className="admin-header-actions">
            <span className={`admin-status-pill ${backendStatus.ok ? 'ok' : 'down'}`}>
              {backendStatus.checked ? backendStatus.message : 'Checking backend...'}
            </span>
            <span>Last synced: {formatLastSync(data?.lastUpdated)}</span>
            <button type="button" className="refresh-btn" onClick={fetchAnalytics} disabled={loading}>
              ↻ REFRESH
            </button>
            <ThemeToggleButton 
              mode={mode} 
              onToggle={() => setMode((prev) => (prev === 'dark' ? 'light' : 'dark'))}
            />
          </div>
        </header>

        {error && !loading ? (
          <div className="admin-error-card">
            <div>
              <p>{error.error}</p>
              {import.meta.env.DEV && <p>{error.details || error.error || 'Unknown error'}</p>}
              {!backendStatus.ok && <p>{backendStatus.message}</p>}
            </div>
            <button type="button" className="refresh-btn" onClick={fetchAnalytics}>
              RETRY
            </button>
          </div>
        ) : null}

        {loading ? (
          <>
            <div className="admin-stats-grid">
              {Array.from({ length: 4 }).map((_, idx) => (
                <SkeletonStatCard key={idx} />
              ))}
            </div>
            <div className="admin-charts-grid">
              {Array.from({ length: 8 }).map((_, idx) => (
                <SkeletonChartCard key={idx} />
              ))}
            </div>
          </>
        ) : null}

        {!loading && !error && totalResponses === 0 ? (
          <div className="admin-empty-state">
            <div className="empty-dna">🧬</div>
            <p>No survey responses yet. Share the quiz to collect data!</p>
          </div>
        ) : null}

        {!loading && !error && totalResponses > 0 ? (
          <>
            <div className="admin-stats-grid">
              <article className="admin-stat-card">
                <h3>Total Responses</h3>
                <p>{totalResponses}</p>
              </article>
              <article className="admin-stat-card">
                <h3>Most Common Student Type</h3>
                <p className="small-text">{mostCommonType}</p>
              </article>
              <article className="admin-stat-card">
                <h3>Average Chaos Score</h3>
                <p>{Math.round(data.avgScores.chaos)}</p>
              </article>
              <article className="admin-stat-card">
                <h3>Average Discipline Score</h3>
                <p>{Math.round(data.avgScores.discipline)}</p>
              </article>
            </div>

            <div className="admin-charts-grid">
              <article className="admin-card chart-card">
                <h2>Student Type Distribution</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={typeDistribution} dataKey="value" nameKey="name" innerRadius={58} outerRadius={98}>
                      {typeDistribution.map((entry, index) => (
                        <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value}`, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="chart-legend-list">
                  {typeDistribution.map((entry, index) => (
                    <div key={entry.name} className="chart-legend-item">
                      <span className="legend-dot" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                      <span>
                        {entry.name}: {entry.value} ({safePercent(entry.value, totalResponses)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="admin-card chart-card">
                <h2>Average DNA Scores</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={averageScores} layout="vertical" margin={{ top: 8, right: 24, left: 20, bottom: 8 }}>
                    <CartesianGrid stroke={chartGridColor} strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} stroke={chartAxisColor} />
                    <YAxis dataKey="name" type="category" stroke={chartAxisColor} width={90} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {averageScores.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                      <LabelList dataKey="value" position="right" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </article>

              <article className="admin-card chart-card">
                <h2>Sleep Patterns Across Students</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={sleepData} margin={{ top: 8, right: 10, left: 0, bottom: 36 }}>
                    <CartesianGrid stroke={chartGridColor} strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke={chartAxisColor} angle={-20} textAnchor="end" interval={0} height={70} />
                    <YAxis stroke={chartAxisColor} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" fill={mode === 'dark' ? '#00c8ff' : '#6366f1'} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </article>

              <article className="admin-card chart-card">
                <h2>Daily Study Hours</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={studyData} margin={{ top: 8, right: 10, left: 0, bottom: 30 }}>
                    <CartesianGrid stroke={chartGridColor} strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke={chartAxisColor} angle={-15} textAnchor="end" interval={0} height={60} />
                    <YAxis stroke={chartAxisColor} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" fill={mode === 'dark' ? '#7c3aed' : '#0ea5e9'} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </article>

              <article className="admin-card chart-card">
                <h2>When Do Students Start Studying for Exams?</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={examPrepData} layout="vertical" margin={{ top: 8, right: 12, left: 60, bottom: 8 }}>
                    <CartesianGrid stroke={chartGridColor} strokeDasharray="3 3" />
                    <XAxis type="number" stroke={chartAxisColor} />
                    <YAxis dataKey="name" type="category" stroke={chartAxisColor} width={120} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" fill={mode === 'dark' ? '#00c8ff' : '#6366f1'} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </article>

              <article className="admin-card chart-card">
                <h2>Stress Level Distribution (1–5)</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={stressData}>
                    <CartesianGrid stroke={chartGridColor} strokeDasharray="3 3" />
                    <XAxis dataKey="level" stroke={chartAxisColor} />
                    <YAxis stroke={chartAxisColor} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={mode === 'dark' ? '#ff5d5d' : '#ef4444'}
                      fill={mode === 'dark' ? 'rgba(255, 93, 93, 0.2)' : 'rgba(239, 68, 68, 0.2)'}
                    />
                    <Line type="monotone" dataKey="value" stroke={mode === 'dark' ? '#ff5d5d' : '#ef4444'} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </article>

              <article className="admin-card chart-card">
                <h2>Daily Phone Screen Time</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={screenData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={95}>
                      {screenData.map((entry, index) => (
                        <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </article>

              <article className="admin-card chart-card">
                <h2>How Often Students Feel Motivated</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={motivationData} dataKey="value" nameKey="name" outerRadius={100}>
                      {motivationData.map((entry, index) => (
                        <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </article>
            </div>

            <article className="admin-card top-students-card">
              <h2>🏆 TOP 10 STUDENTS BY CHAOS SCORE</h2>

              <div className="top-students-table-wrap">
                <table className="top-students-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Name</th>
                      <th>Student Type</th>
                      <th>Score</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((student, index) => {
                      const rank = index + 1;
                      return (
                        <tr key={`${student.name}-${student.timestamp}`} className={rankClass(rank)}>
                          <td>#{rank}</td>
                          <td>{student.name}</td>
                          <td>{student.type}</td>
                          <td>{student.score}</td>
                          <td>{new Date(student.timestamp).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="top-students-mobile">
                {tableRows.map((student, index) => {
                  const rank = index + 1;
                  return (
                    <div key={`${student.name}-${student.timestamp}-mobile`} className={`student-card ${rankClass(rank)}`}>
                      <p>
                        <strong>Rank:</strong> #{rank}
                      </p>
                      <p>
                        <strong>Name:</strong> {student.name}
                      </p>
                      <p>
                        <strong>Student Type:</strong> {student.type}
                      </p>
                      <p>
                        <strong>Score:</strong> {student.score}
                      </p>
                      <p>
                        <strong>Date:</strong> {new Date(student.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  );
                })}
              </div>

              <button type="button" className="export-btn" onClick={handleExportCsv}>
                EXPORT CSV
              </button>
            </article>
          </>
        ) : null}
      </div>
    </section>
  );
}
