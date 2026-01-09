const { google } = require('googleapis');
const dayjs = require('dayjs');

const CALENDAR_ID = 'kartikarora5832@gmail.com';

const auth = new google.auth.GoogleAuth({
  keyFile: 'src/credentials/calendar.json',
  scopes: ['https://www.googleapis.com/auth/calendar']
});

const calendar = google.calendar({ version: 'v3', auth });

console.log('Using calendar:', CALENDAR_ID);

/**
 * Fetch free 30-minute slots from Google Calendar
 */
async function getFreeSlots(date) {
  const start = dayjs(date).hour(10).minute(0).second(0);
  const end = dayjs(date).hour(20).minute(0).second(0);

  const fb = await calendar.freebusy.query({
    requestBody: {
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      items: [{ id: CALENDAR_ID }]
    }
  });

  const busy = fb.data.calendars[CALENDAR_ID]?.busy || [];
  const slots = [];

  let current = start.clone();

  while (current.isBefore(end)) {
    const slotEnd = current.add(30, 'minute');

    if (slotEnd.isAfter(end)) break;

    const clash = busy.some(b =>
      current.isBefore(dayjs(b.end)) &&
      slotEnd.isAfter(dayjs(b.start))
    );

    if (!clash) {
      slots.push({
        start: current.format('HH:mm'),
        end: slotEnd.format('HH:mm')
      });
    }

    current = slotEnd;
  }

  return slots;
}

/**
 * Create a confirmed appointment in Google Calendar
 */
async function createAppointment({ date, start, end, patient = 'Patient' }) {
  await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: {
      summary: `Dental Appointment - ${patient}`,
      description: 'Booked via WhatsApp Bot',
      start: {
        dateTime: `${date}T${start}:00`,
        timeZone: 'Asia/Kolkata'
      },
      end: {
        dateTime: `${date}T${end}:00`,
        timeZone: 'Asia/Kolkata'
      }
    }
  });
}

module.exports = {
  getFreeSlots,
  createAppointment
};
