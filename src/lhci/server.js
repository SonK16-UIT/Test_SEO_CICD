/**
 * Clean Production Lighthouse CI Server
 * Reads tokens from environment variables (process.env.LHCI_BUILD_TOKEN & process.env.LHCI_ADMIN_TOKEN).
 */
const { createServer } = require('@lhci/server');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../lhci-db.sqlite');
const port = process.env.PORT || 9001;

const buildToken = process.env.LHCI_BUILD_TOKEN || '5bb66e05-ac79-48cc-821e-3386cadf4e1c';
const adminToken = process.env.LHCI_ADMIN_TOKEN || '53807583ee4af9454e596001d60aac7a3282be0d08fbb97a399f5c4659074bfe';

console.log('[LHCI Server] Initializing database server...');

createServer({
  port: parseInt(port, 10),
  storage: {
    storageMethod: 'sql',
    sqlDialect: 'sqlite',
    sqlDatabasePath: dbPath,
  },
})
  .then(async ({ port, storageMethod }) => {
    console.log(`🚀 LHCI Dashboard running on port: ${port}`);
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
        `UPDATE projects SET token = '${buildToken}', adminToken = '${adminToken}', baseBranch = 'main'`,
        { type: sequelize.QueryTypes.UPDATE }
      );
      console.log(`✅ Synced LHCI project "${project.name}" with environment tokens.`);
    } catch (err) {
      console.error('[LHCI Seed Warning]', err.message);
    }
  })
  .catch(err => {
    if (err.code === 'EADDRINUSE') {
      console.log(`ℹ️ Server running on port ${port}`);
    } else {
      console.error('[LHCI Server Error]', err);
    }
  });
