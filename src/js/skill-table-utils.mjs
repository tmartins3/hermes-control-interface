function splitBoxRow(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed.startsWith('│') && !trimmed.startsWith('┃')) return null;
  const parts = trimmed.split(/[│┃]/).slice(1, -1).map((part) => part.trim());
  return parts.length ? parts : null;
}

function isSeparatorLine(line) {
  return /[┏┓┗┛┡┩└┘┠┨┼┬┴╇╍━─]/.test(line) && !/[│┃]/.test(line);
}

export function parseSkillBrowseTable(output) {
  const skills = [];
  let current = null;

  for (const line of String(output || '').split('\n')) {
    if (isSeparatorLine(line)) continue;
    const cells = splitBoxRow(line);
    if (!cells || cells.length < 5) continue;
    if (cells[0] === '#' || cells[1] === 'Name') continue;

    if (/^\d+$/.test(cells[0]) && cells[1]) {
      current = {
        num: cells[0],
        name: cells[1],
        description: cells[2] || '',
        source: cells[3] || '',
        trust: cells[4] || '',
      };
      skills.push(current);
      continue;
    }

    if (current && !cells[0] && !cells[1] && cells[2]) {
      current.description = `${current.description} ${cells[2]}`.replace(/\s+/g, ' ').trim();
    }
  }

  return skills;
}

export function parseSkillTable(output) {
  const skills = [];

  for (const line of String(output || '').split('\n')) {
    if (isSeparatorLine(line)) continue;
    const cells = splitBoxRow(line);
    if (!cells) continue;

    if (cells.length >= 5 && /^\d+$/.test(cells[0]) && cells[1]) {
      skills.push({
        name: cells[1],
        description: cells[2] || '',
        source: cells[3] || '',
        trust: cells[4] || '',
        identifier: cells[1],
      });
      continue;
    }

    if (cells.length >= 4 && cells[0] && cells[0] !== 'Name' && cells[0] !== '#') {
      skills.push({
        name: cells[0],
        description: cells[1] || '',
        source: cells[2] || '',
        trust: cells[3] || '',
        identifier: cells[4] || '',
      });
    }
  }

  return skills;
}
