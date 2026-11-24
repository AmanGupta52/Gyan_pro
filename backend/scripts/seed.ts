import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Category } from '../src/models/Category.js';
import { Subject } from '../src/models/Subject.js';
import { Competition } from '../src/models/Competition.js';
import { hashPassword } from '../src/utils/password.js';
import { logger } from '../src/utils/logger.js';

const DEFAULT_CATEGORIES = [
  { name: 'Junior KG', description: 'Kindergarten - Lower', order: 1 },
  { name: 'Senior KG', description: 'Kindergarten - Upper', order: 2 },
  { name: 'Class 1', description: 'Primary School - Standard 1', order: 3 },
  { name: 'Class 2', description: 'Primary School - Standard 2', order: 4 },
  { name: 'Class 3', description: 'Primary School - Standard 3', order: 5 },
  { name: 'Class 4', description: 'Primary School - Standard 4', order: 6 },
  { name: 'Class 5', description: 'Primary School - Standard 5', order: 7 },
  { name: 'Class 6', description: 'Middle School - Standard 6', order: 8 },
  { name: 'Class 7', description: 'Middle School - Standard 7', order: 9 },
  { name: 'Class 8', description: 'Middle School - Standard 8', order: 10 },
  { name: 'Class 9', description: 'Secondary School - Standard 9', order: 11 },
  { name: 'Class 10', description: 'Secondary School - Standard 10', order: 12 },
  { name: 'Class 11', description: 'Senior Secondary - Standard 11', order: 13 },
  { name: 'Class 12', description: 'Senior Secondary - Standard 12', order: 14 },
  { name: 'Undergraduate', description: 'Bachelor / Diploma degree students', order: 15 },
  { name: 'Postgraduate', description: 'Master / Post Graduate degree students', order: 16 },
  { name: 'PhD', description: 'Doctoral researchers & scholars', order: 17 },
];

const DEFAULT_SUBJECTS = [
  { name: 'Mathematics & Logic', code: 'MATH' },
  { name: 'Science & Discovery', code: 'SCI' },
  { name: 'Indian Heritage & Culture', code: 'HERITAGE' },
  { name: 'General Awareness & Current Affairs', code: 'GK' },
  { name: 'Literature & Language', code: 'LANG' },
  { name: 'Computer Science & AI', code: 'TECH' },
];

async function seed() {
  if (env.NODE_ENV === 'production') {
    logger.error('❌ Refusing to run seed script in production!');
    process.exit(1);
  }

  try {
    logger.info('🌱 Starting database seed script...');
    await mongoose.connect(env.MONGODB_URI);
    logger.info('Connected to MongoDB');

    // 1. Seed Categories
    for (const cat of DEFAULT_CATEGORIES) {
      await Category.findOneAndUpdate(
        { name: cat.name },
        { ...cat, isActive: true },
        { upsert: true, new: true }
      );
    }
    logger.info(`✅ Seeded ${DEFAULT_CATEGORIES.length} default categories`);

    // 2. Seed Subjects
    for (const sub of DEFAULT_SUBJECTS) {
      await Subject.findOneAndUpdate(
        { code: sub.code },
        { ...sub, isActive: true },
        { upsert: true, new: true }
      );
    }
    logger.info(`✅ Seeded ${DEFAULT_SUBJECTS.length} default subjects`);

    // 3. Seed Super Admin User if credentials provided
    const adminEmail = env.SEED_ADMIN_EMAIL || 'admin@gyan26.com';
    const adminPassword = env.SEED_ADMIN_PASSWORD || 'Admin@12345678';

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const hashedPassword = await hashPassword(adminPassword);
      await User.create({
        name: 'GYAN-26 Super Admin',
        email: adminEmail,
        phone: '9999999999',
        password: hashedPassword,
        role: 'superAdmin',
        dateOfBirth: new Date('1990-01-01'),
        educationLevel: 'PhD',
        institution: 'GYAN Foundation',
        city: 'New Delhi',
        state: 'Delhi',
        country: 'India',
        isEmailVerified: true,
        isActive: true,
      });
      logger.info(`✅ Created SuperAdmin user: ${adminEmail}`);
    }

    // 4. Seed sample competition
    const sampleComp = await Competition.findOne({ name: 'GYAN-26 All-India Class 10 Championship' });
    if (!sampleComp) {
      const start = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // in 3 days
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration
      const deadline = new Date(start.getTime() - 6 * 60 * 60 * 1000); // 6 hours prior

      await Competition.create({
        name: 'GYAN-26 All-India Class 10 Championship',
        description: 'Prestigious national multiplayer quiz covering Mathematics, Science, and Indian Heritage for Standard 10 scholars.',
        category: 'Class 10',
        startAt: start,
        endAt: end,
        registrationDeadline: deadline,
        participationMode: 'team',
        allowedTeamSize: 4,
        numberOfQuestions: 20,
        timePerQuestionSeconds: 30,
        questionSelection: 'random',
        scoringConfig: {
          basePoints: 100,
          speedBonusMax: 50,
          penaltyWrong: 0,
        },
        tieBreakRules: 'fastestTime',
        maxTeams: 100,
        rulesText: 'Standard tournament rules: 20 questions, 30s timer, synchronized server delivery.',
        status: 'Registration Open',
      });
      logger.info('✅ Seeded sample Class 10 Championship competition');
    }

    // 5. Seed sample individual competition
    const sampleSoloComp = await Competition.findOne({ name: 'GYAN-26 Undergraduate National Solo Bowl' });
    if (!sampleSoloComp) {
      const start = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 90 * 60 * 1000);
      const deadline = new Date(start.getTime() - 12 * 60 * 60 * 1000);

      await Competition.create({
        name: 'GYAN-26 Undergraduate National Solo Bowl',
        description: 'Individual quiz competition testing collegiate scholars across General Knowledge and Computer Science.',
        category: 'Undergraduate',
        startAt: start,
        endAt: end,
        registrationDeadline: deadline,
        participationMode: 'individual',
        allowedTeamSize: 1,
        numberOfQuestions: 25,
        timePerQuestionSeconds: 25,
        questionSelection: 'random',
        scoringConfig: {
          basePoints: 100,
          speedBonusMax: 50,
          penaltyWrong: 0,
        },
        tieBreakRules: 'accuracy',
        maxPlayers: 500,
        status: 'Registration Open',
      });
      logger.info('✅ Seeded sample Undergraduate Solo Bowl competition');
    }

    logger.info('🎉 Seed completed successfully!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    logger.error({ error }, '❌ Error seeding database');
    process.exit(1);
  }
}

seed();
