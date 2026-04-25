const test = require('node:test');
const assert = require('node:assert/strict');

async function loadUtils() {
  return import('../src/js/skill-table-utils.mjs');
}

test('parseSkillBrowseTable parses current Hermes skills browse output with numbered rows and wrapped descriptions', async () => {
  const { parseSkillBrowseTable } = await loadUtils();
  const raw = `Skills Hub — Browse — all sources  (59 skills loaded, page 1/3)
┏━━━━━━┳━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━┳━━━━━━━━━━━━┓
┃    # ┃ Name                ┃ Description         ┃ Source       ┃ Trust      ┃
┡━━━━━━╇━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━╇━━━━━━━━━━━━┩
│    1 │ 1password           │ Set up and use      │ official     │ ★ official │
│      │                     │ 1Password CLI (op). │              │            │
│    2 │ adversarial-ux-test │ Roleplay the most   │ official     │ ★ official │
│      │                     │ difficult user      │              │            │
└──────┴─────────────────────┴─────────────────────┴──────────────┴────────────┘`;

  assert.deepEqual(parseSkillBrowseTable(raw), [
    {
      num: '1',
      name: '1password',
      description: 'Set up and use 1Password CLI (op).',
      source: 'official',
      trust: '★ official',
    },
    {
      num: '2',
      name: 'adversarial-ux-test',
      description: 'Roleplay the most difficult user',
      source: 'official',
      trust: '★ official',
    },
  ]);
});

test('parseSkillTable parses installed skills list with four columns', async () => {
  const { parseSkillTable } = await loadUtils();
  const raw = `Installed Skills
┏━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━┳━━━━━━━━━┳━━━━━━━━━━━┓
┃ Name                 ┃ Category     ┃ Source  ┃ Trust     ┃
┡━━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━╇━━━━━━━━━╇━━━━━━━━━━━┩
│ hermes-control-interface │ devops   │ local   │ local     │
└──────────────────────┴──────────────┴─────────┴───────────┘`;

  assert.deepEqual(parseSkillTable(raw), [
    {
      name: 'hermes-control-interface',
      description: 'devops',
      source: 'local',
      trust: 'local',
      identifier: '',
    },
  ]);
});
