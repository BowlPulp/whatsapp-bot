// src/routes/webhook.js
const express = require('express');
const { handleMessage } = require('../services/botFlow');
const { getFreeSlots } = require('../services/calendar');
const dayjs = require('dayjs');
const router = express.Router();

router.post('/', async (req, res) => {
  const { from, text } = req.body;

  const reply = await handleMessage(from, text);

  return res.json({
    reply
  });
});

module.exports = router;


router.get('/test-calendar', async (req, res) => {
  try {
    const today = dayjs().format('YYYY-MM-DD');
    const slots = await getFreeSlots(today);
    res.json({ slots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
