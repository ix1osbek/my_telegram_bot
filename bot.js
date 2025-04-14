require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { GoogleGenerativeAI } = require("@google/generative-ai")
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("Bot ishga tushdi!");
});

app.listen(PORT, () => {
    console.log(`Server ishga tushdi: ${PORT}`);
});

// === Bot setup ===
const bot = new TelegramBot(process.env.TOKEN, { polling: true });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-pro-latest" });

// /start
bot.onText(/\/start/, async (msg) => {
    try {
        bot.sendMessage(
            msg.chat.id,
            ` Assalomu aleykum <b> ${msg.chat.first_name}</b>, botdan to'liq foydalanish uchun iltimos telefon raqamingizni jo'nating!`,
            {
                reply_markup: {
                    keyboard: [
                        [{ text: "📞 Telefon raqam jo'natish", request_contact: true }],
                    ],
                    resize_keyboard: true,
                    one_time_keyboard: true,
                },
                parse_mode: "HTML",
            }
        );
    } catch (error) {
        console.error("Error: " + error.message);
    }
});

// Kontakt yuborilganda
bot.on("contact", async (msg) => {
    try {
        const fullName = `${msg.from.first_name || ''} ${msg.from.last_name || ''}`.trim();
        const username = msg.from.username || "Foydalanuvchi username kiritmagan!"
        const phone = msg.contact.phone_number;
        bot.sendMessage(process.env.CHANEL_ID, `📥 Yangi foydalanuvchi ro'yxatdan o'tdi:\n\n👤 Ismi: <b>${fullName}</b>\n📞 Raqami: <b>+${phone}</b> \n🌏Username: @${username}`, {
            parse_mode: "HTML"
        });

        bot.sendMessage(msg.chat.id, "Marxamat, quyidagilardan birini tanlashingiz mumkin!", {
            reply_markup: {
                keyboard: [
                    [{ text: "📱 Ijtimoiy tarmoqlar" }],
                    [{ text: "📡 Fikr.log Kanali" }],
                    [{ text: "🦾 AI Yordamchi" }],
                ],
                resize_keyboard: true,
            },
        });
    } catch (error) {
        console.error("Error: " + error.message);
    }
});

// Message listener
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;

    if (msg.text === "📡 Fikr.log Kanali") {
        bot.sendPhoto(chatId, "https://ibb.co/fGvXmxvt", {
            caption: "Kanalga qo'shilish uchun tugmani bosing va admin tasdiqlashini kuting!⏳",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📡 Kanalga o'tish", url: "https://t.me/+bP5TvAf9eStkZThi" }],
                ],
            },
        });
    }

    if (msg.text === "📱 Ijtimoiy tarmoqlar") {
        bot.sendMessage(chatId, "O'zingizga kerakli ijtimoiy tarmoqni tanlang⬇️", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Telegram", callback_data: "telegram" }],
                    [{ text: "GitHub", callback_data: "github" }],
                    [{ text: "Instagram", callback_data: "instagram" }],
                    [{ text: "Facebook", callback_data: "facebook" }],
                ],
            },
        });
    }


    //////// AI uchun

    if (msg.text === "🦾 AI Yordamchi") {
        await bot.sendMessage(chatId, "Marhamat savolingiz bo'lsa yo'llang sizga AI yordamchi javob beradi.")
        bot.on("message", async (msg) => {
            const chatId = msg.chat.id
            const userText = msg.text
            await bot.sendMessage(chatId, "✳️Iltimos kuting, javob yozilmoqda...");

            try {
                const result = await model.generateContent(userText);
                const response = result.response.text();
                await bot.sendMessage(chatId, response, {
                  parse_mode: "Markdown"
                });
            } catch (error) {
                console.error("Xatolik:", error.message);
                await bot.sendMessage(chatId, "❌ Javob olishda xatolik yuz berdi.");
            }
        })
    }
});

// Callbacklar
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;

    try {
        if (query.data === "telegram") {
            bot.sendPhoto(chatId, "https://ibb.co/twkLbdHC", {
                caption: "Telegram",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "Telegram", url: "https://t.me/ix1osbek" }],
                        [{ text: "⬅️ Ortga", callback_data: "back_to_social" }],
                    ],
                },
            });
        }

        if (query.data === "github") {
            bot.sendPhoto(chatId, "https://ibb.co/6cYTKK7S", {
                caption: "GitHub",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "GitHub", url: "https://github.com/ix1osbek" }],
                        [{ text: "⬅️ Ortga", callback_data: "back_to_social" }],
                    ],
                },
            });
        }

        if (query.data === "instagram" || query.data === "facebook") {
            bot.answerCallbackQuery(query.id, {
                text: "Hozirda bu tarmoqda faoliyat olib bormayapman 🙁",
                show_alert: true,
            });
        }

        if (query.data === "back_to_social") {
            bot.deleteMessage(chatId, query.message.message_id);
            bot.sendMessage(chatId, "O'zingizga kerakli ijtimoiy tarmoqni tanlang⬇️", {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "Telegram", callback_data: "telegram" }], [{ text: "GitHub", callback_data: "github" }],
                        [{ text: "Instagram", callback_data: "instagram" }],
                        [{ text: "Facebook", callback_data: "facebook" }],
                    ],
                },
            });
        }
    } catch (error) {
        console.error("Callback error:", error.message);
    }
});