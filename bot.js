require("dotenv").config()
const TelegramBot = require("node-telegram-bot-api")
const express = require("express")
const { GoogleGenerativeAI } = require("@google/generative-ai")
const path = require("path")

const app = express()
const PORT = process.env.PORT || 3000

app.get("/", (req, res) => {
    res.send("Bot ishga tushdi!")
})

app.listen(PORT, () => {
    console.log(`Server ishga tushdi: ${PORT}`)
})

// === Bot va AI setup ===
const bot = new TelegramBot(process.env.TOKEN, { polling: true })
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-pro-latest" })

// === AI yordamchi uchun flaglar ===
let isAskingAI = {}

// === /start komandasi ===
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(
        msg.chat.id,
        `Assalomu aleykum <b>${msg.chat.first_name}</b>, botdan to‘liq foydalanish uchun telefon raqamingizni yuboring!`,
        {
            reply_markup: {
                keyboard: [[{ text: "📞 Telefon raqam jo‘natish", request_contact: true }]],
                resize_keyboard: true,
                one_time_keyboard: true,
            },
            parse_mode: "HTML",
        }
    )
})

// === Kontakt yuborilganda ===
bot.on("contact", (msg) => {
    const fullName = `${msg.from.first_name || ''} ${msg.from.last_name || ''}`.trim()
    const username = msg.from.username || "Username ko‘rsatilmagan"
    const phone = msg.contact.phone_number

    bot.sendMessage(
        process.env.CHANEL_ID,
        `📥 Yangi foydalanuvchi ro‘yxatdan o‘tdi:\n\n👤 Ismi: <b>${fullName}</b>\n📞 Raqami: <b>${phone}</b>\n🌏Username: @${username}`,
        { parse_mode: "HTML" }
    )

    bot.sendMessage(msg.chat.id, "Marhamat, quyidagilardan birini tanlashingiz mumkin!", {
        reply_markup: {
            keyboard: [
                [{ text: "📱 Ijtimoiy tarmoqlar" }, { text: "🦾 AI Yordamchi" }],
                [{ text: "📡 Fikr.log Kanali" }, { text: "📄 Resume" }]
            ],
            resize_keyboard: true,
        },
    })
})

// === Foydalanuvchi xabarlar ===
bot.on("message", async (msg) => {
    const chatId = msg.chat.id
    const text = msg.text

    if (!text || msg.contact) return

    if (text === "📡 Fikr.log Kanali") {
        return bot.sendPhoto(chatId, "https://ibb.co/fGvXmxvt", {
            caption: "Kanalga qo‘shilish uchun tugmani bosing va admin tasdiqlashini kuting!⏳",
            reply_markup: {
                inline_keyboard: [[{ text: "📡 Kanalga o‘tish", url: "https://t.me/+bP5TvAf9eStkZThi" }]],
            },
        })
    }

    if (text === "📱 Ijtimoiy tarmoqlar") {
        return bot.sendMessage(chatId, "O‘zingizga kerakli ijtimoiy tarmoqni tanlang⬇️", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Telegram", callback_data: "telegram" }],
                    [{ text: "Twitter (x)", callback_data: "twitter" }],
                    [{ text: "Linkedin", callback_data: "linkedin" }],
                    [{ text: "GitHub", callback_data: "github" }],
                    [{ text: "Instagram", callback_data: "instagram" }],
                    [{ text: "Facebook", callback_data: "facebook" }],
                ],
            },
        })
    }

    if (text === "📄 Resume") {
        const filePath = path.join(__dirname, "resume.pdf")
        await bot.sendMessage(chatId, "⏳ Iltimos kuting, rezume yuklanmoqda...")

        try {
            return bot.sendDocument(chatId, filePath, {
                caption: "📄Ixlosbek Erkinov's resume",
                reply_markup: {
                    inline_keyboard: [[{ text: "⬅️ Ortga", callback_data: "back_to_menuy" }]],
                },
            })
        } catch (error) {
            console.error("AI xatolik:", error.message)
            await bot.sendMessage(chatId, "❌ Rezume yuklashda xatolik yuz berdi.")
        }
    }

    if (text === "🦾 AI Yordamchi") {
        isAskingAI[chatId] = true
        return bot.sendMessage(chatId, "Marhamat, savolingizni yozing. AI yordamchi javob beradi.")
    }

    // === AI uchun savol yuborilganda ===
    if (isAskingAI[chatId]) {
        isAskingAI[chatId] = false

        await bot.sendMessage(chatId, "⏳ Iltimos kuting, javob yozilmoqda...")

        try {
            const result = await model.generateContent(text)
            const response = result.response.text()

            await bot.sendMessage(chatId, response, { parse_mode: "Markdown" })

            await bot.sendMessage(chatId, "🧠 Yana savolingiz bormi?", {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🔁 Yana savolim bor", callback_data: "ask_again" }],
                        [{ text: "🔙 Ortga", callback_data: "back_to_menu" }],
                    ],
                },
            })
        } catch (error) {
            console.error("AI xatolik:", error.message)
            await bot.sendMessage(chatId, "❌ Javob olishda xatolik yuz berdi.")
        }
    }
})

// === Callback tugmalar ===
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id
    const data = query.data

    // 1. AI Yordamchi tugmalari
    if (data === "ask_again") {
        isAskingAI[chatId] = true
        await bot.deleteMessage(chatId, query.message.message_id)
        return bot.sendMessage(chatId, "Marhamat, savolingizni yozing:")
    }

    if (data === "back_to_menu") {
        await bot.deleteMessage(chatId, query.message.message_id)
        return bot.sendMessage(chatId, "Marhamat, quyidagilardan birini tanlashingiz mumkin!", {
            reply_markup: {
                keyboard: [
                    [{ text: "📱 Ijtimoiy tarmoqlar" }, { text: "🦾 AI Yordamchi" }],
                    [{ text: "📡 Fikr.log Kanali" }, { text: "📄 Resume" }]
                ],
                resize_keyboard: true,
            },
        })
    }

    // 2. Ijtimoiy tarmoqlar
    const responses = {
        telegram: {
            caption: "Telegram",
            url: "https://t.me/ix1osbek",
            photo: "https://ibb.co/twkLbdHC",
        },
        github: {
            caption: "GitHub",
            url: "https://github.com/ix1osbek",
            photo: "https://ibb.co/6cYTKK7S",
        },
        twitter: {
            caption: "Twitter",
            url: "https://x.com/erk1nov_i",
            photo: "https://ibb.co/6Rxc5t2g",
        },
        linkedin: {
            caption: "Linkedin",
            url: "https://www.linkedin.com/in/ixlosbek-erkinov-519a5a358?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app",
            photo: "https://ibb.co/HTQVc1hm",
        },
    }

    if (data in responses) {
        const { caption, url, photo } = responses[data]
        return bot.sendPhoto(chatId, photo, {
            caption,
            reply_markup: {
                inline_keyboard: [
                    [{ text: caption, url }],
                    [{ text: "⬅️ Ortga", callback_data: "back_to_social" }],
                ],
            },
        })
    }

    if (data === "instagram" || data === "facebook") {
        return bot.answerCallbackQuery(query.id, {
            text: "Hozirda bu tarmoqda faoliyat olib bormayapman 🙁",
            show_alert: true,
        })
    }

    if (data === "back_to_social") {
        await bot.deleteMessage(chatId, query.message.message_id)
        return bot.sendMessage(chatId, "O‘zingizga kerakli ijtimoiy tarmoqni tanlang⬇️", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Telegram", callback_data: "telegram" }],
                    [{ text: "GitHub", callback_data: "github" }],
                    [{ text: "Instagram", callback_data: "instagram" }],
                    [{ text: "Facebook", callback_data: "facebook" }],
                    [{ text: "Twitter (x)", callback_data: "twitter" }],
                    [{ text: "Linkedin", callback_data: "linkedin" }],
                ],
            },
        })
    }

    if (data === "back_to_menuy") {
        // Callback tugmasi bosilganda oldingi xabarni o'chirish
        await bot.deleteMessage(chatId, query.message.message_id)
        return bot.sendMessage(chatId, "Marhamat, quyidagilardan birini tanlashingiz mumkin!", {
            reply_markup: {
                keyboard: [
                    [{ text: "📱 Ijtimoiy tarmoqlar" }, { text: "🦾 AI Yordamchi" }],
                    [{ text: "📡 Fikr.log Kanali" }, { text: "📄 Resume" }]
                ],
                resize_keyboard: true,
            },
        })
    }
})
