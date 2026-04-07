import 'dotenv/config';
import { Sequelize, DataTypes } from 'sequelize';

const sequelize = new Sequelize(process.env.SQL_DATABASE, process.env.SQL_USER, process.env.SQL_PASSWORD, {
  dialect: 'mysql', host: process.env.SQL_HOST, port: parseInt(process.env.SQL_PORT), logging: false
});

const Promotion = sequelize.define('Promotion', {
  id: { type: DataTypes.STRING, primaryKey: true },
  name: DataTypes.STRING,
  startDate: DataTypes.DATE,
  endDate: DataTypes.DATE,
  modules: DataTypes.JSON,
  collaborators: DataTypes.JSON,
}, { tableName: 'promotions', timestamps: false });

const ExtendedInfo = sequelize.define('ExtendedInfo', {
  id: { type: DataTypes.STRING, primaryKey: true },
  promotionId: DataTypes.STRING,
  team: DataTypes.JSON,
  modulesPildoras: DataTypes.JSON,
}, { tableName: 'extended_info', timestamps: false });

await sequelize.authenticate();
console.log('Connected\n');

// List all promotions
const promos = await Promotion.findAll({ attributes: ['id','name','startDate','endDate'] });
console.log('=== PROMOTIONS ===');
for (const p of promos) {
  console.log(`  id=${p.id} name="${p.name}" startDate=${p.startDate} endDate=${p.endDate}`);
}

const PROMO_ID = promos[0]?.id;
if (!PROMO_ID) { console.log('No promotions found'); process.exit(0); }
console.log(`\nInspecting promotion: ${PROMO_ID}`);

const promo = await Promotion.findOne({ where: { id: PROMO_ID } });
console.log('\n=== MODULES ===');
console.log('  type:', typeof promo?.modules, '| isArray:', Array.isArray(promo?.modules));
console.log('  raw:', JSON.stringify(promo?.modules)?.substring(0, 200));

console.log('\n=== COLLABORATORS ===');
console.log('  type:', typeof promo?.collaborators, '| isArray:', Array.isArray(promo?.collaborators));
console.log('  raw:', JSON.stringify(promo?.collaborators)?.substring(0, 200));

const ei = await ExtendedInfo.findOne({ where: { promotionId: PROMO_ID } });
console.log('\n=== EXTENDED_INFO ===');
if (!ei) { console.log('  NOT FOUND for this promotion'); } else {
  console.log('  id:', ei.id);
  console.log('  team type:', typeof ei?.team, '| isArray:', Array.isArray(ei?.team));
  console.log('  team:', JSON.stringify(ei?.team)?.substring(0, 300));
  console.log('  modulesPildoras type:', typeof ei?.modulesPildoras, '| isArray:', Array.isArray(ei?.modulesPildoras));
  console.log('  modulesPildoras:', JSON.stringify(ei?.modulesPildoras)?.substring(0, 200));
}

// Check all extended_info records
const allEi = await ExtendedInfo.findAll({ attributes: ['id','promotionId'] });
console.log('\n=== ALL EXTENDED_INFO RECORDS ===');
allEi.forEach(e => console.log(`  id=${e.id} promotionId=${e.promotionId}`));

await sequelize.close();
