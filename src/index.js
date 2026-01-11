// src/index.js
require('dotenv').config();
const express = require('express');

const webhook = require('./routes/webhook');
const { startReminderCron } = require('./services/reminders');

const app = express();

// ✅ REQUIRED FOR TWILIO (form data)
app.use(express.urlencoded({ extended: false }));

// Optional: JSON (for curl testing)
app.use(express.json());

app.use('/webhook', webhook);

app.listen(3000, () => {
  console.log('🚀 Server running on http://localhost:3000');
  startReminderCron();
});
