require("dotenv").config()
const TelegramBot = require("node-telegram-bot-api")
const express = require("express")
const { GoogleGenerativeAI } = require("@google/generative-ai")
const path = require("path")
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args)) // 🛠 Yangiliklar API uchun fetch

const app = express()
const PORT = process.env.PORT

app.get("/", (req, res) => {
    res.send("Bot ishga tushdi!")
})

app.listen(PORT, () => {
    console.log(`Server ishga tushdi: ${PORT}`)
})

// === Bot va AI setup ===
const bot = new TelegramBot(process.env.TOKEN, { polling: true })
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' })

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
        `📥 Yangi foydalanuvchi ro‘yxatdan o‘tdi:\n\n👤 Ismi: <b>${fullName}</b>\n📞 Raqami: <b>+${phone}</b>\n🌏Username: @${username}`,
        { parse_mode: "HTML" }
    )

    bot.sendMessage(msg.chat.id, "Marhamat, quyidagilardan birini tanlashingiz mumkin!", {
        reply_markup: {
            keyboard: [
                [{ text: "📱 Ijtimoiy tarmoqlar" }, { text: "🦾 AI Yordamchi" }],
                [{ text: "🗞 TOP-3 World News" }, { text: "📡 Fikr.log Kanali" }],
                [{ text: "📄 Resume" }]
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

    // === 🗞 Yangiliklar bo‘limi ===
    if (text === "🗞 TOP-3 World News") {
        const API_KEY = process.env.GNEWS_API_KEY
        const url = `https://gnews.io/api/v4/top-headlines?lang=en&max=3&token=${API_KEY}`

        try {
            const response = await fetch(url)
            const data = await response.json()

            if (!data.articles || data.articles.length === 0) {
                return bot.sendMessage(chatId, "Hozircha yangiliklar topilmadi.")
            }

            for (let article of data.articles) {
                const date = new Date(article.publishedAt)
                const formattedTime = date.toLocaleString("uz-UZ", {
                    timeZone: "Asia/Tashkent", // ✅ O‘zbekiston vaqti
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                })

                const message = `
📰 <b>${article.title}</b>

${article.description || "Batafsil ma'lumot quyidagi havolada:"}

📅 <b>Chiqarilgan:</b> ${formattedTime} (O'zbekiston vaqti bilan)
🔗 <a href="${article.url}">To‘liq o‘qish</a>
🗞 Manba: ${article.source.name}
            `.trim()

                await bot.sendPhoto(chatId, article.image || 'https://via.placeholder.com/400x200.png?text=No+Image', {
                    caption: message,
                    parse_mode: "HTML"
                })
            }

        } catch (error) {
            console.error("❌ API xatoligi:", error.message)
            bot.sendMessage(chatId, "❌ Yangiliklarni yuklashda xatolik yuz berdi.")
        }
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
            await bot.sendMessage(chatId, "❌ Javob olishda xatolik yuz berdi. Iltimos birozdan so'ng urinib ko'ring!")
        }
    }
})

// === Callback tugmalar ===
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id
    const data = query.data

    if (data === "ask_again") {
        isAskingAI[chatId] = true
        await bot.deleteMessage(chatId, query.message.message_id)
        return bot.sendMessage(chatId, "Marhamat, savolingizni yozing:")
    }

    if (data === "back_to_menu" || data === "back_to_menuy") {
        await bot.deleteMessage(chatId, query.message.message_id)
        return bot.sendMessage(chatId, "Marhamat, quyidagilardan birini tanlashingiz mumkin!", {
            reply_markup: {
                keyboard: [
                    [{ text: "📱 Ijtimoiy tarmoqlar" }, { text: "🦾 AI Yordamchi" }],
                    [{ text: "🗞 Yangiliklar" }, { text: "📡 Fikr.log Kanali" }],
                    [{ text: "📄 Resume" }]
                ],
                resize_keyboard: true,
            },
        })
    }

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
                    [{ text: "Twitter (x)", callback_data: "twitter" }],
                    [{ text: "Linkedin", callback_data: "linkedin" }],
                    [{ text: "GitHub", callback_data: "github" }],
                    [{ text: "Instagram", callback_data: "instagram" }],
                    [{ text: "Facebook", callback_data: "facebook" }],
                ],
            },
        })
    }
})
