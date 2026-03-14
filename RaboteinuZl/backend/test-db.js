require('dotenv').config({ path: __dirname + '/.env' });
const db = require('./database');

(async () => {
  console.log('Testing MSSQL connectivity...');
  console.log('Server:', process.env.DB_SERVER);
  console.log('Database:', process.env.DB_DATABASE);
  console.log('User:', process.env.DB_USERNAME);
  try {
    await db.connect();
    const result = await db.query('SELECT 1 AS ok');
    console.log('Query result:', result.recordset);
    await db.close();
    console.log('Connection test succeeded.');
    process.exit(0);
  } catch (err) {
    console.error('Connection test failed:', err.message || err);
    process.exit(1);
  }
})();
