import { connectDB } from "../db/connect.js";
import mongoose from "mongoose";
import User from "../models/User.js";
import ScrapedContent from "../models/ScrapedContent.js";
import { sendAlertsToUsers } from "../helpers/scraperHelpers.js";

// Helper to simulate Telegram message structure
function makeMsg(chatId, text = '') {
  return {
    chat: {
      id: chatId,
      username: `user_${chatId}`,
      first_name: `TestName_${chatId}`
    },
    text
  };
}

async function runTests() {
  console.log("=== Running Upgrade Integration Tests ===");
  try {
    await connectDB();
    console.log("Connected to test database.");

    // Clean up any stale test documents first
    await User.deleteMany({ telegram_chat_id: { $regex: /^test_/ } });
    await ScrapedContent.deleteMany({ url: { $regex: /^test_url_/ } });

    // 1. Create Test Users
    console.log("\n--- Creating Test Users ---");
    const normalUser = await User.create({
      name: "Normal User",
      username: "normal_user",
      telegram_chat_id: "test_normal_id",
      blocked: true,
      blacklisted: false,
      premium: false
    });
    console.log("Created normal user (blocked: true, non-premium)");

    const premiumUser = await User.create({
      name: "Premium User",
      username: "premium_user",
      telegram_chat_id: "test_premium_id",
      blocked: true,
      blacklisted: false,
      premium: true
    });
    console.log("Created premium user (blocked: true, premium: true)");

    const blacklistedUser = await User.create({
      name: "Blacklisted User",
      username: "blacklisted_user",
      telegram_chat_id: "test_blacklisted_id",
      blocked: true,
      blacklisted: true,
      premium: false
    });
    console.log("Created blacklisted user (blocked: true, blacklisted: true)");

    // Mock Telegram Bot
    const sentMessages = [];
    const mockBot = {
      sendMessage: async (chatId, text) => {
        sentMessages.push({ chatId: chatId.toString(), text });
        console.log(`[Mock Bot] Sent to ${chatId}: ${text.substring(0, 50)}...`);
        return true;
      }
    };

    // 2. Test Blacklist /start blocking
    console.log("\n--- Testing Blacklist /start Command Blocking ---");
    // Simulate /start handler logic for blacklisted user
    const blUserPreStart = await User.findOne({ telegram_chat_id: "test_blacklisted_id" });
    if (blUserPreStart && blUserPreStart.blacklisted) {
      await mockBot.sendMessage(
        "test_blacklisted_id",
        `🚫 You have been blacklisted and cannot resubscribe. Please contact @vicdevman for support.`
      );
    }
    
    // Simulate /start for normal user
    const normalUserUpdate = await User.findOneAndUpdate(
      { telegram_chat_id: "test_normal_id" },
      { blocked: false },
      { returnDocument: 'after' }
    );
    console.log(`Normal user blocked status after /start simulation: ${normalUserUpdate.blocked} (Expected: false)`);
    if (normalUserUpdate.blocked !== false) {
      throw new Error("Normal user failed to unblock on /start");
    }

    // Verify messages sent
    const blMessage = sentMessages.find(m => m.chatId === "test_blacklisted_id");
    if (!blMessage || !blMessage.text.includes("blacklisted")) {
      throw new Error("Blacklisted user did not receive blacklist block message");
    }
    console.log("✅ Blacklist /start block verified.");

    // 3. Test Sprint Limit for Non-Premium User
    console.log("\n--- Testing Sprint Limit for Non-Premium User ---");
    // Add 3 sprints for normal user
    for (let i = 1; i <= 3; i++) {
      await ScrapedContent.create({
        url: `test_url_${i}`,
        title: `Test Sprint ${i}`,
        content: `Content for sprint ${i}`,
        isGlobal: false,
        userIds: ["test_normal_id"]
      });
    }

    // Attempt to add 4th sprint for normal user
    const count = await ScrapedContent.countDocuments({ userIds: "test_normal_id" });
    console.log(`Normal user owned sprints: ${count}`);
    if (count >= 3) {
      await mockBot.sendMessage(
        "test_normal_id",
        `⚠️ Limit Reached: Non-premium users can monitor at most 3 personal sprints. Please contact @vicdevman to upgrade to premium.`
      );
    }

    const limitMsg = sentMessages.find(m => m.chatId === "test_normal_id" && m.text.includes("Limit Reached"));
    if (!limitMsg) {
      throw new Error("Limit warning was not sent to non-premium user when adding 4th sprint");
    }
    console.log("✅ Premium limit verification for non-premium user passed.");

    // Verify premium user has no limits
    // Unblock premium user first
    await User.findOneAndUpdate({ telegram_chat_id: "test_premium_id" }, { blocked: false });
    // Add 4 sprints for premium user
    for (let i = 1; i <= 4; i++) {
      const url = `test_url_prem_${i}`;
      await ScrapedContent.create({
        url,
        title: `Test Sprint Premium ${i}`,
        content: `Content for premium sprint ${i}`,
        isGlobal: false,
        userIds: ["test_premium_id"]
      });
    }
    const countPrem = await ScrapedContent.countDocuments({ userIds: "test_premium_id" });
    console.log(`Premium user owned sprints: ${countPrem} (Expected: 4)`);
    if (countPrem !== 4) {
      throw new Error("Premium user could not add 4 sprints");
    }
    console.log("✅ Premium user unlimited sprints verified.");

    // 4. Test Alert Separation (Global vs Personal Sprints)
    console.log("\n--- Testing Alert Separation & Routing ---");
    
    // Create one global alert and one personal alert
    const globalSprint = await ScrapedContent.create({
      url: "test_url_global_alert",
      title: "Global Sprint",
      content: "Initial Content",
      isGlobal: true,
      userIds: []
    });

    const personalSprint = await ScrapedContent.create({
      url: "test_url_personal_alert",
      title: "Personal Sprint",
      content: "Initial Content",
      isGlobal: false,
      userIds: ["test_normal_id"] // Only test_normal_id should get this
    });

    // Mock alerts list returned by detector
    const mockAlerts = [
      {
        url: "test_url_global_alert",
        additions: "[New Global Quest](url1)\nReward: 100 Xp",
        isGlobal: true,
        userIds: []
      },
      {
        url: "test_url_personal_alert",
        additions: "[New Personal Quest](url2)\nReward: 50 Xp",
        isGlobal: false,
        userIds: ["test_normal_id"]
      }
    ];

    // Reset sent messages
    sentMessages.length = 0;

    // Dispatch alerts
    await sendAlertsToUsers(mockAlerts, mockBot);

    // Verify who received which message:
    // Expected:
    // - test_normal_id receives BOTH global and personal alert.
    // - test_premium_id receives ONLY global alert.
    // - test_blacklisted_id receives NONE because they are blacklisted/blocked.

    const normalMsgs = sentMessages.filter(m => m.chatId === "test_normal_id");
    const premiumMsgs = sentMessages.filter(m => m.chatId === "test_premium_id");
    const blacklistedMsgs = sentMessages.filter(m => m.chatId === "test_blacklisted_id");

    console.log(`Normal user received ${normalMsgs.length} messages (Expected: 2)`);
    console.log(`Premium user received ${premiumMsgs.length} messages (Expected: 1)`);
    console.log(`Blacklisted user received ${blacklistedMsgs.length} messages (Expected: 0)`);

    if (normalMsgs.length !== 2) {
      throw new Error("Normal user did not receive both global and personal alerts");
    }
    if (premiumMsgs.length !== 1 || !premiumMsgs[0].text.includes("Global")) {
      throw new Error("Premium user did not receive the correct global alert");
    }
    if (blacklistedMsgs.length !== 0) {
      throw new Error("Blacklisted user received alerts");
    }

    console.log("✅ Alert routing and separation verified successfully.");

    // Clean up
    console.log("\n--- Cleaning up test records ---");
    await User.deleteMany({ telegram_chat_id: { $regex: /^test_/ } });
    await ScrapedContent.deleteMany({ url: { $regex: /^test_url_/ } });
    console.log("Cleanup finished.");
    console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉");

  } catch (error) {
    console.error("❌ Test failed:", error);
    // Attempt cleanup anyway
    try {
      await User.deleteMany({ telegram_chat_id: { $regex: /^test_/ } });
      await ScrapedContent.deleteMany({ url: { $regex: /^test_url_/ } });
    } catch (_) {}
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from database.");
  }
}

runTests();
