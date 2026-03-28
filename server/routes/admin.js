import express from 'express';
import { MongoClient } from 'mongodb';
import StudentDNA from '../models/StudentDNA.js';

const router = express.Router();

const ADMIN_KEY = 'admin2024';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000
  });

  await client.connect();
  const db = client.db();
  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

const ANSWER_KEYS = [
  'sleepTime',
  'studyHours',
  'attendance',
  'examPrepTiming',
  'stressLevel',
  'screenTime',
  'motivationFrequency',
  'primaryGoal',
  'submissionBehavior',
  'kalSePadhunga'
];

const toCountMap = (items, key, normalizer) => {
  const counts = {};
  items.forEach((item) => {
    const rawValue = item?.[key];
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      return;
    }
    const value = normalizer ? normalizer(rawValue) : String(rawValue);
    counts[value] = (counts[value] || 0) + 1;
  });
  return counts;
};

router.all('/analytics', async (req, res) => {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!process.env.MONGODB_URI && !process.env.MONGO_URI) {
      return res.status(500).json({
        error: 'MongoDB URI not configured in environment variables'
      });
    }

    if (req.headers['x-admin-key'] !== ADMIN_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { db } = await connectToDatabase();
    const collectionName = StudentDNA.collection.name;

    const responses = await db
      .collection(collectionName)
      .find({})
      .sort({ timestamp: -1, submittedAt: -1 })
      .toArray();

    const normalizedResponses = responses.map((row) => ({
      ...row,
      timestamp: row.timestamp || row.submittedAt || row.createdAt || new Date().toISOString()
    }));

    if (!normalizedResponses.length) {
      return res.json({
        totalResponses: 0,
        studentTypeDistribution: {},
        avgScores: {
          discipline: 0,
          chaos: 0,
          ambition: 0
        },
        answerBreakdowns: {},
        topStudents: [],
        rawResponses: []
      });
    }

    const totalResponses = normalizedResponses.length;

    const scoreSums = normalizedResponses.reduce(
      (acc, row) => {
        acc.discipline += Number(row.disciplineScore) || 0;
        acc.chaos += Number(row.chaosScore) || 0;
        acc.ambition += Number(row.ambitionScore) || 0;
        return acc;
      },
      { discipline: 0, chaos: 0, ambition: 0 }
    );

    const answerBreakdowns = {
      sleepTime: toCountMap(normalizedResponses, 'sleepTime'),
      studyHours: toCountMap(normalizedResponses, 'studyHours'),
      attendance: toCountMap(normalizedResponses, 'attendance'),
      examPrepTiming: toCountMap(normalizedResponses, 'examPrepTiming'),
      stressLevel: toCountMap(normalizedResponses, 'stressLevel', (value) => String(Number(value) || 0)),
      screenTime: toCountMap(normalizedResponses, 'screenTime'),
      motivationFrequency: toCountMap(normalizedResponses, 'motivationFrequency'),
      primaryGoal: toCountMap(normalizedResponses, 'primaryGoal'),
      submissionBehavior: toCountMap(normalizedResponses, 'submissionBehavior'),
      kalSePadhunga: toCountMap(normalizedResponses, 'kalSePadhunga')
    };

    const topStudents = [...normalizedResponses]
      .sort((a, b) => {
        const chaosDelta = (Number(b.chaosScore) || 0) - (Number(a.chaosScore) || 0);
        if (chaosDelta !== 0) {
          return chaosDelta;
        }
        return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
      })
      .slice(0, 10)
      .map((row) => ({
        name: row.displayName || `${row.personalityType || 'Student'} #${String(row._id).slice(-4)}`,
        type: row.personalityType || 'Unknown',
        score: Number(row.chaosScore) || 0,
        timestamp: new Date(row.timestamp || Date.now()).toISOString()
      }));

    const rawResponses = normalizedResponses.map((row) => ({
      name: row.displayName || '',
      studentType: row.personalityType || '',
      disciplineScore: Number(row.disciplineScore) || 0,
      chaosScore: Number(row.chaosScore) || 0,
      ambitionScore: Number(row.ambitionScore) || 0,
      sleepTime: row.sleepTime || '',
      studyHours: row.studyHours || '',
      attendance: row.attendance || '',
      examPrepTiming: row.examPrepTiming || '',
      timestamp: new Date(row.timestamp || Date.now()).toISOString()
    }));

    return res.json({
      totalResponses,
      lastUpdated: new Date(normalizedResponses[0].timestamp || Date.now()).toISOString(),
      studentTypeDistribution: toCountMap(normalizedResponses, 'personalityType', (value) => String(value || 'Unknown')),
      avgScores: {
        discipline: Number((scoreSums.discipline / totalResponses).toFixed(2)),
        chaos: Number((scoreSums.chaos / totalResponses).toFixed(2)),
        ambition: Number((scoreSums.ambition / totalResponses).toFixed(2))
      },
      answerBreakdowns,
      topStudents,
      rawResponses
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Database error',
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

export default router;
