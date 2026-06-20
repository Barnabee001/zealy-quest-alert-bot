import { connectDB } from '../src/db/connect.js';
import mongoose from 'mongoose';
import ScrapedContent from '../src/models/ScrapedContent.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function exportSprints() {
  console.log('Starting sprint ownership export...');
  try {
    await connectDB();
    console.log('Connected to database.');

    const sprints = await ScrapedContent.find({}, { url: 1, title: 1, isGlobal: 1, userIds: 1 });
    console.log(`Found ${sprints.length} sprints in database.`);

    const mapping = sprints.map(doc => ({
      url: doc.url,
      title: doc.title,
      isGlobal: doc.isGlobal || false,
      userIds: doc.userIds || []
    }));

    const dataDir = path.resolve(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const outputPath = path.join(dataDir, 'sprints-mapping.json');
    fs.writeFileSync(outputPath, JSON.stringify(mapping, null, 2), 'utf-8');
    console.log(`Successfully exported sprints mapping template to: ${outputPath}`);
    console.log('You can now edit this file to assign telegram_chat_ids to userIds, or toggle isGlobal.');
  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
}

exportSprints();
