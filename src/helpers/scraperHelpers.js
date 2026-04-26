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
      newScrapedData.push({ url, data: scrapedData });
      logStatus(`✅ Successfully scraped: ${url}`);
    } catch (error) {
      logStatus(`❌ Failed to scrape: ${url} - ${error.message}`);
    }
  }
  logStatus(`Scraping complete. ${newScrapedData.length}/${urls.length} URLs scraped successfully`);
  return newScrapedData;
}

// Compare scraped data with database and detect changes
export async function detectContentChanges(newScrapedData) {
  logStatus('Comparing scraped data with database...');
  const alerts = [];
  for (const { url, data } of newScrapedData) {
    const existing = await ScrapedContent.findOne({ url });
    
    if (!existing) {
      logStatus(`⚠️  No existing data found for: ${url}`);
      continue;
    }

    if (JSON.stringify(existing.scrapedcontent) !== JSON.stringify(data)) {
      await ScrapedContent.findOneAndUpdate(
        { url },
        { scrapedcontent: data },
        { upsert: true, returnDocument: 'after' }
      );
      alerts.push({ url, data });
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
  const users = await User.find({});
  logStatus(`Found ${users.length} users to notify`);
  
  for (const user of users) {
    for (const alert of alerts) {
      try {
        await bot.sendMessage(
          user.telegram_chat_id,
          `🚀 New quest update for ${alert.url}\n\n${JSON.stringify(alert.data).substring(0, 1000)}...`,
        );
        logStatus(`📤 Alert sent to user ${user.username}`);
      } catch (error) {
        logStatus(`❌ Failed to send alert to user ${user.username}: ${error.message}`);
      }
    }
  }
  logStatus('All alerts sent successfully');
}
