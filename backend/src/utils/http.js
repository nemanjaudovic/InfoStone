// Pomocne funkcije za HTTP odgovore

// Stub handler za rute koje jos nisu implementirane
const notImplemented = (name) => (req, res) =>
  res.status(501).json({ error: 'Not implemented', route: name });

// Omotac za async handlere da greske idu u errorHandler
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = { notImplemented, asyncHandler, HttpError };
