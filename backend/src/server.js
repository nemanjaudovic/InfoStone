// Ulazna tacka: konekcija na MongoDB pa start Express-a
const app = require('./app');
const { config } = require('./config/env');
const { connectDb } = require('./config/db');

connectDb()
  .then(() => {
    app.listen(config.port, () => console.log(`InfoStone API na http://localhost:${config.port}`));
  })
  .catch((err) => {
    console.error('MongoDB konekcija nije uspela:', err.message);
    console.error('Proveri da li je MongoDB pokrenut i da li je MONGO_URI u backend/.env ispravan.');
    process.exit(1);
  });
