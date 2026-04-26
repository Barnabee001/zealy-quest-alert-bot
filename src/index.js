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
        data: "Array of user objects with name, username, telegram_chat_id, timestamps"
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
        usersNotified: "number"
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
        createdAt: "ISODate - When the user was registered",
        updatedAt: "ISODate - When the user was last updated"
      }
    },
    notes: [
      "All endpoints support CORS from any origin",
      "Responses are sorted by createdAt in descending order (newest first)",
      "The /scraper endpoint automatically sends Telegram alerts when content changes are detected",
      "Only the 'content' field is compared for changes (ignores metadata, external, usage, and timestamps)",
      "Telegram bot commands: /start, /add <url>, /list, /remove <url>"
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
      });
      return;
    }

    const newScrapedData = await scrapeAllUrls(urls, scrapePage);
    const alerts = await detectContentChanges(newScrapedData);
    await sendAlertsToUsers(alerts, bot);

    logStatus('=== Scraper job completed ===');

    res.status(200).json({
      message: "Scraper Successful",
      alertsFound: alerts.length,
      usersNotified: alerts.length > 0 ? await User.countDocuments() : 0,
    });
  } catch (error) {
    logStatus(`❌ Scraper error: ${error.message}`);
    res.status(500).json({
      error: "Scraper failed",
    });
  }
});

bot.onText(/\/start/, async(msg) => {
  const chatId = msg.chat.id;
  const username = msg.chat.username;
  const firstName = msg.chat.first_name;

  // Store user details in DB
  try {
    await User.findOneAndUpdate({
      telegram_chat_id: chatId.toString(),
    }, {
      name: firstName || "Unknown",
      username: username || "unknown",
      telegram_chat_id: chatId.toString(),
    }, {
      upsert: true,
      returnDocument: 'after'
    }, );
    console.log("User stored:", chatId, username, firstName);
  } catch (error) {
    console.error("Error storing user:", error);
  }

  bot.sendMessage(
    chatId,
    `Bot active! You have subscribe to receive zealy quest alerts from monitored sprints.\n\nCommands:\n/add ZEALY_SPRINTS_URL - Add a new sprint to monitor\n/list - View all monitored sprints\n/remove ZEALY_SPRINTS_URL - Remove a sprint from monitoring`,
  );
});

bot.onText(/\/add (.+)/, async(msg, match) => {
  const chatId = msg.chat.id;
  const url = match[1];

  try {
    // Check if URL already exists
    const existing = await ScrapedContent.findOne({
      url,
    });
    if (existing) {
      await bot.sendMessage(chatId, `This URL is already being monitored.`);
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
        `
      I'm not sure this page exist cause it returned a 404 error. check your source`,
      );
      return;
    }

    // Store URL and scraped content in DB
    await ScrapedContent.create({
      url,
      title: scrapedData.data.title || 'No title',
      description: scrapedData.data.description || '',
      content: scrapedData.data.content || '',
      metadata: scrapedData.data.metadata || {},
      external: scrapedData.data.external || {},
      usage: scrapedData.data.usage || {},
      scrapedAt: new Date()
    });

    await bot.sendMessage(
      chatId,
      `✅ Successfully added ${url} to monitoring!`,
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
    const monitoredUrls = await ScrapedContent.find({}, {
      url: 1,
      _id: 0
    });

    if (monitoredUrls.length === 0) {
      await bot.sendMessage(chatId, "No sprints are currently being monitored.\n\nUse /add ZEALY_SPRINTS_URL to add one.");
      return;
    }

    let message = "📋 Monitored Sprints:\n\n";
    monitoredUrls.forEach((doc, index) => {
      message += `${index + 1}. ${doc.url}\n`;
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
    const result = await ScrapedContent.findOneAndDelete({
      url
    });

    if (!result) {
      await bot.sendMessage(chatId, "This URL is not being monitored.");
      return;
    }

    await bot.sendMessage(chatId, `✅ Successfully removed ${url} from monitoring.`);
  } catch (error) {
    console.error("Error removing URL:", error);
    await bot.sendMessage(chatId, "Failed to remove URL. Please try again.");
  }
});

bot.on("message", async(msg) => {
  const commands = ["start", "add", "list", "remove"];

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