/**
 * Production Lighthouse CI Server with Custom Dark Mode Theme
 * Automatically syncs project 'Test_SEO_CICD' with token '5bb66e05-ac79-48cc-821e-3386cadf4e1c'.
 */
const { createApp } = require('@lhci/server/src/server.js');
const http = require('http');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../lhci-db.sqlite');
const port = process.env.PORT || 9001;

const BUILD_TOKEN = '5bb66e05-ac79-48cc-821e-3386cadf4e1c';
const ADMIN_TOKEN = '53807583ee4af9454e596001d60aac7a3282be0d08fbb97a399f5c4659074bfe';

// Modern Sleek Dark Mode Theme CSS Injection
const DARK_MODE_CSS = `
<style id="lhci-dark-mode">
  :root {
    color-scheme: dark !important;
  }
  body, html, #root, main, .app, .project-list, .dashboard-container {
    background-color: #0f172a !important;
    color: #f8fafc !important;
  }
  header, nav, .header, .page-header, [class*="header"], [class*="nav"] {
    background-color: #1e293b !important;
    border-bottom: 1px solid #334155 !important;
    color: #f8fafc !important;
  }
  .card, div[class*="card"], div[class*="container"], section, article, .paper {
    background-color: #1e293b !important;
    color: #f8fafc !important;
    border-color: #334155 !important;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3) !important;
  }
  table, tr, td, th, tbody, thead {
    background-color: #1e293b !important;
    color: #f8fafc !important;
    border-color: #334155 !important;
  }
  a, a:visited {
    color: #60a5fa !important;
  }
  a:hover {
    color: #93c5fd !important;
  }
  input, select, textarea, button {
    background-color: #334155 !important;
    color: #f8fafc !important;
    border: 1px solid #475569 !important;
    border-radius: 6px !important;
  }
  svg text {
    fill: #94a3b8 !important;
  }
  svg path, svg line {
    stroke: #475569 !important;
  }
  .lh-root, .lh-vars {
    --bg-color: #0f172a !important;
    --text-color: #f8fafc !important;
  }
</style>
`;

console.log('[LHCI Server] Initializing database server with Dark Mode...');

createApp({
  port: parseInt(port, 10),
  storage: {
    storageMethod: 'sql',
    sqlDialect: 'sqlite',
    sqlDatabasePath: dbPath,
  },
})
  .then(async ({ app, storageMethod }) => {
    // Inject Dark Mode CSS middleware
    app.use((req, res, next) => {
      if (req.accepts('html') && !req.path.startsWith('/v1')) {
        const originalSend = res.send;
        res.send = function (body) {
          if (typeof body === 'string' && body.includes('</head>')) {
            body = body.replace('</head>', `${DARK_MODE_CSS}</head>`);
          }
          return originalSend.call(this, body);
        };
      }
      next();
    });

    const server = http.createServer(app);
    server.listen(port, async () => {
      console.log(`🚀 LHCI Dashboard running on port: ${port} (Dark Mode Active 🌙)`);

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
        console.log(`✅ Synced LHCI project "${project.name}" with token: ${BUILD_TOKEN}`);
      } catch (err) {
        console.error('[LHCI Seed Error]', err.message);
      }
    });
  })
  .catch(err => {
    if (err.code === 'EADDRINUSE') {
      console.log(`ℹ️ Server running on port ${port}`);
    } else {
      console.error('[LHCI Server Error]', err);
    }
  });
