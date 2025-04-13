require("dotenv").config()
const TelegramBot = require("node-telegram-bot-api")
const TOKEN = process.env.TOKEN

const bot = new TelegramBot(TOKEN, { polling: true })

bot.onText(/\/start/, async (msg) => {
    try {
        bot.sendMessage(msg.chat.id, `Assalomu aleykum <b>${msg.chat.first_name}</b>, botdan to'liq foydalanish uchun iltimos telefon raqamingizni jo'nating!`, {
            reply_markup: {
                keyboard: [
                    [{ text: "📞 Telefon raqam jo'natish", request_contact: true }]
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            },
            parse_mode: "HTML"
        })
    } catch (error) {
        throw new Error("Error: " + error.message);

    }
})


bot.on("contact", async (msg) => {
    try {
        const fullName = `${msg.from.first_name || ''} ${msg.from.last_name || ''}`.trim();
        const username = msg.from.username || "Foydalanuvchi username kiritmagan!"
        const phone = msg.contact.phone_number;
        bot.sendMessage(process.env.CHANEL_ID, `📥 Yangi foydalanuvchi ro'yxatdan o'tdi:\n\n👤 Ismi: <b>${fullName}</b>\n📞 Raqami: <b>+${phone}</b> \n🌏Username: @${username}`, {
            parse_mode: "HTML"
        });
        bot.sendMessage(msg.chat.id, `Marxamat, quyidagilardan birini tanlashingiz mumkin!`, {
            reply_markup: {
                keyboard: [
                    [{ text: "Ijtimoiy tarmoqlar" }],
                    [{ text: `"Fikr.log();" Kanali` }],
                    [{ text: `Obunachilar soni` }],

                ],
                resize_keyboard: true,
                // one_time_keyboard: true
            },
            parse_mode: "HTML"
        })
    } catch (error) {
        throw new Error("Error: " + error.message);
    }
})


bot.on("message", async (msg) => {
    try {
        const chatId = msg.chat.id
        if (msg.text === `"Fikr.log();" Kanali`) {
            bot.sendPhoto(chatId, "./img/channel.jpg", {
                contentType: "image/jpeg",
                caption: "Kanalga qo'shilish uchun tugmani bosing va admin qo'shilish so'rovingizni tasdiqlashini kuting!",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "Kanalga o'tish", url: "https://t.me/+bP5TvAf9eStkZThi" }]
                    ]
                }
            })
        }

        if (msg.text === "Ijtimoiy tarmoqlar") {
            bot.sendMessage(chatId, "O'zingizga kerakli ijtimoiy tarmoqni tanlang!", {
                reply_markup: {
                    inline_keyboard: [

                        [{ text: "Telegram", callback_data: "telegram" }],
                        [{ text: "GitHub", callback_data: "github" }],
                        [{ text: "Instagram", callback_data: "instagram" }],
                        [{ text: "Facebook", callback_data: "facebook" }],

                    ]
                }
            })
        }
    } catch (error) {
        throw new Error("Error: " + error.message);

    }
}),


    bot.on("callback_query", async (query) => {
        try {
            if (query.data === "telegram") {
                bot.sendPhoto(query.message.chat.id, "./img/telegramIMAGE.jpg", {
                    contentType: "image/jpeg",
                    caption: "Telegram",
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "Telegram", url: "https://t.me/ix1osbek" }],
                            [{ text: "⬅️ Ortga", callback_data: "back_to_social" }]

                        ]
                    }
                })
            }

            if (query.data === "github") {
                bot.sendPhoto(query.message.chat.id, "./img/githubIMG.png", {
                    contentType: "image/png",
                    caption: "GitHub",
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "GitHub", url: "https://github.com/ix1osbek" }],
                            [{ text: "⬅️ Ortga", callback_data: "back_to_social" }]
                        ]
                    }
                })
            }
            if (query.data === "instagram") {
                bot.answerCallbackQuery(query.id, {
                    text: "Hozirda Instagramda faoliyat olib bormayapman!",
                    show_alert: true
                });
            }


            if (query.data === "facebook") {
                bot.answerCallbackQuery(query.id, {
                    text: "Hozirda Facebookda faoliyat olib bormayapman!",
                    show_alert: true
                });
            }

            if (query.data === "back_to_social") {
                bot.deleteMessage(query.message.chat.id, query.message.message_id)
                bot.sendMessage(query.message.chat.id, "O'zingizga kerakli ijtimoiy tarmoqni tanlang!", {
                    reply_markup: {
                        inline_keyboard: [

                            [{ text: "Telegram", callback_data: "telegram" }],
                            [{ text: "GitHub", callback_data: "github" }],
                            [{ text: "Instagram", callback_data: "instagram" }],
                            [{ text: "Facebook", callback_data: "facebook" }],

                        ]
                    }
                })
            }
        } catch (error) {
            throw new Error("Error: " + error.message);

        }

    })