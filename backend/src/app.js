// Express app: ovde se SAMO montiraju routeri.
// PRAVILO: ovaj fajl se menja samo uz dogovor tima (najcesci izvor merge konflikata).
const path = require('path');
const express = require('express');
const cors = require('cors');
const { config } = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));

// --- Embed ---
// Mora pre components routera: on koristi requireAuth za sve svoje rute,
// a embed (/api/components/:id/embed) je javan.
app.use('/api/components', require('./embed/embed.routes'));
app.use('/embed-assets', express.static(path.join(__dirname, 'embed', 'public')));
app.use('/embed-assets/vendor', express.static(path.join(__dirname, '..', 'node_modules', 'chart.js', 'dist')));

// --- API --- redosled prati guide.md §6
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/components', require('./routes/components.routes'));
app.use('/api/css', require('./routes/css.routes'));
app.use('/api', require('./routes/submissions.routes')); // /api/submit/... i /api/submissions/...
app.use('/api/protected', require('./routes/protected.routes'));
app.use('/api/prompt', require('./routes/prompt.routes'));
app.use('/api/files', require('./routes/files.routes'));

// --- AI ideje iz dokumenta "AI ideje za dogadjaje" ---
app.use('/api/cv', require('./routes/cv.routes'));
app.use('/api/tools', require('./routes/tools.routes'));

app.use(errorHandler);

module.exports = app;
