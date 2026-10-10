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
    process.exit(1);
  });
