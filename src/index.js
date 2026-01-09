// src/index.js
require('dotenv').config();
const express = require('express');

const webhook = require('./routes/webhook');

const app = express();
app.use(express.json());

app.use('/webhook', webhook);

app.listen(3000, () => {
  console.log('🚀 Server running on http://localhost:3000');
});
