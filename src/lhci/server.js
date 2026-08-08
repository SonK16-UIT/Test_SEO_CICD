/**
 * Zero-Dependency Lighthouse CI Server (using SQLite with multi-token support)
 * Accepts both TOKEN_1 (5bb66e05-ac79-48cc-821e-3386cadf4e1c) and TOKEN_2 (a1987c4c-257d-4c8c-b622-b8e8224ee8a0).
 */
const { createServer } = require('@lhci/server');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../lhci-db.sqlite');
const port = process.env.PORT || 9001;

const TOKEN_1 = '5bb66e05-ac79-48cc-821e-3386cadf4e1c';
const TOKEN_2 = 'a1987c4c-257d-4c8c-b622-b8e8224ee8a0';
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
      
      // Seed Primary Project for TOKEN_1
      let project1 = projects.find(p => p.name === 'Test_SEO_CICD');
      if (!project1) {
        project1 = await storageMethod.createProject({
          name: 'Test_SEO_CICD',
          externalUrl: 'https://mogi.vn',
          baseBranch: 'main',
        });
      }
      await sequelize.query(
        `UPDATE projects SET token = '${TOKEN_1}', adminToken = '${ADMIN_TOKEN}', baseBranch = 'main' WHERE id = '${project1.id}'`,
        { type: sequelize.QueryTypes.UPDATE }
      );

      // Seed Secondary Project for TOKEN_2
      let project2 = projects.find(p => p.name === 'Test_SEO_CICD_Alt');
      if (!project2) {
        project2 = await storageMethod.createProject({
          name: 'Test_SEO_CICD_Alt',
          externalUrl: 'https://mogi.vn',
          baseBranch: 'main',
        });
      }
      await sequelize.query(
        `UPDATE projects SET token = '${TOKEN_2}', adminToken = '${ADMIN_TOKEN}', baseBranch = 'main' WHERE id = '${project2.id}'`,
        { type: sequelize.QueryTypes.UPDATE }
      );

      console.log(`✅ LHCI Multi-Token Active: [${TOKEN_1}] and [${TOKEN_2}]`);
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
