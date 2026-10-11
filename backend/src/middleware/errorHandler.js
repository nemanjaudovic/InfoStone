// Jedinstveni format greske: { error: "poruka", fields?: { polje: "poruka" } }
// Greske sa postavljenim status-om (HttpError) salju svoju poruku; neocekivane -> "Server error".
module.exports = function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  const message = err.status ? err.message : 'Server error';
  res.status(status).json({ error: message, ...(err.fields ? { fields: err.fields } : {}) });
};
