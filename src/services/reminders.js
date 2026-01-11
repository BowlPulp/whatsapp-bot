const cron = require('node-cron');
const dayjs = require('dayjs');
const { google } = require('googleapis');
const fs = require('fs');

const auth = new google.auth.GoogleAuth({
  keyFile: 'src/credentials/calendar.json',
  scopes: ['https://www.googleapis.com/auth/calendar']
});

const calendar = google.calendar({ version: 'v3', auth });

const CALENDAR_ID = 'kartikarora5832@gmail.com';

// simple in-memory store to avoid duplicate reminders
const sentReminders = {
  '24h': new Set(),
  '2h': new Set()
};

// 🔔 MOCK SEND (replace later with WhatsApp API)
function sendReminder(phone, message) {
  console.log('📨 REMINDER SENT TO:', phone);
  console.log(message);
}

// 🔁 CHECK UPCOMING EVENTS
async function checkReminders() {
  const now = dayjs();
  const maxTime = now.add(26, 'hour').toISOString();

  const events = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: now.toISOString(),
    timeMax: maxTime,
    singleEvents: true,
    orderBy: 'startTime'
  });

  for (const event of events.data.items) {
    if (!event.start?.dateTime) continue;

    const startTime = dayjs(event.start.dateTime);
    const diffMinutes = startTime.diff(now, 'minute');

    const eventId = event.id;
    const phone = event.summary?.split('-')[1]?.trim() || 'UNKNOWN';

    // ⏰ 24 HOURS BEFORE
    if (
      diffMinutes <= 1440 &&
      diffMinutes > 1430 &&
      !sentReminders['24h'].has(eventId)
    ) {
      sendReminder(
        phone,
        `🦷 Reminder from Dental Lifeline

You have an appointment tomorrow at ${startTime.format('hh:mm A')}.
Reply 9 to reschedule.`
      );

      sentReminders['24h'].add(eventId);
    }

    // ⏰ 2 HOURS BEFORE
    if (
      diffMinutes <= 120 &&
      diffMinutes > 110 &&
      !sentReminders['2h'].has(eventId)
    ) {
      sendReminder(
        phone,
        `🦷 Reminder from Dental Lifeline

Your appointment is today at ${startTime.format('hh:mm A')}.
We’ll see you soon 😊`
      );

      sentReminders['2h'].add(eventId);
    }
  }
}

// ⏱️ Run every 10 minutes
function startReminderCron() {
  cron.schedule('*/10 * * * *', () => {
    console.log('⏰ Checking reminders...');
    checkReminders().catch(console.error);
  });
}

module.exports = { startReminderCron };
