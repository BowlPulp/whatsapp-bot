// src/services/botFlow.js
const dayjs = require('dayjs');
const { getSession, resetSession } = require('../store/sessions');
const { getFreeSlots, createAppointment } = require('./calendar');

async function handleMessage(from, text) {
  const session = getSession(from);

  switch (session.step) {
    // ---------------- START ----------------
    case 'START':
      session.step = 'MAIN_MENU';
      return `👋 Welcome to SmileCare Dental 🦷

1️⃣ Book Appointment
2️⃣ Clinic Timings
3️⃣ Pricing
4️⃣ Talk to Receptionist`;

    // ---------------- MAIN MENU ----------------
    case 'MAIN_MENU':
      if (text === '1') {
        session.step = 'VISIT_TYPE';
        return `What is the purpose of visit?
1️⃣ Consultation
2️⃣ Cleaning
3️⃣ Tooth Pain
4️⃣ Follow-up`;
      }
      return '❌ Please reply with a valid option (1–4)';

    // ---------------- VISIT TYPE ----------------
    case 'VISIT_TYPE':
      if (!['1', '2', '3', '4'].includes(text)) {
        return '❌ Please choose a valid visit type (1–4)';
      }

      session.data.visitType = text;
      session.step = 'DATE_SELECT';

      return `Choose date:
1️⃣ Today
2️⃣ Tomorrow`;

    // ---------------- DATE SELECT ----------------
    case 'DATE_SELECT': {
      if (!['1', '2'].includes(text)) {
        return '❌ Please choose 1 or 2';
      }

      const date =
        text === '1'
          ? dayjs().format('YYYY-MM-DD')
          : dayjs().add(1, 'day').format('YYYY-MM-DD');

      session.data.date = date;

      const slots = await getFreeSlots(date);

      if (!slots.length) {
        return '❌ No slots available for this date. Please choose another day.';
      }

      session.data.slots = slots;
      session.step = 'SLOT_SELECT';

      let reply = `Available slots:\n`;
      slots.slice(0, 5).forEach((s, i) => {
        reply += `${i + 1}️⃣ ${s.start} – ${s.end}\n`;
      });

      return reply;
    }

    // ---------------- SLOT SELECT ----------------
    case 'SLOT_SELECT': {
      const index = parseInt(text) - 1;
      const slot = session.data.slots[index];

      if (!slot) {
        return '❌ Invalid slot. Please choose again.';
      }

      session.data.slot = slot;
      session.step = 'CONFIRM';

      return `✅ Please confirm your appointment:

📅 Date: ${session.data.date}
⏰ Time: ${slot.start} – ${slot.end}

Reply:
1️⃣ Confirm
2️⃣ Cancel`;
    }

    // ---------------- CONFIRM ----------------
    case 'CONFIRM':
      if (text === '1') {
        const { date, slot } = session.data;

        // 🔥 CREATE GOOGLE CALENDAR EVENT
        await createAppointment({
          date,
          start: slot.start,
          end: slot.end,
          patient: from
        });

        resetSession(from);

        return `🎉 Appointment confirmed!

📅 ${date}
⏰ ${slot.start} – ${slot.end}

📍 See you at SmileCare Dental 🦷`;
      }

      if (text === '2') {
        resetSession(from);
        return '❌ Booking cancelled. Say Hi to start again.';
      }

      return '❌ Please reply with 1 to confirm or 2 to cancel';

    // ---------------- FALLBACK ----------------
    default:
      resetSession(from);
      return '❌ Something went wrong. Please say Hi again.';
  }
}

module.exports = { handleMessage };
