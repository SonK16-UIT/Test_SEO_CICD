/**
 * Zero-Dependency Lighthouse CI Server (using SQLite)
 * Runs locally on Node.js without requiring Docker or PostgreSQL.
 */
const { createServer } = require('@lhci/server');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../lhci-db.sqlite');
const port = process.env.PORT || 9001;

console.log('[LHCI Server] Initializing database and starting server...');

createServer({
  port: parseInt(port, 10),
  storage: {
    storageMethod: 'sql',
    sqlDialect: 'sqlite',
    sqlDatabasePath: dbPath,
  },
}).then(({ port }) => {
  console.log(`\n======================================================`);
  console.log(`🚀 Lighthouse CI Dashboard live at: http://localhost:${port}`);
  console.log(`📁 SQLite Database stored at: ${dbPath}`);
  console.log(`======================================================\n`);
});
