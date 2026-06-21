import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import {
  connectDB
} from "./db/connect.js";
import User from "./models/User.js";
import ScrapedContent from "./models/ScrapedContent.js";
import {
  scrapePage
} from "./service/scrape.js";
import {
  isUrlValid,
  logStatus,
  getMonitoredUrls,
  scrapeAllUrls,
  detectContentChanges,
  sendAlertsToUsers
} from "./helpers/scraperHelpers.js";

const app = express();
dotenv.config();

app.use(cors());
app.use(express.json());
connectDB();

const PORT = process.env.PORT;
const token = process.env.TELEGRAM_BOT_KEY;

// In-memory store for last successful scrape time
let lastSuccessfulScrapeTime = null;

const bot = new TelegramBot(token, {
  polling: false,
});

app.get("/setup", async(req, res) => {
  try {
    await bot.setWebHook(`https://zealy-quest-alert-bot.onrender.com/bot`);
    await bot.setMyCommands([{
      command: "start",
      description: "Get Connected",
    }, {
      command: "add",
      description: "Add new url",
    }, {
      command: "list",
      description: "List monitored sprints",
    }, {
      command: "remove",
      description: "Remove monitored sprint",
    }, {
      command: "stop",
      description: "Unsubscribe from alerts",
    }, ]);
    res.send("Webhook and commands set successfully!");
  } catch (error) {
    console.error("Setup failed:", error);
    res.status(500).send(error.message);
  }
});

app.get("/", (req, res) => {
  res.send(
    'Bot is running! on <a href="https://t.me/zealyquestalert_bot">@zealyquestalert_bot</a>',
  );
});

app.post(`/bot`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// API Routes for Frontend Integration

// Get all scraped content data
app.get("/api/scraped-content", async(req, res) => {
  try {
    const scrapedContent = await ScrapedContent.find({}).sort({
      createdAt: -1
    });
    res.status(200).json({
      success: true,
      count: scrapedContent.length,
      data: scrapedContent
    });
  } catch (error) {
    console.error("Error fetching scraped content:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch scraped content"
    });
  }
});

// Get all user data
app.get("/api/users", async(req, res) => {
  try {
    const users = await User.find({}).sort({
      createdAt: -1
    });
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch users"
    });
  }
});

// Get last successful scrape time
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    lastScrapeTime: lastSuccessfulScrapeTime,
    status: lastSuccessfulScrapeTime ? "active" : "pending"
  });
});

// Toggle user blocked status
// Toggle user blocked status (repurposed to toggle blacklist)
app.put("/api/users/:telegram_chat_id/block", async(req, res) => {
  try {
    const {
      telegram_chat_id
    } = req.params;
    const {
      blocked
    } = req.body;

    if (typeof blocked !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: "blocked field must be a boolean"
      });
    }

    const user = await User.findOneAndUpdate({
      telegram_chat_id
    }, {
      blocked,
      blacklisted: blocked
    }, {
      returnDocument: 'after'
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    // Send Telegram message to user
    try {
      const message = blocked ?
        `🔔 You have been unsubscribed from quest alerts. to resubscribe Contact @vicdevman ` :
        `🔔 You have been resubscribed to quest alerts. You will now receive notifications for new quest updates.`;

      await bot.sendMessage(telegram_chat_id, message);
    } catch (msgError) {
      console.error("Failed to send Telegram message to user:", msgError);
      // Don't fail the request if message sending fails
    }

    res.status(200).json({
      success: true,
      message: `User ${blocked ? 'blocked' : 'unblocked'} successfully`,
      data: user
    });
  } catch (error) {
    console.error("Error toggling user block status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update user status"
    });
  }
});

// Toggle user premium status
app.put("/api/users/:telegram_chat_id/premium", async (req, res) => {
  try {
    const {
      telegram_chat_id
    } = req.params;
    const {
      premium
    } = req.body;

    if (typeof premium !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: "premium field must be a boolean"
      });
    }

    const user = await User.findOneAndUpdate({
      telegram_chat_id
    }, {
      premium
    }, {
      returnDocument: 'after'
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    // Send Telegram message to user
    try {
      const message = premium ?
        `🌟 Congratulations! You have been upgraded to Premium status. You can now monitor unlimited personal sprints.` :
        `🔔 Your Premium status has been removed. You will now be subject to the standard sprint limit. Please contact @vicdevman if you have questions.`;

      await bot.sendMessage(telegram_chat_id, message);
    } catch (msgError) {
      console.error("Failed to send Telegram message to user:", msgError);
      // Don't fail the request if message sending fails
    }

    res.status(200).json({
      success: true,
      message: `User premium status updated to ${premium}`,
      data: user
    });
  } catch (error) {
    console.error("Error setting user premium status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update premium status"
    });
  }
});

// Get all global sprints
app.get("/api/admin/global-sprints", async (req, res) => {
  try {
    const globalSprints = await ScrapedContent.find({ isGlobal: true }).sort({
      createdAt: -1
    });
    res.status(200).json({
      success: true,
      count: globalSprints.length,
      data: globalSprints
    });
  } catch (error) {
    console.error("Error fetching global sprints:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch global sprints"
    });
  }
});

// Add a sprint to the global pool
app.post("/api/admin/global-sprints", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({
        success: false,
        error: "url is required"
      });
    }

    // Check if URL already exists
    let sprint = await ScrapedContent.findOne({ url });

    if (sprint) {
      if (sprint.isGlobal) {
        return res.status(200).json({
          success: true,
          message: "Sprint is already in global pool",
          data: sprint
        });
      }
      sprint.isGlobal = true;
      await sprint.save();
    } else {
      // Scrape initial content to validate URL
      const scrapedData = await scrapePage(url);
      if (!isUrlValid(scrapedData)) {
        return res.status(400).json({
          success: false,
          error: "Invalid URL or page not found (returned 404)"
        });
      }

      sprint = await ScrapedContent.create({
        url,
        title: scrapedData.data.data.title || 'No title',
        description: scrapedData.data.data.description || '',
        content: scrapedData.data.data.content || '',
        metadata: scrapedData.data.data.metadata || {},
        external: scrapedData.data.data.external || {},
        usage: scrapedData.data.data.usage || {},
        isGlobal: true,
        userIds: [],
        scrapedAt: new Date()
      });
    }

    res.status(200).json({
      success: true,
      message: "Sprint successfully added/updated in global pool",
      data: sprint
    });
  } catch (error) {
    console.error("Error adding global sprint:", error);
    res.status(500).json({
      success: false,
      error: "Failed to add global sprint"
    });
  }
});

// Remove a sprint from the global pool
app.delete("/api/admin/global-sprints", async (req, res) => {
  try {
    const { url } = req.body;
    const queryUrl = url || req.query.url;
    if (!queryUrl) {
      return res.status(400).json({
        success: false,
        error: "url is required"
      });
    }

    const sprint = await ScrapedContent.findOne({ url: queryUrl });
    if (!sprint) {
      return res.status(404).json({
        success: false,
        error: "Sprint not found"
      });
    }

    sprint.isGlobal = false;
    if (!sprint.userIds || sprint.userIds.length === 0) {
      // No users are monitoring this, delete completely
      await ScrapedContent.deleteOne({ url: queryUrl });
      res.status(200).json({
        success: true,
        message: "Sprint removed from global pool and deleted since no users monitor it"
      });
    } else {
      await sprint.save();
      res.status(200).json({
        success: true,
        message: "Sprint removed from global pool, remains monitored by users",
        data: sprint
      });
    }
  } catch (error) {
    console.error("Error removing global sprint:", error);
    res.status(500).json({
      success: false,
      error: "Failed to remove global sprint"
    });
  }
});

// Get API documentation
app.get("/api/docs", (req, res) => {
  res.json({
    success: true,
    message: "Zealy Quest Alert Bot API Documentation",
    version: "1.0.0",
    baseUrl: req.protocol + "://" + req.get("host"),
    endpoints: [{
      method: "GET",
      path: "/api/scraped-content",
      description: "Get all scraped content data from monitored sprints",
      response: {
        success: "boolean",
        count: "number",
        data: "Array of scraped content objects with url, title, description, content, metadata, external, usage, timestamps"
      }
    }, {
      method: "GET",
      path: "/api/users",
      description: "Get all user data",
      response: {
        success: "boolean",
        count: "number",
        data: "Array of user objects with name, username, telegram_chat_id, blocked, timestamps"
      }
    }, {
      method: "GET",
      path: "/api/health",
      description: "Get server health status and last successful scrape time",
      response: {
        success: "boolean",
        lastScrapeTime: "string (ISODate) or null",
        status: "string (active or pending)"
      }
    }, {
      method: "PUT",
      path: "/api/users/:telegram_chat_id/block",
      description: "Toggle user blocked status (true = no alerts, false = receive alerts)",
      body: {
        blocked: "boolean (required)"
      },
      response: {
        success: "boolean",
        message: "string",
        data: "Updated user object"
      }
    }, {
      method: "GET",
      path: "/api/docs",
      description: "Get this API documentation"
    }, {
      method: "GET",
      path: "/scraper",
      description: "Trigger manual scraper job (checks all monitored URLs for changes)",
      response: {
        message: "string",
        alertsFound: "number",
        usersNotified: "number",
        lastScrapeTime: "string (ISODate) or null"
      }
    }],
    dataModels: {
      ScrapedContent: {
        url: "string (unique) - The monitored URL",
        title: "string - Sprint title from Zealy",
        description: "string - Sprint description",
        content: "string - Main quest content (compared for changes)",
        metadata: "object - Page metadata",
        external: "object - External resources",
        usage: "object - Usage stats",
        scrapedAt: "ISODate - When content was scraped",
        createdAt: "ISODate - When the URL was first added",
        updatedAt: "ISODate - When the content was last updated"
      },
      User: {
        name: "string - User's first name",
        username: "string - Telegram username (unique)",
        telegram_chat_id: "string (unique) - Telegram chat ID for notifications",
        blocked: "boolean - Whether user is blocked from receiving alerts (default: false)",
        createdAt: "ISODate - When the user was registered",
        updatedAt: "ISODate - When the user was last updated"
      }
    },
    notes: [
      "All endpoints support CORS from any origin",
      "Responses are sorted by createdAt in descending order (newest first)",
      "The /scraper endpoint automatically sends Telegram alerts when content changes are detected",
      "Only the 'content' field is compared for changes (ignores metadata, external, usage, and timestamps)",
      "Blocked users (blocked: true) will not receive Telegram alerts",
      "Use /start command to resubscribe (sets blocked: false)",
      "Use /stop command to unsubscribe (sets blocked: true)",
      "Telegram bot commands: /start, /add <url>, /list, /remove <url>, /stop"
    ]
  });
});

app.get("/scraper", async(req, res) => {
  try {
    logStatus('=== Starting scraper job ===');

    const urls = await getMonitoredUrls();

    if (urls.length === 0) {
      logStatus('No URLs to monitor. Stopping scraper job.');
      res.status(200).json({
        message: "No URLs to monitor",
        alertsFound: 0,
        usersNotified: 0,
        lastScrapeTime: lastSuccessfulScrapeTime
      });
      return;
    }

    const newScrapedData = await scrapeAllUrls(urls, scrapePage);
    const alerts = await detectContentChanges(newScrapedData);
    await sendAlertsToUsers(alerts, bot);

    // Update last successful scrape time
    lastSuccessfulScrapeTime = new Date().toISOString();

    logStatus('=== Scraper job completed ===');

    res.status(200).json({
      message: "Scraper Successful",
      alertsFound: alerts.length,
      usersNotified: alerts.length > 0 ? await User.countDocuments() : 0,
      lastScrapeTime: lastSuccessfulScrapeTime
    });
  } catch (error) {
    logStatus(`❌ Scraper error: ${error.message}`);
    res.status(500).json({
      error: "Scraper failed",
      lastScrapeTime: lastSuccessfulScrapeTime
    });
  }
});

bot.onText(/\/start/, async(msg) => {
  const chatId = msg.chat.id;
  const username = msg.chat.username;
  const firstName = msg.chat.first_name;

  try {
    // Check if the user exists and is blacklisted
    const existingUser = await User.findOne({ telegram_chat_id: chatId.toString() });
    if (existingUser && existingUser.blacklisted) {
      await bot.sendMessage(
        chatId,
        `🚫 You have been blacklisted and cannot resubscribe. Please contact @vicdevman for support.`
      );
      return;
    }

    const user = await User.findOneAndUpdate({
      telegram_chat_id: chatId.toString(),
    }, {
      name: firstName || "Unknown",
      username: username || "unknown",
      telegram_chat_id: chatId.toString(),
      blocked: false
    }, {
      upsert: true,
      returnDocument: 'after'
    });
    console.log("User stored:", chatId, username, firstName);

    await bot.sendMessage(
      chatId,
      `Bot active! You have subscribed to receive zealy quest alerts for monitored sprints.\n\nCommands:\n/add ZEALY_SPRINTS_URL - Add a new sprint to monitor\n/list - View all monitored sprints\n/remove ZEALY_SPRINTS_URL - Remove a sprint from monitoring\n/stop - Unsubscribe from alerts`,
    );
  } catch (error) {
    console.error("Error storing user:", error);
    await bot.sendMessage(chatId, "Failed to start subscription. Please try again.");
  }
});

bot.onText(/\/add (.+)/, async(msg, match) => {
  const chatId = msg.chat.id;
  const url = match[1];

  try {
    // Check if user is blacklisted
    const user = await User.findOne({ telegram_chat_id: chatId.toString() });
    if (user && user.blacklisted) {
      await bot.sendMessage(chatId, `🚫 You are blacklisted and cannot monitor sprints. Please contact @vicdevman for support.`);
      return;
    }

    // Limit check for non-premium users
    const isPremium = user ? user.premium : false;
    const isAdmin = user ? user.isAdmin : false;
    if (!isPremium && !isAdmin) {
      const ownedSprintsCount = await ScrapedContent.countDocuments({ userIds: chatId.toString() });
      if (ownedSprintsCount >= 3) {
        await bot.sendMessage(
          chatId,
          `⚠️ Limit Reached: Non-premium users can monitor at most 3 personal sprints. Please contact @vicdevman to upgrade to premium.`
        );
        return;
      }
    }

    // Check if URL already exists
    const existing = await ScrapedContent.findOne({ url });
    if (existing) {
      if (existing.isGlobal) {
        await bot.sendMessage(chatId, `📢 This URL is already in the Global Sprint Pool. You will automatically receive alerts for it.`);
        return;
      }
      if (existing.userIds && existing.userIds.includes(chatId.toString())) {
        await bot.sendMessage(chatId, `This URL is already being monitored by you.`);
        return;
      }

      // Otherwise, add user to monitoring list
      existing.userIds = existing.userIds || [];
      existing.userIds.push(chatId.toString());
      await existing.save();

      await bot.sendMessage(chatId, `✅ Successfully added ${url} to your monitored sprints!`);
      return;
    }

    // Scrape initial content to validate URL
    await bot.sendMessage(chatId, `Checking URL: ${url}`);
    const scrapedData = await scrapePage(url);

    logStatus(` === scraped before checking valid === ${JSON.stringify(scrapedData, null, 2)}`);

    // Check if URL is valid (no 404 errors)
    if (!isUrlValid(scrapedData)) {
      await bot.sendMessage(
        chatId,
        `I'm not sure this page exists cause it returned a 404 error. Check your source.`,
      );
      return;
    }

    // Store URL and scraped content in DB as user-owned
    await ScrapedContent.create({
      url,
      title: scrapedData.data.data.title || 'No title',
      description: scrapedData.data.data.description || '',
      content: scrapedData.data.data.content || '',
      metadata: scrapedData.data.data.metadata || {},
      external: scrapedData.data.data.external || {},
      usage: scrapedData.data.data.usage || {},
      isGlobal: false,
      userIds: [chatId.toString()],
      scrapedAt: new Date()
    });

    await bot.sendMessage(
      chatId,
      `✅ Successfully added ${url} to your monitored sprints!`,
    );
  } catch (error) {
    console.error("Error adding URL:", error);
    await bot.sendMessage(
      chatId,
      `Failed to add URL, check url & try again or contact @vicdevman`,
    );
  }
});

bot.onText(/\/list/, async(msg) => {
  const chatId = msg.chat.id;

  try {
    const monitoredSprints = await ScrapedContent.find({
      $or: [
        { isGlobal: true },
        { userIds: chatId.toString() }
      ]
    }, {
      url: 1,
      isGlobal: 1,
      title: 1
    });

    if (monitoredSprints.length === 0) {
      await bot.sendMessage(chatId, "No sprints are currently being monitored for you.\n\nUse /add ZEALY_SPRINTS_URL to add one.");
      return;
    }

    let message = "📋 Your Monitored Sprints:\n\n";
    monitoredSprints.forEach((doc, index) => {
      const typeLabel = doc.isGlobal ? " [Global Pool]" : " [Personal]";
      message += `${index + 1}. ${doc.url}${typeLabel}\n`;
    });

    await bot.sendMessage(chatId, message);
  } catch (error) {
    console.error("Error listing URLs:", error);
    await bot.sendMessage(chatId, "Failed to fetch monitored sprints.");
  }
});

bot.onText(/\/remove (.+)/, async(msg, match) => {
  const chatId = msg.chat.id;
  const url = match[1];

  try {
    const sprint = await ScrapedContent.findOne({ url });

    if (!sprint) {
      await bot.sendMessage(chatId, "This URL is not being monitored.");
      return;
    }

    if (sprint.isGlobal) {
      await bot.sendMessage(chatId, "🚫 Global Pool sprints can only be removed by administrators.");
      return;
    }

    const index = sprint.userIds.indexOf(chatId.toString());
    if (index === -1) {
      await bot.sendMessage(chatId, "You are not monitoring this URL.");
      return;
    }

    sprint.userIds.splice(index, 1);

    if (sprint.userIds.length === 0) {
      await ScrapedContent.deleteOne({ url });
    } else {
      await sprint.save();
    }

    await bot.sendMessage(chatId, `✅ Successfully removed ${url} from your monitored sprints.`);
  } catch (error) {
    console.error("Error removing URL:", error);
    await bot.sendMessage(chatId, "Failed to remove URL. Please try again.");
  }
});

bot.onText(/\/stop/, async(msg) => {
  const chatId = msg.chat.id;

  try {
    const user = await User.findOneAndUpdate({
      telegram_chat_id: chatId.toString()
    }, {
      blocked: true
    }, {
      returnDocument: 'after'
    });

    if (!user) {
      await bot.sendMessage(chatId, "You are not registered. Use /start to register.");
      return;
    }

    await bot.sendMessage(
      chatId,
      `✅ You have been unsubscribed from quest alerts.\n\nUse /start to resubscribe at any time.`,
    );
  } catch (error) {
    console.error("Error unsubscribing user:", error);
    await bot.sendMessage(chatId, "Failed to unsubscribe. Please try again.");
  }
});

bot.on("message", async(msg) => {
  const commands = ["start", "add", "list", "remove", "stop"];

  if (msg && msg.text[0] === "/") {
    const command = msg.text.split("/");
    console.log(command[1]);

    if (!commands.includes(command[1].split(" ")[0])) {
      await bot.sendMessage(msg.chat.id, "That command doesn't exist 😅");
    }

    return;
  }
  bot.sendMessage(
    msg.chat.id,
    `Chill... No Update yet, \nI check every minute.`,
  );

  console.log(msg);
});

app.listen(PORT, () => {
  console.log(`Bot running on http://127.0.0.1:${PORT}`);
});