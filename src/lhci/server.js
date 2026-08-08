/**
 * Zero-Dependency Lighthouse CI Server (using SQLite with fixed token auto-seed)
 * Syncs permanent build tokens and admin token across restarts.
 */
const { createServer } = require('@lhci/server');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../lhci-db.sqlite');
const port = process.env.PORT || 9001;
const TOKEN_1 = '5bb66e05-ac79-48cc-821e-3386cadf4e1c';
const TOKEN_2 = 'a1987c4c-257d-4c8c-b622-b8e8224ee8a0';
const ADMIN_TOKEN = 'BXntTdUd1gMWP8OpmEsy13ASeqWDr1MaeR5xHBga';

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
      const projects = await storageMethod.getProjects();
      let project = projects.find(p => p.name === 'Test_SEO_CICD');
      if (!project) {
        project = await storageMethod.createProject({
          name: 'Test_SEO_CICD',
          externalUrl: 'https://mogi.vn',
          baseBranch: 'main',
        });
      }
      const sequelize = storageMethod._sequelize.sequelize;
      
      // Ensure primary project has TOKEN_1
      await sequelize.query(
        `UPDATE projects SET token = '${TOKEN_1}', adminToken = '${ADMIN_TOKEN}', baseBranch = 'main' WHERE id = '${project.id}'`,
        { type: sequelize.QueryTypes.UPDATE }
      );

      // Create secondary project alias if not exists to accept TOKEN_2 as well
      let project2 = projects.find(p => p.token === TOKEN_2 || p.id === '39294e9f-d303-4593-9dd8-ab74981769a8');
      if (!project2 && project.id !== '39294e9f-d303-4593-9dd8-ab74981769a8') {
        try {
          project2 = await storageMethod.createProject({
            name: 'Test_SEO_CICD_Cloud',
            externalUrl: 'https://mogi.vn',
            baseBranch: 'main',
          });
          await sequelize.query(
            `UPDATE projects SET token = '${TOKEN_2}', adminToken = '${ADMIN_TOKEN}', baseBranch = 'main' WHERE id = '${project2.id}'`,
            { type: sequelize.QueryTypes.UPDATE }
          );
        } catch (e) { /* ignore */ }
      } else if (project2) {
        await sequelize.query(
          `UPDATE projects SET token = '${TOKEN_2}', adminToken = '${ADMIN_TOKEN}', baseBranch = 'main' WHERE id = '${project2.id}'`,
          { type: sequelize.QueryTypes.UPDATE }
        );
      }

      console.log(`✅ LHCI Admin Token synced: ${ADMIN_TOKEN}`);
      console.log(`✅ LHCI Build Token 1 synced: ${TOKEN_1}`);
      console.log(`✅ LHCI Build Token 2 synced: ${TOKEN_2}`);
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
