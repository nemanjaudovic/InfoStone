// Jedinstveni format greske: { error: "poruka", fields?: { polje: "poruka" } }
module.exports = function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Server error' : err.message, ...(err.fields ? { fields: err.fields } : {}) });
};
