/**
 * Zero-Dependency Lighthouse CI Server (using SQLite)
 * Runs locally on Node.js without requiring Docker or PostgreSQL.
 */
const { createServer } = require('@lhci/server');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../lhci-db.sqlite');
const port = process.env.PORT || 9001;

console.log('[LHCI Server] Initializing database and checking server port...');

createServer({
  port: parseInt(port, 10),
  storage: {
    storageMethod: 'sql',
    sqlDialect: 'sqlite',
    sqlDatabasePath: dbPath,
  },
})
  .then(({ port }) => {
    console.log(`\n======================================================`);
    console.log(`🚀 Lighthouse CI Dashboard live at: http://localhost:${port}`);
    console.log(`📁 SQLite Database stored at: ${dbPath}`);
    console.log(`======================================================\n`);
  })
  .catch(err => {
    if (err.code === 'EADDRINUSE') {
      console.log(`\n======================================================`);
      console.log(`ℹ️ Lighthouse CI Server is ALREADY RUNNING on port ${port}!`);
      console.log(`👉 Open http://localhost:${port} in your browser.`);
      console.log(`======================================================\n`);
    } else {
      console.error('[LHCI Server Error]', err);
    }
  });
