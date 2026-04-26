import express from "express";
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

    // Check if URL is valid (no 404 errors)
    if (!isUrlValid(scrapedData)) {
      await bot.sendMessage(
        chatId,
        `I'm not sure this page exist cause it returned a 404 error. check your source`,
      );
      return;
    }

    // Store URL and scraped content in DB
    await ScrapedContent.create({
      url,
      scrapedcontent: scrapedData,
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