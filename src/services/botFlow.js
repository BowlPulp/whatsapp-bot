// src/services/botFlow.js
const dayjs = require('dayjs');
const { getSession, resetSession } = require('../store/sessions');
const {
  getFreeSlots,
  createAppointment,
  findUpcomingAppointment,
  cancelAppointment,
  rescheduleAppointment
} = require('./calendar');

async function handleMessage(from, text) {
  const session = getSession(from);

  /* =====================================================
     GLOBAL COMMANDS (work anytime)
     ===================================================== */

  // ❌ Cancel appointment
  if (text === '9') {
    const event = await findUpcomingAppointment();

    if (!event) {
      return '❌ No upcoming appointment found.';
    }

    await cancelAppointment(event.id);
    resetSession(from);

    return '✅ Your appointment has been cancelled.';
  }

  // 🔁 Reschedule appointment
  if (text === '8') {
    const event = await findUpcomingAppointment(from);

    if (!event) {
      return '❌ No upcoming appointment found.';
    }

    session.data.rescheduleEventId = event.id;
    session.step = 'RESCHEDULE_DATE';

    return `📅 Choose new date:
1️⃣ Today
2️⃣ Tomorrow`;
  }

  /* =====================================================
     STATE MACHINE
     ===================================================== */

  switch (session.step) {
    // ---------------- START ----------------
    case 'START':
      session.step = 'MAIN_MENU';
      return `👋 Welcome to Dental Lifeline 🦷

1️⃣ Book Appointment
2️⃣ Clinic Timings
3️⃣ Pricing
4️⃣ Talk to Receptionist

(Reply 9 to cancel / 8 to reschedule anytime)`;

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
        return '❌ No slots available for this date.';
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
      const slot = session.data.slots[parseInt(text) - 1];

      if (!slot) {
        return '❌ Invalid slot. Please choose again.';
      }

      session.data.slot = slot;
      session.step = 'PATIENT_NAME';

      return '🧾 Please enter patient name:';
    }

    // ---------------- PATIENT NAME ----------------
    case 'PATIENT_NAME':
      if (text.length < 2) {
        return '❌ Please enter a valid name';
      }

      session.data.patient = { name: text };
      session.step = 'PATIENT_AGE';

      return '🎂 Patient age? (in years)';
    
    // ---------------- PATIENT AGE ----------------
    case 'PATIENT_AGE': {
      const age = parseInt(text);

      if (isNaN(age) || age < 1 || age > 120) {
        return '❌ Please enter a valid age';
      }

      session.data.patient.age = age;
      session.step = 'PATIENT_TYPE';

      return `Is this your first visit?
1️⃣ First-time patient
2️⃣ Returning patient`;
    }

    // ---------------- PATIENT TYPE ----------------
    case 'PATIENT_TYPE':
      if (!['1', '2'].includes(text)) {
        return '❌ Please choose 1 or 2';
      }

      session.data.patient.isFirstVisit = text === '1';
      session.step = 'CONFIRM';

      const p = session.data.patient;
      const s = session.data.slot;

      return `✅ Please confirm your appointment:

👤 ${p.name}
🎂 ${p.age}
🧾 ${p.isFirstVisit ? 'First-time patient' : 'Returning patient'}

📅 ${session.data.date}
⏰ ${s.start} – ${s.end}

Reply:
1️⃣ Confirm
2️⃣ Cancel`;
    
    // ---------------- CONFIRM ----------------
    case 'CONFIRM':
      if (text === '1') {
        const { date, slot, patient } = session.data;

        await createAppointment({
          date,
          start: slot.start,
          end: slot.end,
          patient: patient.name,
          phone: from,
          visitType: session.data.visitType,
          isFirstVisit: patient.isFirstVisit
        });

        resetSession(from);

        return `🎉 Appointment confirmed!

👤 ${patient.name}
📅 ${date}
⏰ ${slot.start} – ${slot.end}

📍 See you at Dental Lifeline 🦷`;
      }

      if (text === '2') {
        resetSession(from);
        return '❌ Booking cancelled. Say Hi to start again.';
      }

      return '❌ Please reply with 1 or 2';

    /* =====================================================
       RESCHEDULE FLOW
       ===================================================== */

    case 'RESCHEDULE_DATE': {
      if (!['1', '2'].includes(text)) {
        return '❌ Please choose 1 or 2';
      }

      const date =
        text === '1'
          ? dayjs().format('YYYY-MM-DD')
          : dayjs().add(1, 'day').format('YYYY-MM-DD');

      const slots = await getFreeSlots(date);

      if (!slots.length) {
        return '❌ No slots available for this date.';
      }

      session.data.date = date;
      session.data.slots = slots;
      session.step = 'RESCHEDULE_SLOT';

      let reply = `Available slots:\n`;
      slots.slice(0, 5).forEach((s, i) => {
        reply += `${i + 1}️⃣ ${s.start} – ${s.end}\n`;
      });

      return reply;
    }

    case 'RESCHEDULE_SLOT': {
      const slot = session.data.slots[parseInt(text) - 1];

      if (!slot) {
        return '❌ Invalid slot selection.';
      }

      await rescheduleAppointment(
        session.data.rescheduleEventId,
        session.data.date,
        slot.start,
        slot.end
      );

      resetSession(from);

      return `🔁 Appointment rescheduled successfully!

📅 ${session.data.date}
⏰ ${slot.start} – ${slot.end}`;
    }

    // ---------------- FALLBACK ----------------
    default:
      resetSession(from);
      return '❌ Something went wrong. Please say Hi again.';
  }
}

module.exports = { handleMessage };
