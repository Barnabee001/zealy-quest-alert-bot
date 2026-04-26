import express from "express";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import {
  connectDB
} from "./db/connect.js";

const app = express();
dotenv.config();

app.use(express.json());
connectDB();

const PORT = process.env.PORT;
const token = process.env.TELEGRAM_BOT_KEY;

const bot = new TelegramBot(token, {
  polling: false,
});

bot.setWebHook(`https://7755bf2493b3.ngrok-free.app/bot`);

app.post(`/bot`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

bot.onText(/\/start/, async(msg) => {
  const chatId = msg.chat.id;
  const username = msg.chat.username;
  const firstName = msg.chat.first_name;

  console.log(chatId, username, firstName);
  bot.sendMessage(
    chatId,
    `Bot active you will recieve any zealy quest alert from the following sprints: `,
  );
});

bot.on("message", async(msg) => {
  const commands = ["start"];

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
  console.log(`Bot running on http: //127.0.0.1:${PORT}`);
});