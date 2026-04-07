const mysql = require('mysql2/promise');
async function main() {
  const c = await mysql.createConnection({
    host:'49.13.192.32', port:3306,
    user:'admin_evaluation', password:'S_d3kp731', database:'admin_evaluation'
  });
  const [ql] = await c.query('SELECT id, promotionId, name, url FROM quick_links LIMIT 20');
  console.log('QLinks:', JSON.stringify(ql, null, 2));
  const [promos] = await c.query('SELECT id, name, weeks FROM promotions');
  console.log('Promos:', JSON.stringify(promos, null, 2));
  await c.end();
}
main().catch(e => console.error('ERR:', e.message));
