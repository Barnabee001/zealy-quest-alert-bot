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
    await bot.setWebHook(`https://zealyquestalertbot.vercel.app/bot`);
    await bot.setMyCommands([{
      command: "start",
      description: "Get Connected",
    }, {
      command: "add",
      description: "Add new url",
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
    // Get all URLs from DB
    const scrapedContents = await ScrapedContent.find({});
    const urls = scrapedContents.map((doc) => doc.url);

    // Call scraper for all URLs
    const newScrapedData = [];
    for (const url of urls) {
      const scrapedData = await scrapePage(url);
      newScrapedData.push({
        url,
        data: scrapedData,
      });
    }

    // Compare content with DB and update if changed
    const alerts = [];
    for (const {
        url,
        data
      }
      of newScrapedData) {
      const existing = await ScrapedContent.findOne({
        url,
      });

      if (JSON.stringify(existing.scrapedcontent) !== JSON.stringify(data)) {
        await ScrapedContent.findOneAndUpdate({
          url,
        }, {
          scrapedcontent: data,
        }, {
          upsert: true,
          new: true,
        }, );
        alerts.push({
          url,
          data,
        });
      }
    }

    // If new content found, fetch users and send alert
    if (alerts.length > 0) {
      const users = await User.find({});
      for (const user of users) {
        for (const alert of alerts) {
          await bot.sendMessage(
            user.telegram_chat_id,
            `🚀 New quest update for ${alert.url}\n\n${JSON.stringify(alert.data).substring(0, 1000)}...`,
          );
        }
      }
    }

    res.status(200).json({
      message: "Scraper Successful",
      alertsFound: alerts.length,
      usersNotified: alerts.length > 0 ? await User.countDocuments() : 0,
    });
  } catch (error) {
    console.error("Scraper error:", error);
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
      new: true,
    }, );
    console.log("User stored:", chatId, username, firstName);
  } catch (error) {
    console.error("Error storing user:", error);
  }

  bot.sendMessage(
    chatId,
    `Bot active! You will receive zealy quest alerts from monitored sprints.\n\nUse /add <url> to add a new sprint to monitor.`,
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

    // Scrape initial content
    const scrapedData = await scrapePage(url);

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
      `❌ Failed to add URL. Please check the URL and try again.`,
    );
  }
});

bot.on("message", async(msg) => {
  const commands = ["start", "add"];

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
    `Bot active! No Update yet, lol Chill... \nI check every 2min.`,
  );

  console.log(msg);
});

app.listen(PORT, () => {
  console.log(`Bot running on http://127.0.0.1:${PORT}`);
});