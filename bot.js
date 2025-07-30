require("dotenv").config()
const TelegramBot = require("node-telegram-bot-api")
const express = require("express")
const { GoogleGenerativeAI } = require("@google/generative-ai")
const path = require("path")
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args))

const app = express()
const PORT = process.env.PORT

app.get("/", (req, res) => res.send("Bot ishga tushdi!"))
app.listen(PORT, () => console.log(`Server: ${PORT}`))

const bot = new TelegramBot(process.env.TOKEN, { polling: true })
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" })

let isAskingAI = {}

function sendMainMenu(chatId) {
    bot.sendMessage(chatId, "Quyidagilardan birini tanlang:", {
        reply_markup: {
            keyboard: [
                [{ text: "📱 Ijtimoiy tarmoqlar" }, { text: "🦾 AI Yordamchi" }],
                [{ text: "🗞 TOP-3 World News" }, { text: "📊 Valyuta kurslari" }],
                [{ text: "📄 Resume" }, { text: "📡 Fikr.log Kanali" }]
            ],
            resize_keyboard: true,
        }
    })
}

// === START ===
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id,
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

bot.on("contact", (msg) => {
    const fullName = `${msg.from.first_name || ""} ${msg.from.last_name || ""}`.trim()
    const username = msg.from.username || "Username ko‘rsatilmagan"
    const phone = msg.contact.phone_number

    bot.sendMessage(process.env.CHANEL_ID,
        `📥 Yangi foydalanuvchi:\n👤 <b>${fullName}</b>\n📞 <b>+${phone}</b>\n🌏Username: @${username}`,
        { parse_mode: "HTML" }
    )

    sendMainMenu(msg.chat.id)
})

// === TEXT HANDLER ===
bot.on("message", async (msg) => {
    const chatId = msg.chat.id
    const text = msg.text

    if (!text || msg.contact) return

    if (text === "📡 Fikr.log Kanali") {
        return bot.sendPhoto(chatId, "https://ibb.co/fGvXmxvt", {
            caption: "Kanalga qo‘shilish uchun tugmani bosing va admin tasdiqlashini kuting!⏳",
            reply_markup: {
                inline_keyboard: [[{ text: "📡 Kanalga o‘tish", url: "https://t.me/+bP5TvAf9eStkZThi" }]],
            }
        })
    }

    if (text === "📱 Ijtimoiy tarmoqlar") {
        return bot.sendMessage(chatId, "O‘zingizga kerakli ijtimoiy tarmoqni tanlang⬇️", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Telegram", callback_data: "telegram" }],
                    [{ text: "Website", callback_data: "website" }],
                    [{ text: "Twitter (x)", callback_data: "twitter" }],
                    [{ text: "Linkedin", callback_data: "linkedin" }],
                    [{ text: "GitHub", callback_data: "github" }],
                    [{ text: "Instagram", callback_data: "instagram" }],
                    [{ text: "Facebook", callback_data: "facebook" }]
                ]
            }
        })
    }

    if (text === "📄 Resume") {
        const filePath = path.join(__dirname, "resume.pdf")
        await bot.sendMessage(chatId, "⏳ Iltimos kuting, rezume yuklanmoqda...")

        try {
            return bot.sendDocument(chatId, filePath, {
                caption: "📄 Ixlosbek Erkinov's resume",
                reply_markup: {
                    inline_keyboard: [[{ text: "⬅️ Ortga", callback_data: "back_to_menu" }]]
                }
            })
        } catch (error) {
            console.error("❌ Rezume yuklashda xatolik:", error.message)
            bot.sendMessage(chatId, "❌ Xatolik yuz berdi.")
        }
    }

    if (text === "🦾 AI Yordamchi") {
        isAskingAI[chatId] = true
        return bot.sendMessage(chatId, "Marhamat, savolingizni yozing. AI yordamchi javob beradi.")
    }

    if (text === "📊 Valyuta kurslari") {
        return bot.sendMessage(chatId, "💱 Valyuta kurslari ustida hozirda ishlanmoqda. Tez orada foydalanishingiz mumkin bo‘ladi.")
    }


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
                    timeZone: "Asia/Tashkent",
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                })

                const message = `
📰 <b>${article.title}</b>

${article.description || "Batafsil quyida o‘qing:"}

📅 <b>Chiqarilgan:</b> ${formattedTime} (O'zbekiston vaqti)
🔗 <a href="${article.url}">To‘liq o‘qish</a>
🗞 Manba: ${article.source.name}`.trim()

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

    if (isAskingAI[chatId]) {
        isAskingAI[chatId] = false
        await bot.sendMessage(chatId, "⏳ AI javob bermoqda...")

        try {
            const result = await model.generateContent(text)
            const response = result.response.text()

            await bot.sendMessage(chatId, response, { parse_mode: "Markdown" })

            await bot.sendMessage(chatId, "🧠 Yana savolingiz bormi?", {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🔁 Yana savolim bor", callback_data: "ask_again" }],
                        [{ text: "⬅️ Ortga", callback_data: "back_to_menu" }]
                    ]
                }
            })
        } catch (error) {
            console.error("AI xatolik:", error.message)
            bot.sendMessage(chatId, "❌ AI javob berishda xatolik yuz berdi.")
        }
    }
})

// === CALLBACK HANDLERS ===
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id
    const data = query.data

    if (data === "ask_again") {
        isAskingAI[chatId] = true
        await bot.deleteMessage(chatId, query.message.message_id)
        return bot.sendMessage(chatId, "Marhamat, savolingizni yozing:")
    }

    if (data === "back_to_menu" || data === "back_to_social") {
        try {
            await bot.deleteMessage(chatId, query.message.message_id)
        } catch (e) {
            console.log("❌ deleteMessage xatolik:", e.message)
        }
    }

    const socialLinks = {
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
            url: "https://www.linkedin.com/in/ixlosbek-erkinov-519a5a358",
            photo: "https://ibb.co/HTQVc1hm",
        },
        facebook: {
            caption: "Facebook",
            url: "https://www.facebook.com/share/1anS7ieEf1/?mibextid=wwXIfr",
            photo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRIou9WTweBF8jIBPf8Mjyxzud5PEiEQpRp2w&s",
        },
        website: {
            caption: "Website",
            url: "https://www.ixlosbek.uz",
            photo: "https://img.freepik.com/free-vector/www-internet-globe-grid_78370-2008.jpg",
        }
    }

    if (data in socialLinks) {
        const { caption, url, photo } = socialLinks[data]

        return bot.sendPhoto(chatId, photo, {
            caption,
            reply_markup: {
                inline_keyboard: [
                    [{ text: caption, url }],
                    [{ text: "⬅️ Ortga", callback_data: "back_to_social" }]
                ]
            }
        })
    }

    if (data === "instagram") {
        return bot.answerCallbackQuery(query.id, {
            text: "Hozircha bu tarmoqda faol emasman 🙁",
            show_alert: true
        })
    }
})
