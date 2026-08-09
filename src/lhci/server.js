/**
 * Production Lighthouse CI Server with Custom Dark Mode Theme
 * - Uses PostgreSQL on Render (DATABASE_URL env var)
 * - Falls back to SQLite for local development
 * - Seeds Test_SEO_CICD (commit tracking) and Test_SEO_Manual (manual runs)
 */
const { createApp } = require('@lhci/server/src/server.js');
const http = require('http');
const path = require('path');

const port = process.env.PORT || 9001;
const DATABASE_URL = process.env.DATABASE_URL;

// Read project build tokens strictly from environment variables (Zero hardcoded secrets)
const LHCI_CICD_TOKEN   = process.env.LHCI_CICD_TOKEN;
const LHCI_MANUAL_TOKEN = process.env.LHCI_MANUAL_TOKEN;

// Storage config — PostgreSQL in prod, SQLite locally
const storageConfig = DATABASE_URL
  ? {
      storageMethod: 'sql',
      sqlDialect: 'postgres',
      sqlConnectionUrl: DATABASE_URL,
      sqlDialectOptions: {
        ssl: { rejectUnauthorized: false }, // Required for Render PostgreSQL
        searchPath: 'lhci_schema',
      },
    }
  : {
      storageMethod: 'sql',
      sqlDialect: 'sqlite',
      sqlDatabasePath: path.resolve(__dirname, '../../lhci-db.sqlite'),
    };

console.log(`[LHCI Server] Storage: ${DATABASE_URL ? 'PostgreSQL (Render)' : 'SQLite (local)'}`);

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

// Seed a single project (only creates if missing, updates token only if explicitly passed via env)
async function seedProject(storageMethod, { name, slug, token }) {
  const projects = await storageMethod.getProjects();
  let project = projects.find(p => p.name === name);
  if (!project) {
    project = await storageMethod.createProject({
      name,
      slug,
      externalUrl: 'https://mogi.vn',
      baseBranch: 'main',
    });
    console.log(`✅ Created project "${name}"`);
  } else {
    console.log(`ℹ️  Project "${name}" already exists`);
  }

  // Update build token if explicitly configured in environment variables
  if (token) {
    const sequelize = storageMethod._sequelize.sequelize;
    await sequelize.query(
      `UPDATE projects SET token = :token WHERE id = :id`,
      {
        replacements: { token: token.trim(), id: project.id },
        type: sequelize.QueryTypes.UPDATE,
      }
    );
    console.log(`🔑 Build token synced for "${name}": [SECURELY_SET]`);
  }
}

createApp({
  port: parseInt(port, 10),
  storage: storageConfig,
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
        // Seed Tab 1 — Commit tracking project
        await seedProject(storageMethod, {
          name:  'Test_SEO_CICD',
          slug:  'test-seo-cicd',
          token: LHCI_CICD_TOKEN,
        });

        // Seed Tab 2 — Manual run project
        await seedProject(storageMethod, {
          name:  'Test_SEO_Manual',
          slug:  'test-seo-manual',
          token: LHCI_MANUAL_TOKEN,
        });

        console.log('🎉 Project initialization complete.');
      } catch (err) {
        console.error('[LHCI Seed Error]', err.message);
      }
    });
  })
  .catch(err => {
    if (err.code === 'EADDRINUSE') {
      console.log(`ℹ️ Server already running on port ${port}`);
    } else {
      console.error('[LHCI Server Error]', err);
      process.exit(1);
    }
  });
