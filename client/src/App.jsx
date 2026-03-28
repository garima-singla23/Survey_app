import { useEffect, useMemo, useState } from 'react';
import SurveyForm from './SurveyForm.jsx';
import Results from './Results.jsx';
import Admin from './Admin.jsx';

const scoreMaps = {
  sleepTime: {
    'Less than 5 hours': 30,
    '5–6 hours': 60,
    '6–7 hours': 80,
    '7–8 hours': 100,
    'More than 8 hours': 90,
    'Sleep is a myth 😴': 10
  },
  studyHours: {
    '0–1 hrs': 30,
    '1–3 hrs': 60,
    '3–5 hrs': 85,
    '5+ hrs': 100,
    'Define study': 5
  },
  attendance: {
    '75%+ (Sincere hai bhai)': 100,
    '50–75%': 70,
    '25–50%': 35,
    'What are lectures?': 5
  },
  examPrepTiming: {
    '1 month before': 100,
    '1 week before': 75,
    '1 night before': 30,
    'During the exam': 0
  },
  kalSePadhunga: {
    '0 (Liar)': 10,
    '1–3': 40,
    '4–7': 70,
    'Lost count': 100
  },
  examSleep: {
    'Full 8 hrs': 10,
    '4–5 hrs': 45,
    '2 hrs': 75,
    'What is sleep': 100
  },
  submissionBehavior: {
    'Done since yesterday': 10,
    'Starting now': 60,
    'Googling for extensions': 85,
    'Submitting whatever exists': 100
  },
  primaryGoal: {
    Money: 95,
    Peace: 40,
    Success: 90,
    'Just survive this semester': 55
  },
  motivationFrequency: {
    Daily: 100,
    Weekly: 70,
    Rarely: 35,
    'Motivation left the chat': 10
  },
  stressLevel: {
    1: 20,
    2: 40,
    3: 60,
    4: 80,
    5: 100
  }
};

const roastByType = {
  'Last-Minute Legend': 'Your best work happens in panic. Cortisol is your productivity hack.',
  'Burnt-Out Overachiever': 'You do everything and feel nothing. Classic.',
  'Peaceful Coaster': 'Life is good until results come out.',
  'Silent Disciplined Machine': 'You schedule your chaos and somehow still look calm.',
  'High-Ambition Chaotic Performer': 'You chase goals at lightspeed with zero regard for sleep.',
  'The Philosopher': 'You overthink the plan, then vibe through the execution.'
};

const clamp = (value) => Math.max(0, Math.min(100, Math.round(value)));

const average = (arr) => arr.reduce((sum, val) => sum + val, 0) / arr.length;

const generateStudentAlias = (personalityType) => {
  const timestamp = Date.now().toString(16).slice(-4);
  return `${personalityType} #${timestamp}`;
};

const normalizeName = (rawName) => (rawName || '').trim().slice(0, 20);

const getPersonalityType = ({ disciplineScore, chaosScore, ambitionScore }) => {
  if (disciplineScore > 60 && chaosScore > 60 && ambitionScore > 60) {
    return 'Burnt-Out Overachiever';
  }
  if (disciplineScore > 60 && chaosScore < 40) {
    return 'Silent Disciplined Machine';
  }
  if (disciplineScore < 40 && chaosScore > 60 && ambitionScore > 50) {
    return 'Last-Minute Legend';
  }
  if (disciplineScore > 50 && ambitionScore > 60) {
    return 'High-Ambition Chaotic Performer';
  }
  if (ambitionScore < 40 && chaosScore < 40) {
    return 'Peaceful Coaster';
  }
  return 'The Philosopher';
};

const calculateScores = (answers) => {
  const disciplineScore = clamp(
    average([
      scoreMaps.sleepTime[answers.sleepTime],
      scoreMaps.studyHours[answers.studyHours],
      scoreMaps.attendance[answers.attendance],
      scoreMaps.examPrepTiming[answers.examPrepTiming]
    ])
  );

  const chaosScore = clamp(
    average([
      scoreMaps.kalSePadhunga[answers.kalSePadhunga],
      scoreMaps.examSleep[answers.examSleep],
      scoreMaps.submissionBehavior[answers.submissionBehavior]
    ])
  );

  const ambitionScore = clamp(
    average([
      scoreMaps.primaryGoal[answers.primaryGoal],
      scoreMaps.motivationFrequency[answers.motivationFrequency],
      scoreMaps.stressLevel[answers.stressLevel]
    ])
  );

  return { disciplineScore, chaosScore, ambitionScore };
};

const App = () => {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') {
      return 'dark';
    }
    const savedTheme = localStorage.getItem('student-dna-theme');
    if (savedTheme) {
      return savedTheme;
    }
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    return prefersLight ? 'light' : 'dark';
  });
  const [currentView, setCurrentView] = useState('survey'); // 'survey' or 'admin'
  const [report, setReport] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const apiUrl = useMemo(() => {
    const configuredUrl = import.meta.env.VITE_API_URL;
    return configuredUrl ? configuredUrl.replace(/\/$/, '') : '';
  }, []);

  const fetchLeaderboard = async () => {
    if (!apiUrl) {
      setLeaderboard([]);
      setCurrentUser(null);
      setLeaderboardLoading(false);
      return;
    }

    setLeaderboardLoading(true);
    try {
      const savedDisplayName = normalizeName(localStorage.getItem('studentDisplayName'));
      const queryParam = savedDisplayName ? `?displayName=${encodeURIComponent(savedDisplayName)}` : '';
      const response = await fetch(`${apiUrl}/api/dna${queryParam}`);
      if (!response.ok) {
        throw new Error('Leaderboard unavailable');
      }
      const data = await response.json();
      setLeaderboard(data.leaderboard || []);
      setCurrentUser(data.currentUser || null);
    } catch {
      setLeaderboard([]);
      setCurrentUser(null);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  useEffect(() => {
    if (report) {
      fetchLeaderboard();
    }
  }, [report]);

  useEffect(() => {
    const isLight = theme === 'light';
    document.body.classList.toggle('light-theme', isLight);
    localStorage.setItem('student-dna-theme', theme);
  }, [theme]);

  const submitEntryImmediately = async ({ answers, scores, personalityType, displayName }) => {
    if (!apiUrl) {
      return false;
    }

    const totalScore = Number(scores.disciplineScore) + Number(scores.chaosScore) + Number(scores.ambitionScore);
    const timestamp = new Date().toISOString();

    const payload = {
      name: displayName,
      displayName,
      studentType: personalityType,
      personalityType,
      disciplineScore: Number(scores.disciplineScore),
      chaosScore: Number(scores.chaosScore),
      ambitionScore: Number(scores.ambitionScore),
      totalScore,
      timestamp,
      submittedAt: timestamp,
      ...answers
    };

    const response = await fetch(`${apiUrl}/api/dna`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return response.ok;
  };

  const handleSurveyComplete = async (answers) => {
    const scores = calculateScores(answers);
    const personalityType = getPersonalityType(scores);

    const savedDisplayName = normalizeName(localStorage.getItem('studentDisplayName'));
    const finalDisplayName = savedDisplayName || generateStudentAlias(personalityType);
    localStorage.setItem('studentDisplayName', finalDisplayName);

    const stressPercentile = clamp(((answers.stressLevel - 1) / 4) * 100);
    const topDisciplinedPercent = Math.max(1, 100 - scores.disciplineScore);

    let persistedToLeaderboard = false;
    try {
      persistedToLeaderboard = await submitEntryImmediately({
        answers,
        scores,
        personalityType,
        displayName: finalDisplayName
      });
    } catch {
      persistedToLeaderboard = false;
    }

    setReport({
      ...answers,
      ...scores,
      displayName: finalDisplayName,
      personalityType,
      totalScore: Number(scores.disciplineScore) + Number(scores.chaosScore) + Number(scores.ambitionScore),
      isPersisted: persistedToLeaderboard,
      roastLine: roastByType[personalityType],
      stressPercentile,
      topDisciplinedPercent
    });
    setSubmitError('');
    setAnalytics(null);
    setCurrentUser(null);
  };

  const handleSubmitToBackend = async () => {
    if (!report) {
      return;
    }

    if (!apiUrl) {
      setSubmitError('API URL is not configured. Set VITE_API_URL in your environment.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      if (!report.isPersisted) {
        const postResponse = await fetch(`${apiUrl}/api/dna`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...report,
            displayName: normalizeName(localStorage.getItem('studentDisplayName')) || report.displayName,
            submittedAt: new Date().toISOString()
          })
        });

        if (!postResponse.ok) {
          throw new Error('Submission failed. Please try again.');
        }

        setReport((prev) => ({ ...prev, isPersisted: true }));
      }

      localStorage.setItem('studentDisplayName', report.displayName);

      const analyticsResponse = await fetch(`${apiUrl}/api/dna/analytics`);
      if (!analyticsResponse.ok) {
        throw new Error('Saved, but analytics could not be loaded.');
      }

      const analyticsData = await analyticsResponse.json();
      setAnalytics(analyticsData);
      await fetchLeaderboard();
    } catch (error) {
      setSubmitError(error.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="app-root">
      {/* Navigation Bar */}
      <nav className="top-tabs-shell">
        <div className="top-tabs-inner">
          <div className="top-tabs-row">
            <button
              onClick={() => {
                setCurrentView('survey');
                setReport(null);
              }}
              className={`top-tab-btn ${currentView === 'survey' ? 'active' : ''}`}
            >
              <span className="top-tab-icon" aria-hidden="true">📊</span>
              <span className="top-tab-label">SURVEY</span>
            </button>
            <button
              onClick={() => setCurrentView('admin')}
              className={`top-tab-btn ${currentView === 'admin' ? 'active' : ''}`}
            >
              <span className="top-tab-icon" aria-hidden="true">📈</span>
              <span className="top-tab-label">ADMIN ANALYTICS</span>
            </button>
          </div>
          <button
            type="button"
            className="theme-toggle-btn top-theme-toggle"
            onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
          >
            {theme === 'dark' ? '☀️ LIGHT' : '🌙 DARK'}
          </button>
        </div>
      </nav>

      {/* Admin View */}
      {currentView === 'admin' && <Admin />}

      {/* Survey View */}
      {currentView === 'survey' && (
        <div className="app-container">
          {!report && (
            <header className="survey-header">
              <div className="header-badge">
                <span className="pulse-dot" />
                <span>⚡ STUDENT DNA ANALYSIS v2.0</span>
              </div>

              <h1 className="survey-title">
                <span>WHAT TYPE OF</span>
                <span className="survey-title-gradient">STUDENT ARE YOU?</span>
              </h1>

              <p className="survey-subtitle">
                13 brutally honest questions. 1 personality verdict. No sugarcoating.
              </p>

              <div className="hero-stats-row">
                <div className="hero-stat-pill">
                  <span className="hero-stat-label">⏱</span>
                  <span className="hero-stat-value">3 MIN</span>
                </div>
                <div className="hero-stat-pill">
                  <span className="hero-stat-label">🔒</span>
                  <span className="hero-stat-value">ANONYMOUS</span>
                </div>
                <div className="hero-stat-pill">
                  <span className="hero-stat-label">📊</span>
                  <span className="hero-stat-value">13 QUESTIONS</span>
                </div>
              </div>
            </header>
          )}

          {!report ? (
            <SurveyForm onComplete={handleSurveyComplete} />
          ) : (
            <Results
              report={report}
              analytics={analytics}
              leaderboard={leaderboard}
              currentUser={currentUser}
              leaderboardLoading={leaderboardLoading}
              onSubmit={handleSubmitToBackend}
              onRetake={() => setReport(null)}
              isSubmitting={submitting}
              error={submitError}
            />
          )}
        </div>
      )}
    </main>
  );
};

export default App;
