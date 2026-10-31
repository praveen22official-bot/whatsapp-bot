require('dotenv').config({ path: require('path').join(__dirname, '..', 'bot', '.env') });
const path = require('path');

const DB_TYPE = process.env.DB_TYPE || (process.env.DATABASE_URL ? 'pg' : 'sqlite');

module.exports = { DB_TYPE, path };
