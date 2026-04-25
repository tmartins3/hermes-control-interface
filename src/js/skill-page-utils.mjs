function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function skillBadge(value) {
  if (!value) return '';
  return `<span class="badge" style="font-size:10px;">${escapeHtml(value)}</span>`;
}

export function renderInstalledSkillsSection(skills = []) {
  const installed = Array.isArray(skills) ? skills : [];
  let html = `
    <div class="card" style="margin-bottom:16px;">
      <div class="card-title">Installed Skills (${installed.length})</div>
      <div style="font-size:12px;color:var(--fg-muted);margin-top:4px;">Skills currently available to Hermes.</div>
    </div>
  `;

  if (installed.length === 0) {
    return html + `
      <div class="card" style="margin-bottom:20px;">
        <div class="card-title">No installed skills found</div>
        <div style="font-size:12px;color:var(--fg-muted);margin-top:4px;">The optional catalog is shown below.</div>
      </div>
    `;
  }

  html += '<div class="card-grid" style="margin-bottom:24px;">';
  for (const s of installed) {
    html += `
      <div class="card">
        <div class="card-title">${escapeHtml(s.name)}</div>
        <div style="font-size:12px;color:var(--fg-muted);margin-top:4px;">${escapeHtml(s.category || 'uncategorized')}</div>
        <div style="margin-top:8px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
          ${skillBadge(s.source)}
          ${skillBadge(s.trust)}
          ${s.enabled === false ? skillBadge('disabled') : skillBadge('enabled')}
        </div>
      </div>
    `;
  }
  html += '</div>';
  return html;
}

export function renderSkillCatalogSection(skills = [], { currentPage = 1, totalPages = 1 } = {}) {
  let html = `
    <div class="card" style="margin-bottom:16px;">
      <div class="card-title">Optional Skills Catalog</div>
      <div style="font-size:12px;color:var(--fg-muted);margin-top:4px;">Browse additional skills that can be installed.</div>
    </div>
  `;

  html += '<div class="card-grid">';
  if (!Array.isArray(skills) || skills.length === 0) {
    html += `<div class="card"><div class="card-title">No optional skills found on page ${escapeHtml(currentPage)}</div></div>`;
  } else {
    for (const s of skills) {
      const isOfficial = s.source === 'official';
      const badgeColor = isOfficial ? 'var(--accent)' : 'var(--fg-muted)';
      html += `
        <div class="card" style="position:relative;">
          <div class="card-title">${escapeHtml(s.name)}</div>
          <div style="font-size:12px;color:var(--fg-muted);margin-top:4px;">${escapeHtml(s.description)}</div>
          <div style="margin-top:8px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
            <span class="badge" style="font-size:10px;background:${badgeColor}22;color:${badgeColor};">${escapeHtml(s.source)}</span>
            ${s.trust ? `<span class="badge" style="font-size:10px;">${escapeHtml(s.trust)}</span>` : ''}
          </div>
          <div style="margin-top:10px;display:flex;gap:6px;">
            <button class="btn btn-ghost btn-sm" onclick="window.inspectSkill('${escapeHtml(s.name)}')">👁️ Preview</button>
            <button class="btn btn-primary btn-sm" onclick="window.installSkill('${escapeHtml(s.name)}')">⬇️ INSTALL</button>
          </div>
        </div>
      `;
    }
  }
  html += '</div>';

  html += '<div style="display:flex;justify-content:center;gap:8px;margin-top:16px;">';
  if (currentPage > 1) {
    html += `<button class="btn btn-ghost" onclick="skillsLoadPage(${currentPage - 1})">← Page ${currentPage - 1}</button>`;
  }
  html += `<span style="color:var(--fg-muted);padding:8px;">Page ${currentPage} / ${totalPages}</span>`;
  if (currentPage < totalPages) {
    html += `<button class="btn btn-ghost" onclick="skillsLoadPage(${currentPage + 1})">Page ${currentPage + 1} →</button>`;
  }
  html += '</div>';
  return html;
}
