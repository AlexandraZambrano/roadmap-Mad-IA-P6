/**
 * fix-data.cjs
 * 1. Fix quicklinks: derive name from URL/platform when name is empty
 * 2. Fix promotions: set weeks = sum of module durations when weeks is null
 */
const mysql = require('mysql2/promise');

const DB = {
  host: '49.13.192.32', port: 3306,
  user: 'admin_evaluation', password: 'S_d3kp731', database: 'admin_evaluation'
};

function nameFromUrl(url, platform) {
  if (platform && platform !== 'custom') {
    const names = {
      github: 'GitHub', discord: 'Discord', zoom: 'Zoom', slack: 'Slack',
      notion: 'Notion', trello: 'Trello', asana: 'Asana', miro: 'Miro',
      figma: 'Figma', drive: 'Google Drive', classroom: 'Google Classroom',
      calendar: 'Google Calendar', meet: 'Google Meet', linkedin: 'LinkedIn',
      youtube: 'YouTube', jira: 'Jira', confluence: 'Confluence'
    };
    if (names[platform]) return names[platform];
  }
  try {
    const u = new URL(url);
    const host = u.hostname.replace('www.', '');
    if (host.includes('github')) return 'GitHub';
    if (host.includes('discord')) return 'Discord';
    if (host.includes('zoom')) return 'Zoom';
    if (host.includes('slack')) return 'Slack';
    if (host.includes('notion')) return 'Notion';
    if (host.includes('trello')) return 'Trello';
    if (host.includes('asana')) return 'Asana';
    if (host.includes('miro')) return 'Miro';
    if (host.includes('figma')) return 'Figma';
    if (host.includes('classroom.google')) return 'Google Classroom';
    if (host.includes('calendar.google')) return 'Google Calendar';
    if (host.includes('meet.google')) return 'Google Meet';
    if (host.includes('drive.google')) return 'Google Drive';
    if (host.includes('docs.google')) return 'Google Docs';
    if (host.includes('linkedin')) return 'LinkedIn';
    if (host.includes('youtube')) return 'YouTube';
    if (host.includes('jira') || host.includes('atlassian')) return 'Jira';
    if (host.includes('confluence')) return 'Confluence';
    // Fallback: use hostname
    return host.split('.')[0].charAt(0).toUpperCase() + host.split('.')[0].slice(1);
  } catch {
    return 'Link';
  }
}

async function main() {
  const c = await mysql.createConnection(DB);
  console.log('Connected to DB');

  // 1. Fix quicklinks names
  const [qlinks] = await c.query('SELECT id, name, url, platform FROM quick_links');
  let qlFixed = 0;
  for (const ql of qlinks) {
    if (!ql.name || ql.name.trim() === '') {
      const newName = nameFromUrl(ql.url, ql.platform);
      await c.query('UPDATE quick_links SET name = ? WHERE id = ?', [newName, ql.id]);
      console.log(`  QuickLink ${ql.id}: "" → "${newName}" (${ql.url.substring(0, 50)})`);
      qlFixed++;
    }
  }
  console.log(`QuickLinks fixed: ${qlFixed}/${qlinks.length}`);

  // 2. Fix promotion weeks from modules
  const [promos] = await c.query('SELECT id, name, weeks, modules FROM promotions');
  let promoFixed = 0;
  for (const p of promos) {
    if (p.weeks !== null && p.weeks !== undefined) {
      console.log(`  Promo "${p.name}": weeks already = ${p.weeks}, skipping`);
      continue;
    }
    let modules = [];
    try { modules = JSON.parse(p.modules || '[]'); } catch { modules = []; }
    if (!Array.isArray(modules) || modules.length === 0) {
      console.log(`  Promo "${p.name}": no modules, setting weeks = 36 (default)`);
      await c.query('UPDATE promotions SET weeks = 36 WHERE id = ?', [p.id]);
      promoFixed++;
      continue;
    }
    const totalWeeks = modules.reduce((sum, m) => sum + (Number(m.duration) || 0), 0);
    const weeks = totalWeeks > 0 ? totalWeeks : 36;
    await c.query('UPDATE promotions SET weeks = ? WHERE id = ?', [weeks, p.id]);
    console.log(`  Promo "${p.name}": weeks = ${weeks} (from ${modules.length} modules)`);
    promoFixed++;
  }
  console.log(`Promotions fixed: ${promoFixed}/${promos.length}`);

  await c.end();
  console.log('Done!');
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
