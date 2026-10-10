// Rate limiting za AI rute (guide §3.4: max 10 pretraga/min)
const rateLimit = require('express-rate-limit');

const promptLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => `${req.ip}:${req.params.componentId || ''}`,
  message: { error: 'Previse zahteva, probaj za minut.' },
});

module.exports = { promptLimiter };
