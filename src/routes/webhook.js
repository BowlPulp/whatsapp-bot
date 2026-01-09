// src/routes/webhook.js
const express = require('express');
const { handleMessage } = require('../services/botFlow');

const router = express.Router();

router.post('/', async (req, res) => {
  const { from, text } = req.body;

  const reply = await handleMessage(from, text);

  return res.json({
    reply
  });
});

module.exports = router;
