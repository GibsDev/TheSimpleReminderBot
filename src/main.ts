// @ts-types="npm:@types/luxon"
import {DateTime, Duration, DurationUnit} from "luxon";
import {Telegraf} from "telegraf";
import timestring from "timestring";
import Reminder from "./Reminder.ts";

// Load environment variables from .env file
import "@std/dotenv/load";

// Initialize sequelize
import "./sequelize.ts";

// Get bot access token from environment variables
const BOT_ACCESS_TOKEN = Deno.env.get("BOT_ACCESS_TOKEN");
if (!BOT_ACCESS_TOKEN) throw new Error("BOT_ACCESS_TOKEN is not set");

const bot = new Telegraf(BOT_ACCESS_TOKEN);

async function sendReminder(reminderId: number, catchUp: boolean = false) {
    const reminder = await Reminder.findByPk(reminderId);
    if (!reminder) throw new Error(`Unable to find reminder id`);

    const date = DateTime.fromJSDate(reminder.createdAt);
    const units: DurationUnit[] = ["days", "hours", "minutes"];
    // Allow seconds unit under 5 minute
    if (Math.abs(date.diffNow().minutes) < 5) units.push("seconds");
    const elapsed = date.diffNow(units).negate();

    const cleanedDuration = Duration.fromObject(
        Object.fromEntries(
            Object.entries(elapsed.toObject())
                .map(([unit, value]) => [unit, Math.floor(value)])
                .filter(([_, value]) => value !== 0),
        ),
    );

    await bot.telegram.sendMessage(
        reminder.chatId,
        `Reminder from ${cleanedDuration.toHuman()} ago${catchUp ? ' (missed during outage)' : ''}`,
        {
            reply_parameters: {
                message_id: reminder.messageId,
            },
        },
    );

    await reminder.destroy();
}

async function scheduleReminderMessage(reminderId: number) {
    const reminder = await Reminder.findByPk(reminderId);
    if (!reminder) throw new Error(`Unable to find reminder id`);

    const reminderDate = DateTime.fromJSDate(reminder.date);
    setTimeout(() => {
        sendReminder(reminderId);
    }, reminderDate.diffNow().toMillis());
}

// TODO handle if a message is deleted and remove any associated reminders

// TODO handle if a message is edited and update the reminder?

bot.command(["remindme", "r", "reminder"], async (ctx) => {
    // Ignore messages from bots
    if (ctx.from?.is_bot) return;

    try {
        const chatId = ctx.chat.id;
        const replyToMessage = ctx.message.reply_to_message;

        const messageId: number = replyToMessage
            ? replyToMessage.message_id
            : ctx.message.message_id;
        let durationText: string = ctx.payload;
        if (durationText.startsWith("in ")) {
            durationText = durationText.slice(3);
        }

        // If this is its own unique message, we need to use special parsing for the time
        if (!replyToMessage) {
            const args = ctx.payload.split(" in ");
            durationText = args[1].trim();
        }

        const time = DateTime.now().plus(
            Duration.fromMillis(timestring(durationText) * 1000),
        );

        const reminder = await Reminder.create({
            chatId,
            messageId,
            date: time.toJSDate(),
        });

        await scheduleReminderMessage(reminder.id);

        await ctx.react("🫡");
    } catch (e) {
        console.error(e);
        await ctx.react("🤨");
    }
});

bot.launch();

async function setupReminders() {
    const now = Date.now().valueOf();

    const reminders = await Reminder.findAll();

    const past = new Array<Reminder>();
    const future = new Array<Reminder>();

    for (const reminder of reminders) {
        if (reminder.date.valueOf() <= now) {
            past.push(reminder);
        } else {
            future.push(reminder);
        }
    }

    // Send all reminders that are past due
    await Promise.all(past.map((reminder) => sendReminder(reminder.id, true)));

    // Schedule future reminders
    await Promise.all(
        future.map((reminder) => scheduleReminderMessage(reminder.id)),
    );
}

await setupReminders();

// Enable graceful stop
// Deno.addSignalListener("SIGINT", () => bot.stop("SIGINT"));
// Deno.addSignalListener("SIGTERM", () => bot.stop("SIGTERM"));
