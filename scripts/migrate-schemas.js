import { connectDB } from '../src/db/connect.js';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import ScrapedContent from '../src/models/ScrapedContent.js';

async function runMigration() {
  console.log('Starting schema migration...');
  try {
    await connectDB();
    console.log('Connected to database.');

    // 1. Migrate User Schema
    console.log('Migrating User documents...');
    const blRes = await User.updateMany({ blacklisted: { $exists: false } }, { $set: { blacklisted: false } });
    console.log(`- Set 'blacklisted: false' on ${blRes.modifiedCount} user documents.`);

    const adminRes = await User.updateMany({ isAdmin: { $exists: false } }, { $set: { isAdmin: false } });
    console.log(`- Set 'isAdmin: false' on ${adminRes.modifiedCount} user documents.`);

    const premiumRes = await User.updateMany({ premium: { $exists: false } }, { $set: { premium: false } });
    console.log(`- Set 'premium: false' on ${premiumRes.modifiedCount} user documents.`);

    // 2. Migrate ScrapedContent Schema
    console.log('Migrating ScrapedContent documents...');
    const globalRes = await ScrapedContent.updateMany({ isGlobal: { $exists: false } }, { $set: { isGlobal: false } });
    console.log(`- Set 'isGlobal: false' on ${globalRes.modifiedCount} scraped content documents.`);

    const userIdsRes = await ScrapedContent.updateMany({ userIds: { $exists: false } }, { $set: { userIds: [] } });
    console.log(`- Set 'userIds: []' on ${userIdsRes.modifiedCount} scraped content documents.`);

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
}

runMigration();
