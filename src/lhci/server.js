/**
 * Zero-Dependency Lighthouse CI Server (using SQLite with fixed tokens auto-seed)
 * Ensures Admin Token '53807583ee4af9454e596001d60aac7a3282be0d08fbb97a399f5c4659074bfe'
 * and Build Token '5bb66e05-ac79-48cc-821e-3386cadf4e1c' are active across all restarts.
 */
const { createServer } = require('@lhci/server');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../lhci-db.sqlite');
const port = process.env.PORT || 9001;
const BUILD_TOKEN = '5bb66e05-ac79-48cc-821e-3386cadf4e1c';
const ADMIN_TOKEN = '53807583ee4af9454e596001d60aac7a3282be0d08fbb97a399f5c4659074bfe';

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
    console.log(`🚀 Lighthouse CI Dashboard live at port: ${port}`);
    console.log(`📁 SQLite Database stored at: ${dbPath}`);

    try {
      const sequelize = storageMethod._sequelize.sequelize;
      const projects = await storageMethod.getProjects();
      let project = projects.find(p => p.name === 'Test_SEO_CICD');
      if (!project) {
        project = await storageMethod.createProject({
          name: 'Test_SEO_CICD',
          externalUrl: 'https://mogi.vn',
          baseBranch: 'main',
        });
      }
      await sequelize.query(
        `UPDATE projects SET token = '${BUILD_TOKEN}', adminToken = '${ADMIN_TOKEN}', baseBranch = 'main'`,
        { type: sequelize.QueryTypes.UPDATE }
      );
      console.log(`✅ Synced Build Token: ${BUILD_TOKEN}`);
      console.log(`✅ Synced Admin Token: ${ADMIN_TOKEN}`);
    } catch (err) {
      console.error('[LHCI Seed Error]', err);
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
