// src/services/botFlow.js
const { getSession } = require('../store/sessions');

async function handleMessage(from, text) {
  const session = getSession(from);

  switch (session.step) {
    case 'START':
      session.step = 'MAIN_MENU';
      return `👋 Welcome to SmileCare Dental 🦷

1️⃣ Book Appointment
2️⃣ Clinic Timings
3️⃣ Pricing
4️⃣ Talk to Receptionist`;

    case 'MAIN_MENU':
      if (text === '1') {
        session.step = 'VISIT_TYPE';
        return `What is the purpose of visit?
1️⃣ Consultation
2️⃣ Cleaning
3️⃣ Tooth Pain
4️⃣ Follow-up`;
      }
      return 'Please reply with 1–4';

    case 'VISIT_TYPE':
      session.data.visitType = text;
      session.step = 'DATE_SELECT';
      return `Choose date:
1️⃣ Today
2️⃣ Tomorrow`;

    case 'DATE_SELECT':
      session.data.date = text === '1' ? 'today' : 'tomorrow';
      session.step = 'DONE';
      return `✅ Got it!
Next step: calendar slot checking (coming next)`;

    default:
      return 'Something went wrong. Please say Hi again.';
  }
}

module.exports = { handleMessage };
