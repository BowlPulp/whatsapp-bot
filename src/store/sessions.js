// src/store/sessions.js
const sessions = {};

function getSession(phone) {
  if (!sessions[phone]) {
    sessions[phone] = {
      step: 'START',
      data: {}
    };
  }
  return sessions[phone];
}

function resetSession(phone) {
  delete sessions[phone];
}

module.exports = { getSession, resetSession };
