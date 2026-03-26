import express from 'express';
import StudentDNA from '../models/StudentDNA.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const topByChaos = await StudentDNA.find({}, 'displayName personalityType chaosScore submittedAt')
      .sort({ chaosScore: -1, submittedAt: -1 })
      .limit(5)
      .lean();

    const leaderboard = topByChaos.map((entry, index) => ({
      rank: index + 1,
      name: entry.displayName || `${entry.personalityType || 'Student'} #${String(entry._id).slice(-4)}`,
      chaosScore: entry.chaosScore || 0,
      personalityType: entry.personalityType || 'Unknown'
    }));

    return res.json({ leaderboard });
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

export default router;
