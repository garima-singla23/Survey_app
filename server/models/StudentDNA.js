import mongoose from 'mongoose';

const studentDNASchema = new mongoose.Schema({
  displayName: String,
  sleepTime: String,
  studyHours: String,
  socialTime: String,
  stressLevel: Number,
  primaryGoal: String,
  attendance: String,
  examPrepTiming: String,
  kalSePadhunga: String,
  marksExpectation: String,
  examSleep: String,
  submissionBehavior: String,
  screenTime: String,
  motivationFrequency: String,
  disciplineScore: Number,
  chaosScore: Number,
  ambitionScore: Number,
  personalityType: String,
  submittedAt: { type: Date, default: Date.now }
});

const StudentDNA = mongoose.model('StudentDNA', studentDNASchema);

export default StudentDNA;
