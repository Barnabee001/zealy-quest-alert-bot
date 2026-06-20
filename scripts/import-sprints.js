import { connectDB } from '../src/db/connect.js';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import ScrapedContent from '../src/models/ScrapedContent.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importSprints() {
  console.log('Starting sprint ownership import...');
  const inputPath = path.resolve(__dirname, '../data/sprints-mapping.json');

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Mapping file not found at ${inputPath}`);
    console.log('Please run the export script first: npm run export-sprints');
    process.exit(1);
  }

  try {
    await connectDB();
    console.log('Connected to database.');

    const fileContent = fs.readFileSync(inputPath, 'utf-8');
    const mapping = JSON.parse(fileContent);

    if (!Array.isArray(mapping)) {
      throw new Error('Mapping file must contain a JSON array of sprint objects.');
    }

    console.log(`Loaded ${mapping.length} sprint mappings from file.`);

    // Pre-validate that all user IDs exist in database
    const allUserIds = [...new Set(mapping.flatMap(item => item.userIds || []))];
    if (allUserIds.length > 0) {
      console.log(`Validating ${allUserIds.length} unique user ID references...`);
      const existingUsers = await User.find({ telegram_chat_id: { $in: allUserIds } });
      const existingUserIds = new Set(existingUsers.map(u => u.telegram_chat_id));

      const invalidUserIds = allUserIds.filter(id => !existingUserIds.has(id));
      if (invalidUserIds.length > 0) {
        console.error('❌ Validation Failed: The following telegram_chat_ids do not exist in the User collection:');
        console.error(JSON.stringify(invalidUserIds, null, 2));
        console.error('Please fix the IDs in data/sprints-mapping.json and try again.');
        process.exit(1);
      }
      console.log('✅ All referenced users verified successfully.');
    }

    let updatedCount = 0;
    for (const item of mapping) {
      if (!item.url) {
        console.warn('⚠️ Skipping item with missing url field:', item);
        continue;
      }

      const isGlobal = typeof item.isGlobal === 'boolean' ? item.isGlobal : false;
      const userIds = Array.isArray(item.userIds) ? item.userIds : [];

      const result = await ScrapedContent.findOneAndUpdate(
        { url: item.url },
        { isGlobal, userIds },
        { returnDocument: 'after' }
      );

      if (result) {
        console.log(`Updated sprint [${item.title || item.url}]: isGlobal=${isGlobal}, userIds=[${userIds.join(', ')}]`);
        updatedCount++;
      } else {
        console.warn(`⚠️ Warning: Sprint URL not found in database: ${item.url}`);
      }
    }

    console.log(`Import completed successfully. Updated ${updatedCount} sprints.`);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
}

importSprints();
