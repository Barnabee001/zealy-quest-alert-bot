import ScrapedContent from "../models/ScrapedContent.js";
import User from "../models/User.js";

// Helper function to check if scraped data contains 404 error
export function isUrlValid(scrapedData) {
  const dataString = JSON.stringify(scrapedData).toLowerCase();
  return !dataString.includes('404') && !dataString.includes('not found');
}

// Helper function to log status with timestamp
export function logStatus(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

// Fetch all monitored URLs from database
export async function getMonitoredUrls() {
  logStatus('Fetching monitored URLs from database...');
  const scrapedContents = await ScrapedContent.find({});
  const urls = scrapedContents.map((doc) => doc.url);
  logStatus(`Found ${urls.length} URLs to monitor`);
  return urls;
}

// Scrape all URLs and return new data
export async function scrapeAllUrls(urls, scrapePage) {
  logStatus('Starting to scrape all URLs...');
  const newScrapedData = [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    logStatus(`Scraping ${i + 1}/${urls.length}: ${url}`);
    try {
      const scrapedData = await scrapePage(url);
      newScrapedData.push({
        url,
        data: scrapedData
      });
      logStatus(`✅ Successfully scraped: ${url}`);
    } catch (error) {
      logStatus(`❌ Failed to scrape: ${url} - ${error.message}`);
    }
  }
  logStatus(`Scraping complete. ${newScrapedData.length}/${urls.length} URLs scraped successfully`);
  return newScrapedData;
}

// Detect additions between old and new content
export function detectAdditions(oldContent, newContent) {
  // Extract only relevant content before diffing
  const oldRelevant = extractRelevantContent(oldContent);
  const newRelevant = extractRelevantContent(newContent);

  const oldLines = oldRelevant.split('\n');
  const newLines = newRelevant.split('\n');

  // Find the longest common prefix
  let prefixLength = 0;
  while (prefixLength < oldLines.length &&
    prefixLength < newLines.length &&
    oldLines[prefixLength] === newLines[prefixLength]) {
    prefixLength++;
  }

  // Find the longest common suffix
  let oldSuffixIndex = oldLines.length - 1;
  let newSuffixIndex = newLines.length - 1;
  let suffixLength = 0;

  while (oldSuffixIndex >= prefixLength &&
    newSuffixIndex >= prefixLength &&
    oldLines[oldSuffixIndex] === newLines[newSuffixIndex]) {
    oldSuffixIndex--;
    newSuffixIndex--;
    suffixLength++;
  }

  // The additions are the lines between the common prefix and common suffix
  const additions = newLines.slice(prefixLength, newLines.length - suffixLength);

  return additions.join('\n').trim();
}

// Extract only the relevant quest content (ignoring ads, tracking, and footer)
export function extractRelevantContent(content) {
  if (!content) return '';

  const lines = content.split('\n');
  const relevantLines = [];
  let inRelevantSection = false;
  let skipUntilPrivacy = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip everything after privacy section
    if (line.includes('###### Your privacy') || line.includes('Your privacy')) {
      skipUntilPrivacy = true;
      break;
    }

    if (skipUntilPrivacy) continue;

    // Skip Twitter tracking pixels
    if (line.includes('t.co/1/i/adsct') || line.includes('analytics.twitter.com')) {
      continue;
    }

    // Skip Zealy Browse promotion (footer content)
    if (line.includes('## Zealy Browse promotion')) {
      skipUntilPrivacy = true;
      continue;
    }

    // Skip ad sections (hypelab.com links and adjacent images)
    if (line.includes('web.hypelab.com') ||
      line.includes('cdn.ixncdn.com') ||
      (line.includes('![Image') && i > 0 && lines[i - 1].includes('cdn.ixncdn.com'))) {
      continue;
    }

    // Start capturing from "Daily Challenge" or similar quest sections
    if (line.includes('Daily Challenge') ||
      line.includes('Onboarding') ||
      line.includes('Promote us') ||
      line.includes('Sprint') ||
      line.includes('General')) {
      inRelevantSection = true;
    }

    // Capture relevant lines, normalize image numbers
    if (inRelevantSection) {
      // Replace image numbers with placeholder to ignore numbering differences
      const normalizedLine = line.replace(/!\[Image \d+\]/g, '![Image]');
      relevantLines.push(normalizedLine);
    }
  }

  return relevantLines.join('\n').trim();
}

// Validate that scraped content has minimum meaningful length
export function isValidScrapedContent(content, minLength = 300) {
  if (!content) return false;

  const relevantContent = extractRelevantContent(content);
  return relevantContent.length >= minLength;
}

// Extract only new quest items from additions (post-processing)
export function extractNewQuestItems(additions) {
  if (!additions) return '';

  const lines = additions.split('\n');
  const newQuests = [];
  let currentQuest = [];
  let inQuest = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines and common non-quest lines
    if (!line || line === 'All' || line === 'Locked') {
      continue;
    }

    // Detect quest link pattern: [Quest Name](url)
    if (line.match(/^\[.*\]\(https:\/\/zealy\.io\/cw\/.*\)$/)) {
      // Save previous quest if exists
      if (currentQuest.length > 0) {
        newQuests.push(currentQuest.join('\n'));
      }
      currentQuest = [line];
      inQuest = true;
    } else if (inQuest) {
      // Add reward info (Xp, USDC, etc.)
      if (line.includes('Xp') || line.includes('Usdc') || line.includes('USDC') || line.includes('Raffle')) {
        currentQuest.push(line);
      } else {
        // End of quest info
        if (currentQuest.length > 0) {
          newQuests.push(currentQuest.join('\n'));
          currentQuest = [];
        }
        inQuest = false;
      }
    }
  }

  // Don't forget the last quest
  if (currentQuest.length > 0) {
    newQuests.push(currentQuest.join('\n'));
  }

  return newQuests.join('\n\n---\n\n').trim();
}

// Normalize content for comparison (remove dynamic elements and whitespace)
export function normalizeContent(content) {
  if (!content) return '';

  // First extract only relevant content
  const relevantContent = extractRelevantContent(content);

  return relevantContent
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\?t=\d+/g, '') // Remove timestamp query params if present
    .replace(/timestamp=\d+/g, '') // Remove other timestamp patterns
    .replace(/_=\d+/g, '') // Remove cache-busting params
    .replace(/&t=\d+/g, '&') // Remove timestamp from URLs
    .replace(/\?\d+/g, '') // Remove standalone numbers in URLs
    .replace(/event_id=[a-f0-9-]+/g, 'event_id=REDACTED') // Redact event IDs
    .replace(/tw_pid=\d+\.\d+/g, 'tw_pid=REDACTED') // Redact Twitter tracking IDs
    .replace(/txn_id=[a-z0-9]+/g, 'txn_id=REDACTED') // Redact transaction IDs
    .trim();
}

// Compare scraped data with database and detect changes
export async function detectContentChanges(newScrapedData) {
  logStatus('Comparing scraped data with database...');
  const alerts = [];
  for (const {
      url,
      data
    }
    of newScrapedData) {
    const existing = await ScrapedContent.findOne({
      url
    });

    if (!existing) {
      logStatus(`⚠️  No existing data found for: ${url}`);
      continue;
    }

    // Compare only the content field (the actual quest content)
    const existingContent = existing.content;
    const newContent = data.data.data.content || '';

    // Validate that new content has minimum meaningful length
    if (!isValidScrapedContent(newContent)) {
      logStatus(`⚠️  New content too short or invalid for: ${url}`);
      continue;
    }

    // Normalize both contents before comparison
    const normalizedExisting = normalizeContent(existingContent);
    const normalizedNew = normalizeContent(newContent);

    if (normalizedExisting !== normalizedNew) {
      // Detect additions using original content
      const additions = detectAdditions(existingContent, newContent);

      // Post-process to extract only new quest items
      const newQuestItems = extractNewQuestItems(additions);

      await ScrapedContent.findOneAndUpdate({
        url
      }, {
        title: data.data.data.title || existing.title,
        description: data.data.data.description || existing.description,
        content: newContent,
        metadata: data.data.data.metadata || existing.metadata,
        external: data.data.data.external || existing.external,
        usage: data.data.data.usage || existing.usage,
        scrapedAt: new Date()
      }, {
        upsert: true,
        returnDocument: 'after'
      });
      alerts.push({
        url,
        data,
        additions: newQuestItems
      });
      logStatus(`🔄 Content changed for: ${url}`);
    } else {
      logStatus(`✅ No changes for: ${url}`);
    }
  }
  logStatus(`Detected ${alerts.length} content changes`);
  return alerts;
}

// Send alerts to all users
export async function sendAlertsToUsers(alerts, bot) {
  if (alerts.length === 0) {
    logStatus('No alerts to send');
    return;
  }

  logStatus('Fetching users to send alerts...');
  const users = await User.find({
    blocked: false
  });
  logStatus(`Found ${users.length} active users to notify`);

  for (const user of users) {
    for (const alert of alerts) {
      try {
        let message = `🚀 New quest update for ${alert.url}\n\n`;

        if (alert.additions && alert.additions.length > 0) {
          let snippet = alert.additions;
          if (snippet.length > 600) {
            const front = snippet.substring(0, 300);
            const back = snippet.substring(snippet.length - 300);
            snippet = `${front}\n...\n${back}`;
          }
          message += `📝 New content:\n${snippet}\n\n`;
        }

        message += `Go for it!`;

        await bot.sendMessage(
          user.telegram_chat_id,
          message,
        );
        logStatus(`📤 Alert sent to user ${user.username}`);
      } catch (error) {
        logStatus(`❌ Failed to send alert to user ${user.username}: ${error.message}`);
      }
    }
  }
  logStatus('All alerts sent successfully');
}