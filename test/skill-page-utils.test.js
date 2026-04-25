const test = require('node:test');
const assert = require('node:assert/strict');

async function loadUtils() {
  return import('../src/js/skill-page-utils.mjs');
}

test('renderInstalledSkillsSection shows installed skills before optional browse catalog', async () => {
  const { renderInstalledSkillsSection } = await loadUtils();
  const html = renderInstalledSkillsSection([
    { name: 'hermes-control-interface', category: 'devops', source: 'local', trust: 'local', enabled: true },
    { name: 'imap-mcp-email-management', category: 'email', source: 'local', trust: 'local', enabled: true },
  ]);

  assert.match(html, /Installed Skills \(2\)/);
  assert.match(html, /hermes-control-interface/);
  assert.match(html, /imap-mcp-email-management/);
  assert.doesNotMatch(html, /INSTALL/);
});

test('renderSkillCatalogSection labels optional skills separately from installed skills', async () => {
  const { renderSkillCatalogSection } = await loadUtils();
  const html = renderSkillCatalogSection([
    { name: '1password', description: 'Set up 1Password CLI', source: 'official', trust: '★ official' },
  ], { currentPage: 1, totalPages: 3 });

  assert.match(html, /Optional Skills Catalog/);
  assert.match(html, /1password/);
  assert.match(html, /INSTALL/);
  assert.match(html, /Page 1 \/ 3/);
});
