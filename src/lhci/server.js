/**
 * Zero-Dependency Lighthouse CI Server (using SQLite with auto-seed)
 * Runs locally or on Render with persistent fixed token registration.
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
  .then(async ({ port, storageMethod }) => {
    console.log(`\n======================================================`);
    console.log(`🚀 Lighthouse CI Dashboard live at: http://localhost:${port}`);
    console.log(`📁 SQLite Database stored at: ${dbPath}`);

    // Auto-seed project with fixed token so token never gets lost on restart
    try {
      const projects = await storageMethod.getProjects();
      let project = projects.find(p => p.name === 'Test_SEO_CICD');
      if (!project) {
        project = await storageMethod.createProject({
          name: 'Test_SEO_CICD',
          externalUrl: 'https://mogi.vn',
          baseBranch: 'main',
          token: 'a1987c4c-257d-4c8c-b622-b8e8224ee8a0',
        });
        console.log(`✅ Auto-seeded LHCI project "Test_SEO_CICD" with fixed token!`);
      } else {
        console.log(`✅ LHCI project "Test_SEO_CICD" ready.`);
      }
    } catch (err) {
      console.warn('[LHCI Seed Warning]', err.message);
    }
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
