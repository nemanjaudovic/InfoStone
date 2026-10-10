// Centralno citanje .env promenljivih
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const config = {
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/infostone',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000',
  mockAi: process.env.MOCK_AI === 'true',
  uploadDir: path.resolve(__dirname, '..', '..', process.env.UPLOAD_DIR || '../uploads'),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:3000',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:4200').split(','),
};

module.exports = { config };
