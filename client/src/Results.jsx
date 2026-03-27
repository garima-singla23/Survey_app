import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';

const scoreBars = [
  { key: 'disciplineScore', label: 'Discipline', colorClass: 'discipline-fill' },
  { key: 'chaosScore', label: 'Chaos', colorClass: 'chaos-fill' },
  { key: 'ambitionScore', label: 'Ambition', colorClass: 'ambition-fill' }
];

const breakdownRows = [
  {
    trait: 'DISCIPLINE SIGNAL',
    description: 'Reflects structure, consistency, and how likely you are to start before panic mode.'
  },
  {
    trait: 'CHAOS INDEX',
    description: 'Measures deadline drama, sleep destruction, and your relationship with last-minute miracles.'
  },
  {
    trait: 'AMBITION DRIVE',
    description: 'Shows how strongly you chase outcomes, even if stress becomes your daily personality.'
  }
];

const personalityEmojis = {
  'Philosopher': '🧠',
  'Last-Minute Legend': '⚡',
  'Burnt-Out Overachiever': '🏆',
  'Silent Disciplined Machine': '🔥',
  'High-Ambition Chaotic Performer': '🌪️',
  'Peaceful Coaster': '⚖️'
};

const formatDisplayName = (rawName) =>
  (rawName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const Results = ({
  report,
  analytics,
  leaderboard,
  currentUser,
  leaderboardLoading,
  onSubmit,
  onRetake,
  isSubmitting,
  error
}) => {
  const [animatedScores, setAnimatedScores] = useState({
    disciplineScore: 0,
    chaosScore: 0,
    ambitionScore: 0
  });
  const [imageActionError, setImageActionError] = useState('');
  const captureRef = useRef(null);

  useEffect(() => {
    const duration = 1000;
    const startTime = performance.now();

    const animateScores = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);

      setAnimatedScores({
        disciplineScore: Math.round(report.disciplineScore * progress),
        chaosScore: Math.round(report.chaosScore * progress),
        ambitionScore: Math.round(report.ambitionScore * progress)
      });

      if (progress < 1) {
        requestAnimationFrame(animateScores);
      }
    };

    requestAnimationFrame(animateScores);
  }, [report]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.08
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: 'easeOut' }
    }
  };

  const titleVariants = {
    hidden: { opacity: 0, y: 18 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease: 'easeOut' }
    }
  };

  const generateResultBlob = async () => {
    if (!captureRef.current) {
      throw new Error('Result card unavailable for capture.');
    }

    const canvas = await html2canvas(captureRef.current, {
      backgroundColor: null,
      scale: 2,
      useCORS: true
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Could not generate image.'));
          return;
        }
        resolve(blob);
      }, 'image/png');
    });
  };

  const handleDownloadImage = async () => {
    setImageActionError('');
    try {
      const blob = await generateResultBlob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `student-dna-${report.personalityType.toLowerCase().replace(/\s+/g, '-')}.png`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setImageActionError(downloadError.message || 'Could not download image.');
    }
  };

  const handleShareImage = async () => {
    setImageActionError('');
    try {
      const blob = await generateResultBlob();
      const file = new File([blob], 'student-dna-report.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Student DNA Report',
          text: `I got ${report.personalityType} in Student DNA Report!`,
          files: [file]
        });
        return;
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'student-dna-report.png';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (shareImageError) {
      setImageActionError(shareImageError.message || 'Could not share image.');
    }
  };

  const handleShare = async () => {
    const text = `My Student DNA type is ${report.personalityType}. Discipline ${report.disciplineScore}/100, Chaos ${report.chaosScore}/100, Ambition ${report.ambitionScore}/100.`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Student DNA Report',
          text
        });
      } catch {
        return;
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
  };

  const stressStat = `${report.stressPercentile}%`;
  const disciplineStat = `${report.topDisciplinedPercent}%`;
  const studentDisplayName = typeof window !== 'undefined' ? localStorage.getItem('studentDisplayName') : '';
  const normalizedDisplayName = (studentDisplayName || report.displayName || '').trim();
  const formattedDisplayName = formatDisplayName(normalizedDisplayName);
  const isUserInLeaderboard = leaderboard?.some(
    (item) => ((item.displayName || item.name || '').trim() === normalizedDisplayName)
  );
  const personalityEmoji = personalityEmojis[report.personalityType] || '✨';

  return (
    <motion.section className="results-wrap" variants={containerVariants} initial="hidden" animate="visible">
      <div className="result-share-capture" ref={captureRef}>
        <p className="share-image-title">STUDENT DNA REPORT</p>
        <p className="share-image-subtitle">Results for {formattedDisplayName}</p>
        <motion.div className="personality-reveal-card" variants={cardVariants}>
          <div className="personality-shimmer"></div>
          <p className="personality-emoji">{personalityEmoji}</p>
          <p className="personality-greeting">HERE ARE YOUR RESULTS, {formattedDisplayName} 👋</p>
          <p className="personality-label">YOUR STUDENT DNA TYPE</p>
          <motion.h2 className="personality-title" variants={titleVariants}>
            {report.personalityType}
          </motion.h2>
          <p className="personality-roast">{report.roastLine}</p>
        </motion.div>

        <motion.div className="scores-card" variants={cardVariants}>
          <h3 className="scores-title">YOUR SCORES</h3>
          <p className="scores-subtitle">{formattedDisplayName}&apos;s Academic DNA Breakdown</p>
          {scoreBars.map((item) => (
            <div className="score-row" key={item.key}>
              <div className="score-row-label">
                <span>{item.label}</span>
                <strong className={item.colorClass}>{animatedScores[item.key]} / 100</strong>
              </div>
              <div className="score-track">
                <div className={`score-fill ${item.colorClass}`} style={{ width: `${animatedScores[item.key]}%` }} />
                <div className="score-you-marker" style={{ left: `${animatedScores[item.key]}%` }}>
                  <div className={`score-you-dot ${item.key}`}></div>
                  <span className="score-you-label">YOU</span>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      <motion.div className="peer-grid" variants={cardVariants}>
        <motion.article className="peer-card" variants={cardVariants}>
          <p className="peer-value">{stressStat}</p>
          <p className="peer-label">more stressed than your peers</p>
        </motion.article>
        <motion.article className="peer-card" variants={cardVariants}>
          <p className="peer-value">{disciplineStat}</p>
          <p className="peer-label">top disciplined in your batch</p>
        </motion.article>
      </motion.div>

      <motion.div className="meaning-card" variants={cardVariants}>
        <h3 className="meaning-title">WHAT THIS MEANS</h3>
        <p className="meaning-intro">Based on your answers, {formattedDisplayName}, here&apos;s what your DNA reveals:</p>
        {breakdownRows.map((row, idx) => {
          const borderClasses = [
            'trait-discipline',
            'trait-chaos',
            'trait-ambition'
          ];
          return (
            <div className={`meaning-row ${borderClasses[idx]}`} key={row.trait}>
              <p className="meaning-trait">{row.trait}</p>
              <p className="meaning-text">{row.description}</p>
            </div>
          );
        })}
      </motion.div>

      <motion.div className="share-submit-row" variants={cardVariants}>
        <motion.button
          type="button"
          className="result-btn download-btn"
          onClick={handleDownloadImage}
          whileHover={{ y: -2 }}
          whileTap={{ y: 0 }}
        >
          DOWNLOAD IMAGE
        </motion.button>
      </motion.div>

      <motion.div className="share-submit-row secondary-actions" variants={cardVariants}>
        <motion.button
          type="button"
          className="result-btn share-btn"
          onClick={handleShare}
          whileHover={{ y: -2 }}
          whileTap={{ y: 0 }}
        >
          SHARE MY RESULT
        </motion.button>
        <motion.button
          type="button"
          className="result-btn class-stats-btn"
          onClick={onSubmit}
          disabled={isSubmitting}
          whileHover={{ y: -2 }}
          whileTap={{ y: 0 }}
        >
          {isSubmitting ? 'SAVING...' : 'SEE CLASS STATS →'}
        </motion.button>
      </motion.div>

      <motion.div className="retake-row" variants={cardVariants}>
        <button type="button" className="result-btn retake-btn" onClick={onRetake}>
          RETAKE SURVEY
        </button>
      </motion.div>

      {error && <p className="results-error">{error}</p>}
      {imageActionError && <p className="results-error">{imageActionError}</p>}

      <motion.div className="leaderboard-card" variants={cardVariants}>
        <h3 className="leaderboard-title">CLASS CHAOS LEADERBOARD</h3>
        {leaderboardLoading ? (
          <p className="leaderboard-empty">Loading class stats...</p>
        ) : leaderboard?.length ? (
          <>
            <div className="leaderboard-list">
              {leaderboard.map((item) => {
                const itemName = (item.displayName || item.name || '').trim();
                const isCurrentUser = itemName === normalizedDisplayName;

                return (
                  <div className={`leaderboard-item ${isCurrentUser ? 'highlight' : ''}`} key={`${item.rank}-${item.displayName || item.name}`}>
                    <span className="leaderboard-rank">#{item.rank}</span>
                    <span className="leaderboard-name">{formatDisplayName(itemName)}</span>
                    <div className="leaderboard-score-wrap">
                      {isCurrentUser && <span className="leaderboard-you-badge">← YOU</span>}
                      <span className="leaderboard-score">{item.chaosScore}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {!isUserInLeaderboard && currentUser?.rank && (
              <div className="user-rank-card">
                <div className="user-rank-content">
                  <span className="user-rank-line">
                    YOUR RANK: #{currentUser.rank} — {formattedDisplayName} — Score: {currentUser.chaosScore}
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="leaderboard-empty">No leaderboard data yet.</p>
        )}
      </motion.div>

      {analytics && (
        <motion.div className="analytics-card" variants={cardVariants}>
          <h3 className="analytics-title">LIVE CLASS SNAPSHOT</h3>
          <div className="analytics-grid">
            <p>Total responses: {analytics.totalResponses}</p>
            <p>Most common type: {analytics.mostCommonPersonalityType || 'N/A'}</p>
            <p>Avg discipline: {analytics.averageScores.discipline}</p>
            <p>Avg chaos: {analytics.averageScores.chaos}</p>
            <p>Avg ambition: {analytics.averageScores.ambition}</p>
            <p>Average stress: {analytics.averageStressLevel}</p>
          </div>
        </motion.div>
      )}

      <motion.p className="results-footer-note" variants={cardVariants}>
        Your response has been anonymously saved to help us understand student life better. — CPG-123 Research Team
      </motion.p>
    </motion.section>
  );
};

export default Results;
