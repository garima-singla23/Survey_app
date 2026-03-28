import express from 'express';
import { MongoClient } from 'mongodb';
import StudentDNA from '../models/StudentDNA.js';

const router = express.Router();

const ADMIN_SESSION_DURATION_MS = 2 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;

let cachedClient = null;
let cachedDb = null;

function ensureSecurityStores() {
  if (!globalThis.adminSessions) {
    globalThis.adminSessions = new Map();
  }
  if (!globalThis.loginAttempts) {
    globalThis.loginAttempts = new Map();
  }
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const rawIp = Array.isArray(forwarded)
    ? forwarded[0]
    : String(forwarded || req.socket?.remoteAddress || 'unknown');

  return rawIp.split(',')[0].trim() || 'unknown';
}

function cleanupExpiredSessions() {
  ensureSecurityStores();
  const now = Date.now();

  for (const [token, expiresAt] of globalThis.adminSessions.entries()) {
    if (expiresAt <= now) {
      globalThis.adminSessions.delete(token);
    }
  }
}

function isValidAdminToken(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }

  cleanupExpiredSessions();
  const expiresAt = globalThis.adminSessions.get(token);
  return typeof expiresAt === 'number' && expiresAt > Date.now();
}

function getRateLimitState(ip) {
  ensureSecurityStores();
  const now = Date.now();
  const existing = globalThis.loginAttempts.get(ip);

  if (!existing || now > existing.resetAt) {
    const fresh = { count: 0, resetAt: now + LOGIN_WINDOW_MS };
    globalThis.loginAttempts.set(ip, fresh);
    return fresh;
  }

  return existing;
}

function createAdminToken() {
  return Buffer.from(`admin-${Date.now()}-${Math.random().toString(36).slice(2)}`).toString('base64');
}

function registerAdminSession(token) {
  ensureSecurityStores();
  const expiresAt = Date.now() + ADMIN_SESSION_DURATION_MS;
  globalThis.adminSessions.set(token, expiresAt);

  setTimeout(() => {
    globalThis.adminSessions?.delete(token);
  }, ADMIN_SESSION_DURATION_MS).unref?.();
}

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

router.post('/login', async (req, res) => {
  try {
    const { password } = req.body || {};

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password required' });
    }

    const correctPassword = process.env.ADMIN_PASSWORD;
    if (!correctPassword) {
      return res.status(500).json({ error: 'Admin password not configured on server' });
    }

    const ip = getClientIp(req);
    const attempt = getRateLimitState(ip);
    const now = Date.now();

    if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
      const retryAfterSeconds = Math.max(1, Math.ceil((attempt.resetAt - now) / 1000));
      const waitMins = Math.ceil(retryAfterSeconds / 60);
      return res.status(429).json({
        error: `Too many attempts. Try again in ${waitMins} minutes.`,
        retryAfterSeconds
      });
    }

    if (password !== correctPassword) {
      attempt.count += 1;
      const remainingAttempts = Math.max(0, MAX_LOGIN_ATTEMPTS - attempt.count);

      return res.status(401).json({
        error: `Incorrect password. ${remainingAttempts} attempts remaining.`,
        remainingAttempts
      });
    }

    attempt.count = 0;

    const token = createAdminToken();
    registerAdminSession(token);

    return res.status(200).json({
      success: true,
      token,
      expiresIn: '2 hours'
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Failed to login',
      details: err.message
    });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const token = req.headers['x-admin-token'];
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Missing admin token' });
    }

    ensureSecurityStores();
    globalThis.adminSessions.delete(token);

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({
      error: 'Failed to logout',
      details: err.message
    });
  }
});

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

    const token = req.headers['x-admin-token'];
    if (!isValidAdminToken(token)) {
      return res.status(401).json({ error: 'Unauthorized. Please login.' });
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
