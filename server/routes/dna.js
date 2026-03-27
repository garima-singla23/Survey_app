import express from 'express';
import StudentDNA from '../models/StudentDNA.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const topByChaos = await StudentDNA.find({}, 'displayName personalityType chaosScore submittedAt')
      .sort({ chaosScore: -1, submittedAt: -1 })
      .limit(5)
      .lean();

    const requestedDisplayName = (req.query.displayName || '').trim();
    let currentUser = null;

    if (requestedDisplayName) {
      const allEntries = await StudentDNA.find({}, 'displayName personalityType chaosScore submittedAt')
        .sort({ chaosScore: -1, submittedAt: -1 })
        .lean();

      const currentUserIndex = allEntries.findIndex(
        (entry) => (entry.displayName || '').trim() === requestedDisplayName
      );

      if (currentUserIndex !== -1) {
        const entry = allEntries[currentUserIndex];
        currentUser = {
          rank: currentUserIndex + 1,
          name: entry.displayName || requestedDisplayName,
          chaosScore: entry.chaosScore || 0,
          personalityType: entry.personalityType || 'Unknown'
        };
      }
    }

    const leaderboard = topByChaos.map((entry, index) => ({
      rank: index + 1,
      name: entry.displayName || `${entry.personalityType || 'Student'} #${String(entry._id).slice(-4)}`,
      chaosScore: entry.chaosScore || 0,
      personalityType: entry.personalityType || 'Unknown'
    }));

    return res.json({ leaderboard, currentUser });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch leaderboard', error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const response = new StudentDNA(req.body);
    const saved = await response.save();
    return res.status(201).json({ message: 'Student DNA response saved', data: saved });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to save response', error: error.message });
  }
});

router.get('/analytics', async (_req, res) => {
  try {
    const totalResponses = await StudentDNA.countDocuments();

    if (totalResponses === 0) {
      return res.json({
        totalResponses: 0,
        mostCommonPersonalityType: null,
        averageScores: {
          discipline: 0,
          chaos: 0,
          ambition: 0
        },
        personalityDistribution: {},
        examPrepOneNightBeforePercent: 0,
        kalSePadhungaLostCountPercent: 0,
        averageStressLevel: 0,
        mostCommonPrimaryGoal: null
      });
    }

    const [
      mostCommonPersonality,
      averageScores,
      distribution,
      oneNightBeforeCount,
      lostCountCount,
      averageStress,
      commonGoal
    ] = await Promise.all([
      StudentDNA.aggregate([
        { $group: { _id: '$personalityType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 }
      ]),
      StudentDNA.aggregate([
        {
          $group: {
            _id: null,
            discipline: { $avg: '$disciplineScore' },
            chaos: { $avg: '$chaosScore' },
            ambition: { $avg: '$ambitionScore' }
          }
        }
      ]),
      StudentDNA.aggregate([
        { $group: { _id: '$personalityType', count: { $sum: 1 } } }
      ]),
      StudentDNA.countDocuments({ examPrepTiming: '1 night before' }),
      StudentDNA.countDocuments({ kalSePadhunga: 'Lost count' }),
      StudentDNA.aggregate([
        { $group: { _id: null, avgStress: { $avg: '$stressLevel' } } }
      ]),
      StudentDNA.aggregate([
        { $group: { _id: '$primaryGoal', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 }
      ])
    ]);

    const personalityDistribution = distribution.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    return res.json({
      totalResponses,
      mostCommonPersonalityType: mostCommonPersonality[0]?._id || null,
      averageScores: {
        discipline: Math.round(averageScores[0]?.discipline || 0),
        chaos: Math.round(averageScores[0]?.chaos || 0),
        ambition: Math.round(averageScores[0]?.ambition || 0)
      },
      personalityDistribution,
      examPrepOneNightBeforePercent: Math.round((oneNightBeforeCount / totalResponses) * 100),
      kalSePadhungaLostCountPercent: Math.round((lostCountCount / totalResponses) * 100),
      averageStressLevel: Number((averageStress[0]?.avgStress || 0).toFixed(2)),
      mostCommonPrimaryGoal: commonGoal[0]?._id || null
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch analytics', error: error.message });
  }
});

// Enhanced analytics endpoints for admin panel
router.get('/admin/dashboard-stats', async (_req, res) => {
  try {
    const totalResponses = await StudentDNA.countDocuments();

    if (totalResponses === 0) {
      return res.json({
        totalResponses: 0,
        lastUpdated: new Date(),
        stats: []
      });
    }

    const [averageScores, averageStress, personalityCount] = await Promise.all([
      StudentDNA.aggregate([
        {
          $group: {
            _id: null,
            discipline: { $avg: '$disciplineScore' },
            chaos: { $avg: '$chaosScore' },
            ambition: { $avg: '$ambitionScore' }
          }
        }
      ]),
      StudentDNA.aggregate([
        { $group: { _id: null, avgStress: { $avg: '$stressLevel' } } }
      ]),
      StudentDNA.aggregate([
        { $group: { _id: '$personalityType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    return res.json({
      totalResponses,
      lastUpdated: new Date(),
      stats: [
        { label: 'Total Responses', value: totalResponses },
        { label: 'Avg Discipline', value: Math.round(averageScores[0]?.discipline || 0) },
        { label: 'Avg Chaos', value: Math.round(averageScores[0]?.chaos || 0) },
        { label: 'Avg Ambition', value: Math.round(averageScores[0]?.ambition || 0) },
        { label: 'Avg Stress Level', value: Number((averageStress[0]?.avgStress || 0).toFixed(1)) }
      ],
      topPersonalities: personalityCount.slice(0, 5)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch dashboard stats', error: error.message });
  }
});

router.get('/admin/personality-distribution', async (_req, res) => {
  try {
    const distribution = await StudentDNA.aggregate([
      { $group: { _id: '$personalityType', value: { $sum: 1 } } },
      { $match: { _id: { $ne: null } } },
      { $sort: { value: -1 } }
    ]);

    const totalResponses = await StudentDNA.countDocuments();
    const chartData = distribution.map(item => ({
      name: item._id || 'Unknown',
      value: item.value,
      percentage: ((item.value / totalResponses) * 100).toFixed(2)
    }));

    return res.json(chartData);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch personality distribution', error: error.message });
  }
});

router.get('/admin/scores-distribution', async (_req, res) => {
  try {
    const allScores = await StudentDNA.find({}, 'disciplineScore chaosScore ambitionScore').lean();

    // Create bins for score distribution
    const createBins = (scores) => {
      const bins = {
        '0-20': 0,
        '21-40': 0,
        '41-60': 0,
        '61-80': 0,
        '81-100': 0
      };
      scores.forEach(score => {
        if (score <= 20) bins['0-20']++;
        else if (score <= 40) bins['21-40']++;
        else if (score <= 60) bins['41-60']++;
        else if (score <= 80) bins['61-80']++;
        else bins['81-100']++;
      });
      return bins;
    };

    const disciplineScores = allScores.map(s => s.disciplineScore || 0);
    const chaosScores = allScores.map(s => s.chaosScore || 0);
    const ambitionScores = allScores.map(s => s.ambitionScore || 0);

    return res.json({
      disciplines: createBins(disciplineScores),
      chaos: createBins(chaosScores),
      ambition: createBins(ambitionScores)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch scores distribution', error: error.message });
  }
});

router.get('/admin/goals-distribution', async (_req, res) => {
  try {
    const goalDistribution = await StudentDNA.aggregate([
      { $group: { _id: '$primaryGoal', count: { $sum: 1 } } },
      { $match: { _id: { $ne: null } } },
      { $sort: { count: -1 } }
    ]);

    const totalResponses = await StudentDNA.countDocuments();
    const chartData = goalDistribution.map(item => ({
      name: item._id,
      value: item.count,
      percentage: ((item.count / totalResponses) * 100).toFixed(1)
    }));

    return res.json(chartData);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch goals distribution', error: error.message });
  }
});

router.get('/admin/stress-levels', async (_req, res) => {
  try {
    const allStressLevels = await StudentDNA.find({}, 'stressLevel').lean();
    
    const stressBins = {
      'Low (1-3)': 0,
      'Moderate (4-6)': 0,
      'High (7-9)': 0,
      'Critical (10)': 0
    };

    allStressLevels.forEach(item => {
      const level = item.stressLevel || 0;
      if (level <= 3) stressBins['Low (1-3)']++;
      else if (level <= 6) stressBins['Moderate (4-6)']++;
      else if (level <= 9) stressBins['High (7-9)']++;
      else stressBins['Critical (10)']++;
    });

    const totalResponses = await StudentDNA.countDocuments();
    const chartData = Object.entries(stressBins).map(([name, value]) => ({
      name,
      value,
      percentage: ((value / totalResponses) * 100).toFixed(1)
    }));

    return res.json(chartData);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch stress levels', error: error.message });
  }
});

router.get('/admin/sleep-patterns', async (_req, res) => {
  try {
    const sleepPatterns = await StudentDNA.aggregate([
      { $group: { _id: '$sleepTime', count: { $sum: 1 } } },
      { $match: { _id: { $ne: null } } },
      { $sort: { count: -1 } }
    ]);

    const totalResponses = await StudentDNA.countDocuments();
    const chartData = sleepPatterns.map(item => ({
      name: item._id,
      value: item.count,
      percentage: ((item.count / totalResponses) * 100).toFixed(1)
    }));

    return res.json(chartData);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch sleep patterns', error: error.message });
  }
});

router.get('/admin/study-hours', async (_req, res) => {
  try {
    const studyHours = await StudentDNA.aggregate([
      { $group: { _id: '$studyHours', count: { $sum: 1 } } },
      { $match: { _id: { $ne: null } } },
      { $sort: { count: -1 } }
    ]);

    const totalResponses = await StudentDNA.countDocuments();
    const chartData = studyHours.map(item => ({
      name: item._id,
      value: item.count,
      percentage: ((item.count / totalResponses) * 100).toFixed(1)
    }));

    return res.json(chartData);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch study hours', error: error.message });
  }
});

router.get('/admin/attendance-distribution', async (_req, res) => {
  try {
    const attendance = await StudentDNA.aggregate([
      { $group: { _id: '$attendance', count: { $sum: 1 } } },
      { $match: { _id: { $ne: null } } },
      { $sort: { count: -1 } }
    ]);

    const totalResponses = await StudentDNA.countDocuments();
    const chartData = attendance.map(item => ({
      name: item._id,
      value: item.count,
      percentage: ((item.count / totalResponses) * 100).toFixed(1)
    }));

    return res.json(chartData);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch attendance distribution', error: error.message });
  }
});

export default router;
