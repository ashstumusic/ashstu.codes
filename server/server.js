/**
 * Ash Codes — Lightweight Contact API
 * Node.js / Express + SQLite (better-sqlite3)
 * Replaces Formspree dependency with self-hosted submission storage
 * and basic admin read endpoint.
 *
 * Spin up:
 *   cd server && npm install && node server.js
 *
 * Endpoints:
 *   POST /contact     — receives form submissions
 *   GET  /admin       — returns all submissions (protect in prod)
 */

'use strict';

const express    = require('express');
const cors       = require('cors');
const Database   = require('better-sqlite3');
const nodemailer = require('nodemailer');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3001;
const DB   = new Database(path.join(__dirname, 'submissions.db'));

/* ── DB schema ── */
DB.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    name        TEXT    NOT NULL,
    business    TEXT,
    email       TEXT    NOT NULL,
    interest    TEXT,
    call_type   TEXT,
    message     TEXT,
    ip          TEXT
  )
`);

const insert = DB.prepare(`
  INSERT INTO submissions (name, business, email, interest, call_type, message, ip)
  VALUES (@name, @business, @email, @interest, @call_type, @message, @ip)
`);

/* ── Mailer (optional — set env vars to enable) ── */
const mailer = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

/* ── Middleware ── */
app.use(cors({ origin: process.env.ALLOW_ORIGIN || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/* ── Input sanitizer (strip HTML, trim) ── */
function clean(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim().slice(0, 2000);
}

/* ── POST /contact ── */
app.post('/contact', (req, res) => {
  const { name, business, email, interest, call_type, message, _honeypot } = req.body;

  if (_honeypot) return res.status(200).json({ ok: true }); // silent bot reject

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  const row = {
    name:      clean(name),
    business:  clean(business),
    email:     clean(email).toLowerCase(),
    interest:  clean(interest),
    call_type: clean(call_type),
    message:   clean(message),
    ip:        req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
  };

  insert.run(row);

  if (mailer) {
    mailer.sendMail({
      from:    process.env.SMTP_USER,
      to:      process.env.NOTIFY_EMAIL || 'stubblefieldashton@gmail.com',
      subject: `New inquiry from ${row.name} — ashstu.codes`,
      text:    `Name: ${row.name}\nBusiness: ${row.business}\nEmail: ${row.email}\nInterest: ${row.interest}\nFormat: ${row.call_type}\n\n${row.message}`,
    }).catch(err => console.error('Mail error:', err));
  }

  res.json({ ok: true, message: 'Submission received.' });
});

/* ── GET /admin — basic submissions list ── */
/* TODO: add token auth before exposing publicly */
app.get('/admin', (req, res) => {
  const rows = DB.prepare('SELECT * FROM submissions ORDER BY id DESC LIMIT 100').all();
  res.json(rows);
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
