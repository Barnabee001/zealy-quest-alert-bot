import { connectDB } from '../src/db/connect.js';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import ScrapedContent from '../src/models/ScrapedContent.js';

async function runRollback() {
  console.log('Starting schema rollback...');
  try {
    await connectDB();
    console.log('Connected to database.');

    // 1. Rollback User Schema
    console.log('Rolling back User documents...');
    const userRes = await User.updateMany(
      {},
      {
        $unset: {
          blacklisted: "",
          isAdmin: "",
          premium: ""
        }
      }
    );
    console.log(`- Removed new fields from ${userRes.modifiedCount} user documents.`);

    // 2. Rollback ScrapedContent Schema
    console.log('Rolling back ScrapedContent documents...');
    const scrapedRes = await ScrapedContent.updateMany(
      {},
      {
        $unset: {
          isGlobal: "",
          userIds: ""
        }
      }
    );
    console.log(`- Removed new fields from ${scrapedRes.modifiedCount} scraped content documents.`);

    console.log('Rollback completed successfully.');
  } catch (error) {
    console.error('Rollback failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
}

runRollback();
