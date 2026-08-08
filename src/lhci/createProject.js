/**
 * Automatically create a Lighthouse CI project on local/remote server
 */
async function createProject() {
  const serverBaseUrl = process.env.LHCI_SERVER_BASE_URL || 'http://localhost:9001';
  console.log(`[LHCI Setup] Registering project at ${serverBaseUrl}...`);

  const response = await fetch(`${serverBaseUrl}/v1/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test_SEO_CICD',
      externalUrl: 'https://mogi.vn',
    }),
  });

  const data = await response.json();
  console.log('\n============================================================');
  console.log('🎉 Lighthouse CI Project Created Successfully!');
  console.log('============================================================');
  console.log('Project Name :', data.name);
  console.log('Project ID   :', data.id);
  console.log('🔑 BUILD TOKEN (LHCI_TOKEN) :', data.token);
  console.log('🛡️ ADMIN TOKEN             :', data.adminToken);
  console.log('============================================================\n');
}

createProject().catch(err => {
  console.error('[LHCI Setup Error]', err.message);
});
