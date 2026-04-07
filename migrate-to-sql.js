/**
 * migrate-to-sql.js
 * ------------------------------------------------------------------
 * Migrates all data from MongoDB Atlas (MONGO_URI_CLOUD) to the
 * configured SQL database (SQL_* vars from .env).
 *
 * Usage:
 *   node migrate-to-sql.js              # migrate everything
 *   node migrate-to-sql.js --dry-run    # connect only, no writes
 *   node migrate-to-sql.js --only teachers,admins
 *
 * Safe to re-run — uses upsert so existing rows are updated, not duplicated.
 * ------------------------------------------------------------------
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { Sequelize, DataTypes, Op } from 'sequelize';

// ── CLI flags ────────────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const DRY_RUN    = args.includes('--dry-run');
const ONLY_FLAG  = args.find(a => a.startsWith('--only='));
const ONLY       = ONLY_FLAG ? ONLY_FLAG.replace('--only=', '').split(',').map(s => s.trim()) : null;

const should = (name) => !ONLY || ONLY.includes(name);

// ── Progress helpers ─────────────────────────────────────────────────────────
const pad  = (n, w = 6) => String(n).padStart(w);
const log  = (...a) => console.log('[migrate]', ...a);
const ok   = (name, n) => log(`✅  ${name.padEnd(22)} ${pad(n)} rows upserted`);
const skip = (name)    => log(`⏭️   ${name.padEnd(22)} skipped (--only filter)`);
const warn = (...a)    => console.warn('[migrate][WARN]', ...a);

// ── MongoDB connection ────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI_CLOUD || process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ MONGO_URI_CLOUD is not set in .env');
  process.exit(1);
}

// ── SQL connection ────────────────────────────────────────────────────────────
const {
  SQL_DIALECT   = 'mysql',
  SQL_HOST      = 'localhost',
  SQL_PORT      = '3306',
  SQL_DATABASE,
  SQL_USER,
  SQL_PASSWORD  = '',
  SQL_SSL       = 'false',
} = process.env;

if (!SQL_DATABASE || !SQL_USER) {
  console.error('❌ SQL_DATABASE and SQL_USER must be set in .env');
  process.exit(1);
}

const ssl = SQL_SSL === 'true';

const sequelize = new Sequelize(SQL_DATABASE, SQL_USER, SQL_PASSWORD, {
  dialect:        SQL_DIALECT,
  host:           SQL_HOST,
  port:           parseInt(SQL_PORT, 10),
  dialectOptions: ssl ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  logging:        false,
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
});

// ── Raw Mongoose schemas (read-only, just to query Atlas) ─────────────────────
const anySchema = (extra = {}) => new mongoose.Schema({ ...extra }, { strict: false });

const MTeacher          = mongoose.model('Teacher',          anySchema(), 'teachers');
const MAdmin            = mongoose.model('Admin',            anySchema(), 'admins');
const MPromotion        = mongoose.model('Promotion',        anySchema(), 'promotions');
const MStudent          = mongoose.model('Student',          anySchema(), 'students');
const MQuickLink        = mongoose.model('QuickLink',        anySchema(), 'quicklinks');
const MSection          = mongoose.model('Section',          anySchema(), 'sections');
const MExtendedInfo     = mongoose.model('ExtendedInfo',     anySchema(), 'extendedinfos');
const MAttendance       = mongoose.model('Attendance',       anySchema(), 'attendances');
const MCalendar         = mongoose.model('Calendar',         anySchema(), 'calendars');
const MBootcampTemplate = mongoose.model('BootcampTemplate', anySchema(), 'bootcamptemplates');

// Catalog collections
const MCompetence          = mongoose.model('Competence',          anySchema(), 'competences');
const MIndicator           = mongoose.model('Indicator',           anySchema(), 'indicators');
const MTool                = mongoose.model('Tool',                anySchema(), 'tools');
const MArea                = mongoose.model('Area',                anySchema(), 'areas');
const MLevel               = mongoose.model('Level',               anySchema(), 'levels');
const MResource            = mongoose.model('Resource',            anySchema(), 'resources');
const MReferent            = mongoose.model('Referent',            anySchema(), 'referents');
const MResourceType        = mongoose.model('ResourceType',        anySchema(), 'resourcetypes');
const MCompetenceIndicator = mongoose.model('CompetenceIndicator', anySchema(), 'competenceindicators');
const MCompetenceTool      = mongoose.model('CompetenceTool',      anySchema(), 'competencetools');
const MCompetenceArea      = mongoose.model('CompetenceArea',      anySchema(), 'competenceareas');
const MCompetenceResource  = mongoose.model('CompetenceResource',  anySchema(), 'competenceresources');

// ── SQL table definitions (minimal — match backend/models/sql/*) ──────────────

/** Convert a Mongoose doc to a plain JS object, normalise _id → id */
const plain = (doc) => {
  const o = doc.toObject ? doc.toObject({ virtuals: false }) : { ...doc };
  // Use existing 'id' field first (app-level uuid/string), fall back to _id
  if (!o.id && o._id) o.id = String(o._id);
  delete o._id;
  delete o.__v;
  return o;
};

/** Batch upsert helper: splits into chunks and calls Model.upsert for each row */
async function batchUpsert(SqlModel, rows, upsertKey = 'id', chunkSize = 200) {
  if (DRY_RUN) return rows.length;
  let count = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await Promise.all(chunk.map(row => SqlModel.upsert(row)));
    count += chunk.length;
  }
  return count;
}

// ── Dynamic SQL model definitions ─────────────────────────────────────────────
// We define lightweight versions here so the script has no dependency on
// the full server model files (avoids circular imports).

const TEXT    = DataTypes.TEXT;
const STRING  = DataTypes.STRING;
const BOOL    = DataTypes.BOOLEAN;
const INTEGER = DataTypes.INTEGER;
const DATE    = DataTypes.DATE;
const JSON_T  = DataTypes.JSON;

function defModel(name, tableName, fields) {
  return sequelize.define(name, fields, { tableName, timestamps: false, underscored: false });
}

// Teachers
const STeacher = defModel('Teacher', 'teachers', {
  id:               { type: STRING(64),  primaryKey: true },
  externalId:       { type: STRING(64),  allowNull: true },
  name:             { type: STRING(255), allowNull: false },
  lastName:         { type: STRING(255), allowNull: true },
  email:            { type: STRING(255), allowNull: false },
  password:         { type: TEXT,        allowNull: false },
  location:         { type: STRING(255), allowNull: true },
  provisional:      { type: BOOL,        defaultValue: false },
  userRole:         { type: STRING(64),  defaultValue: 'Formador/a' },
  passwordChangedAt:{ type: DATE,        allowNull: true },
  createdAt:        { type: DATE,        defaultValue: DataTypes.NOW },
});

// Admins
const SAdmin = defModel('Admin', 'admins', {
  id:               { type: STRING(64),  primaryKey: true },
  name:             { type: STRING(255), allowNull: false },
  email:            { type: STRING(255), allowNull: false },
  password:         { type: TEXT,        allowNull: false },
  role:             { type: STRING(64),  defaultValue: 'admin' },
  createdAt:        { type: DATE,        defaultValue: DataTypes.NOW },
});

// Promotions
const SPromotion = defModel('Promotion', 'promotions', {
  id:                       { type: STRING(64),  primaryKey: true },
  name:                     { type: STRING(255), allowNull: false },
  description:              { type: TEXT,        allowNull: true },
  startDate:                { type: DATE,        allowNull: true },
  endDate:                  { type: DATE,        allowNull: true },
  location:                 { type: STRING(255), allowNull: true },
  status:                   { type: STRING(64),  defaultValue: 'active' },
  type:                     { type: STRING(64),  defaultValue: 'bootcamp' },
  language:                 { type: STRING(16),  defaultValue: 'es' },
  accessPassword:           { type: STRING(255), allowNull: true },
  teacherId:                { type: STRING(64),  allowNull: true },
  templateId:               { type: STRING(64),  allowNull: true },
  modules:                  { type: JSON_T,      defaultValue: [] },
  employability:            { type: JSON_T,      defaultValue: {} },
  ownerModules:             { type: JSON_T,      defaultValue: [] },
  collaborators:            { type: JSON_T,      defaultValue: [] },
  collaboratorModules:      { type: JSON_T,      defaultValue: {} },
  passwordChangeHistory:    { type: JSON_T,      defaultValue: [] },
  holidays:                 { type: JSON_T,      defaultValue: [] },
  createdAt:                { type: DATE,        defaultValue: DataTypes.NOW },
});

// Students
const SStudent = defModel('Student', 'students', {
  id:                       { type: STRING(64),  primaryKey: true },
  name:                     { type: STRING(255), allowNull: false },
  lastname:                 { type: STRING(255), defaultValue: '' },
  email:                    { type: STRING(255), allowNull: false },
  phone:                    { type: STRING(64),  defaultValue: '' },
  age:                      { type: INTEGER,     allowNull: true },
  administrativeSituation:  { type: STRING(255), defaultValue: '' },
  nationality:              { type: STRING(128), defaultValue: '' },
  identificationDocument:   { type: STRING(128), defaultValue: '' },
  gender:                   { type: STRING(64),  defaultValue: '' },
  englishLevel:             { type: STRING(64),  defaultValue: '' },
  educationLevel:           { type: STRING(128), defaultValue: '' },
  profession:               { type: STRING(128), defaultValue: '' },
  community:                { type: STRING(128), defaultValue: '' },
  address:                  { type: STRING(255), defaultValue: '' },
  promotionId:              { type: STRING(64),  allowNull: true },
  notes:                    { type: TEXT,        defaultValue: '' },
  isManuallyAdded:          { type: BOOL,        defaultValue: true },
  isWithdrawn:              { type: BOOL,        defaultValue: false },
  progress:                 { type: JSON_T,      defaultValue: {} },
  projectsAssignments:      { type: JSON_T,      defaultValue: [] },
  withdrawal:               { type: JSON_T,      allowNull: true },
  accessLog:                { type: JSON_T,      defaultValue: [] },
  technicalTracking:        { type: JSON_T,      defaultValue: {} },
  transversalTracking:      { type: JSON_T,      defaultValue: {} },
  extendedInfo:             { type: JSON_T,      allowNull: true },
  createdAt:                { type: DATE,        defaultValue: DataTypes.NOW },
});

// QuickLinks
const SQuickLink = defModel('QuickLink', 'quick_links', {
  id:          { type: STRING(64),  primaryKey: true },
  promotionId: { type: STRING(64),  allowNull: false },
  title:       { type: STRING(255), allowNull: false },
  url:         { type: TEXT,        allowNull: false },
  icon:        { type: STRING(64),  defaultValue: 'link' },
  order:       { type: INTEGER,     defaultValue: 0 },
  createdAt:   { type: DATE,        defaultValue: DataTypes.NOW },
});

// Sections
const SSection = defModel('Section', 'sections', {
  id:          { type: STRING(64),  primaryKey: true },
  promotionId: { type: STRING(64),  allowNull: false },
  title:       { type: STRING(255), allowNull: false },
  content:     { type: TEXT,        defaultValue: '' },
  order:       { type: INTEGER,     defaultValue: 0 },
  isVisible:   { type: BOOL,        defaultValue: true },
  createdAt:   { type: DATE,        defaultValue: DataTypes.NOW },
});

// ExtendedInfo
const SExtendedInfo = defModel('ExtendedInfo', 'extended_info', {
  id:                  { type: STRING(64), primaryKey: true },
  promotionId:         { type: STRING(64), allowNull: false },
  schedule:            { type: JSON_T,     defaultValue: {} },
  team:                { type: JSON_T,     defaultValue: [] },
  resources:           { type: JSON_T,     defaultValue: [] },
  pildoras:            { type: JSON_T,     defaultValue: [] },
  modulesPildoras:     { type: JSON_T,     defaultValue: {} },
  competences:         { type: JSON_T,     defaultValue: [] },
  projectCompetences:  { type: JSON_T,     defaultValue: [] },
  projectEvaluations:  { type: JSON_T,     defaultValue: [] },
  virtualClassroom:    { type: JSON_T,     defaultValue: {} },
  sharedNotes:         { type: JSON_T,     defaultValue: [] },
  createdAt:           { type: DATE,       defaultValue: DataTypes.NOW },
});

// Attendance
const SAttendance = defModel('Attendance', 'attendance', {
  id:          { type: STRING(64),  primaryKey: true },
  promotionId: { type: STRING(64),  allowNull: false },
  studentId:   { type: STRING(64),  allowNull: false },
  date:        { type: STRING(16),  allowNull: false },
  status:      { type: STRING(32),  defaultValue: 'present' },
  note:        { type: TEXT,        defaultValue: '' },
  createdAt:   { type: DATE,        defaultValue: DataTypes.NOW },
});

// Calendars
const SCalendar = defModel('Calendar', 'calendars', {
  id:          { type: STRING(64),  primaryKey: true },
  promotionId: { type: STRING(64),  allowNull: false },
  date:        { type: STRING(16),  allowNull: false },
  title:       { type: STRING(255), defaultValue: '' },
  type:        { type: STRING(64),  defaultValue: 'event' },
  description: { type: TEXT,        defaultValue: '' },
  createdAt:   { type: DATE,        defaultValue: DataTypes.NOW },
});

// BootcampTemplates
const SBootcampTemplate = defModel('BootcampTemplate', 'bootcamp_templates', {
  id:              { type: STRING(64),  primaryKey: true },
  name:            { type: STRING(255), allowNull: false },
  description:     { type: TEXT,        defaultValue: '' },
  type:            { type: STRING(64),  defaultValue: 'bootcamp' },
  language:        { type: STRING(16),  defaultValue: 'es' },
  modules:         { type: JSON_T,      defaultValue: [] },
  resources:       { type: JSON_T,      defaultValue: [] },
  employability:   { type: JSON_T,      defaultValue: {} },
  competences:     { type: JSON_T,      defaultValue: [] },
  schedule:        { type: JSON_T,      defaultValue: {} },
  modulesPildoras: { type: JSON_T,      defaultValue: {} },
  isDefault:       { type: BOOL,        defaultValue: false },
  createdAt:       { type: DATE,        defaultValue: DataTypes.NOW },
});

// ── Catalog models ────────────────────────────────────────────────────────────
const catalogDef = (name, table, extra = {}) => defModel(name, table, {
  id:        { type: STRING(64), primaryKey: true },
  name:      { type: STRING(255), allowNull: false },
  createdAt: { type: DATE, defaultValue: DataTypes.NOW },
  ...extra,
});

const SCompetence     = catalogDef('Competence',     'competences',     { description: { type: TEXT, defaultValue: '' }, areaId: { type: STRING(64), allowNull: true }, order: { type: INTEGER, defaultValue: 0 } });
const SIndicator      = catalogDef('Indicator',      'indicators',      { description: { type: TEXT, defaultValue: '' }, competenceId: { type: STRING(64), allowNull: true }, levelId: { type: STRING(64), allowNull: true }, order: { type: INTEGER, defaultValue: 0 } });
const STool           = catalogDef('Tool',           'tools',           { description: { type: TEXT, defaultValue: '' }, category: { type: STRING(128), defaultValue: '' } });
const SArea           = catalogDef('Area',           'areas',           { description: { type: TEXT, defaultValue: '' }, color: { type: STRING(32), defaultValue: '' }, icon: { type: STRING(64), defaultValue: '' } });
const SLevel          = catalogDef('Level',          'levels',          { description: { type: TEXT, defaultValue: '' }, value: { type: INTEGER, defaultValue: 0 }, color: { type: STRING(32), defaultValue: '' } });
const SResource       = catalogDef('Resource',       'resources',       { url: { type: TEXT, defaultValue: '' }, type: { type: STRING(64), defaultValue: '' }, resourceTypeId: { type: STRING(64), allowNull: true } });
const SReferent       = catalogDef('Referent',       'referents',       { role: { type: STRING(128), defaultValue: '' }, linkedin: { type: TEXT, defaultValue: '' }, bio: { type: TEXT, defaultValue: '' } });
const SResourceType   = catalogDef('ResourceType',   'resource_types',  { description: { type: TEXT, defaultValue: '' }, icon: { type: STRING(64), defaultValue: '' } });

const SCompetenceIndicator = defModel('CompetenceIndicator', 'competence_indicators', {
  id:            { type: STRING(64), primaryKey: true },
  competenceId:  { type: STRING(64), allowNull: false },
  indicatorId:   { type: STRING(64), allowNull: false },
  order:         { type: INTEGER,    defaultValue: 0 },
  createdAt:     { type: DATE,       defaultValue: DataTypes.NOW },
});
const SCompetenceTool = defModel('CompetenceTool', 'competence_tools', {
  id:            { type: STRING(64), primaryKey: true },
  competenceId:  { type: STRING(64), allowNull: false },
  toolId:        { type: STRING(64), allowNull: false },
  createdAt:     { type: DATE,       defaultValue: DataTypes.NOW },
});
const SCompetenceArea = defModel('CompetenceArea', 'competence_areas', {
  id:            { type: STRING(64), primaryKey: true },
  competenceId:  { type: STRING(64), allowNull: false },
  areaId:        { type: STRING(64), allowNull: false },
  createdAt:     { type: DATE,       defaultValue: DataTypes.NOW },
});
const SCompetenceResource = defModel('CompetenceResource', 'competence_resources', {
  id:            { type: STRING(64), primaryKey: true },
  competenceId:  { type: STRING(64), allowNull: false },
  resourceId:    { type: STRING(64), allowNull: false },
  createdAt:     { type: DATE,       defaultValue: DataTypes.NOW },
});

// ── Helpers to sanitise rows before upsert ────────────────────────────────────

/** Ensure a value is serialisable as JSON (already objects are fine) */
const safeJson = (v) => (v === undefined ? null : v);

const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d) ? null : d;
};

const toStr = (v, def = '') => (v == null ? def : String(v));
const toBool = (v, def = false) => (v == null ? def : Boolean(v));
const toInt = (v, def = null) => (v == null ? def : parseInt(v, 10) || def);

// ── Migration functions ───────────────────────────────────────────────────────

async function migrateTeachers() {
  if (!should('teachers')) { skip('teachers'); return; }
  const docs = await MTeacher.find({}).lean();
  const rows = docs.map(d => ({
    id:                toStr(d.id || d._id),
    externalId:        toStr(d.externalId, null) || null,
    name:              toStr(d.name, 'Unknown'),
    lastName:          toStr(d.lastName, ''),
    email:             toStr(d.email),
    password:          toStr(d.password),
    location:          toStr(d.location, ''),
    provisional:       toBool(d.provisional),
    userRole:          toStr(d.userRole, 'Formador/a'),
    passwordChangedAt: toDate(d.passwordChangedAt),
    createdAt:         toDate(d.createdAt) || new Date(),
  }));
  const n = await batchUpsert(STeacher, rows);
  ok('teachers', n);
}

async function migrateAdmins() {
  if (!should('admins')) { skip('admins'); return; }
  const docs = await MAdmin.find({}).lean();
  const rows = docs.map(d => ({
    id:        toStr(d.id || d._id),
    name:      toStr(d.name, 'Admin'),
    email:     toStr(d.email),
    password:  toStr(d.password),
    role:      toStr(d.role, 'admin'),
    createdAt: toDate(d.createdAt) || new Date(),
  }));
  const n = await batchUpsert(SAdmin, rows);
  ok('admins', n);
}

async function migratePromotions() {
  if (!should('promotions')) { skip('promotions'); return; }
  const docs = await MPromotion.find({}).lean();
  const rows = docs.map(d => ({
    id:                    toStr(d.id || d._id),
    name:                  toStr(d.name, 'Unnamed'),
    description:           toStr(d.description, ''),
    startDate:             toDate(d.startDate),
    endDate:               toDate(d.endDate),
    location:              toStr(d.location, ''),
    status:                toStr(d.status, 'active'),
    type:                  toStr(d.type, 'bootcamp'),
    language:              toStr(d.language, 'es'),
    accessPassword:        toStr(d.accessPassword, null) || null,
    teacherId:             toStr(d.teacherId, null) || null,
    templateId:            toStr(d.templateId, null) || null,
    modules:               safeJson(d.modules),
    employability:         safeJson(d.employability),
    ownerModules:          safeJson(d.ownerModules),
    collaborators:         safeJson(d.collaborators),
    collaboratorModules:   safeJson(d.collaboratorModules),
    passwordChangeHistory: safeJson(d.passwordChangeHistory),
    holidays:              safeJson(d.holidays),
    createdAt:             toDate(d.createdAt) || new Date(),
  }));
  const n = await batchUpsert(SPromotion, rows);
  ok('promotions', n);
}

async function migrateStudents() {
  if (!should('students')) { skip('students'); return; }
  const docs = await MStudent.find({}).lean();
  const rows = docs.map(d => ({
    id:                      toStr(d.id || d._id),
    name:                    toStr(d.name, 'Unknown'),
    lastname:                toStr(d.lastname, ''),
    email:                   toStr(d.email),
    phone:                   toStr(d.phone, ''),
    age:                     toInt(d.age),
    administrativeSituation: toStr(d.administrativeSituation, ''),
    nationality:             toStr(d.nationality, ''),
    identificationDocument:  toStr(d.identificationDocument, ''),
    gender:                  toStr(d.gender, ''),
    englishLevel:            toStr(d.englishLevel, ''),
    educationLevel:          toStr(d.educationLevel, ''),
    profession:              toStr(d.profession, ''),
    community:               toStr(d.community, ''),
    address:                 toStr(d.address, ''),
    promotionId:             toStr(d.promotionId, null) || null,
    notes:                   toStr(d.notes, ''),
    isManuallyAdded:         toBool(d.isManuallyAdded, true),
    isWithdrawn:             toBool(d.isWithdrawn),
    progress:                safeJson(d.progress),
    projectsAssignments:     safeJson(d.projectsAssignments),
    withdrawal:              safeJson(d.withdrawal),
    accessLog:               safeJson(d.accessLog),
    technicalTracking:       safeJson(d.technicalTracking),
    transversalTracking:     safeJson(d.transversalTracking),
    extendedInfo:            safeJson(d.extendedInfo),
    createdAt:               toDate(d.createdAt) || new Date(),
  }));
  const n = await batchUpsert(SStudent, rows);
  ok('students', n);
}

async function migrateQuickLinks() {
  if (!should('quicklinks')) { skip('quicklinks'); return; }
  const docs = await MQuickLink.find({}).lean();
  const rows = docs.map(d => ({
    id:          toStr(d.id || d._id),
    promotionId: toStr(d.promotionId),
    title:       toStr(d.title, ''),
    url:         toStr(d.url, ''),
    icon:        toStr(d.icon, 'link'),
    order:       toInt(d.order, 0),
    createdAt:   toDate(d.createdAt) || new Date(),
  }));
  const n = await batchUpsert(SQuickLink, rows);
  ok('quicklinks', n);
}

async function migrateSections() {
  if (!should('sections')) { skip('sections'); return; }
  const docs = await MSection.find({}).lean();
  const rows = docs.map(d => ({
    id:          toStr(d.id || d._id),
    promotionId: toStr(d.promotionId),
    title:       toStr(d.title, ''),
    content:     toStr(d.content, ''),
    order:       toInt(d.order, 0),
    isVisible:   toBool(d.isVisible, true),
    createdAt:   toDate(d.createdAt) || new Date(),
  }));
  const n = await batchUpsert(SSection, rows);
  ok('sections', n);
}

async function migrateExtendedInfo() {
  if (!should('extendedinfo')) { skip('extendedinfo'); return; }
  const docs = await MExtendedInfo.find({}).lean();
  const rows = docs.map(d => ({
    id:                 toStr(d.id || d._id),
    promotionId:        toStr(d.promotionId),
    schedule:           safeJson(d.schedule),
    team:               safeJson(d.team),
    resources:          safeJson(d.resources),
    pildoras:           safeJson(d.pildoras),
    modulesPildoras:    safeJson(d.modulesPildoras),
    competences:        safeJson(d.competences),
    projectCompetences: safeJson(d.projectCompetences),
    projectEvaluations: safeJson(d.projectEvaluations),
    virtualClassroom:   safeJson(d.virtualClassroom),
    sharedNotes:        safeJson(d.sharedNotes),
    createdAt:          toDate(d.createdAt) || new Date(),
  }));
  const n = await batchUpsert(SExtendedInfo, rows);
  ok('extendedinfo', n);
}

async function migrateAttendance() {
  if (!should('attendance')) { skip('attendance'); return; }
  const docs = await MAttendance.find({}).lean();
  const rows = docs.map(d => ({
    id:          toStr(d.id || d._id),
    promotionId: toStr(d.promotionId),
    studentId:   toStr(d.studentId),
    date:        toStr(d.date, ''),
    status:      toStr(d.status, 'present'),
    note:        toStr(d.note, ''),
    createdAt:   toDate(d.createdAt) || new Date(),
  }));
  const n = await batchUpsert(SAttendance, rows);
  ok('attendance', n);
}

async function migrateCalendars() {
  if (!should('calendars')) { skip('calendars'); return; }
  const docs = await MCalendar.find({}).lean();
  const rows = docs.map(d => ({
    id:          toStr(d.id || d._id),
    promotionId: toStr(d.promotionId),
    date:        toStr(d.date, ''),
    title:       toStr(d.title, ''),
    type:        toStr(d.type, 'event'),
    description: toStr(d.description, ''),
    createdAt:   toDate(d.createdAt) || new Date(),
  }));
  const n = await batchUpsert(SCalendar, rows);
  ok('calendars', n);
}

async function migrateBootcampTemplates() {
  if (!should('templates')) { skip('templates'); return; }
  const docs = await MBootcampTemplate.find({}).lean();
  const rows = docs.map(d => ({
    id:              toStr(d.id || d._id),
    name:            toStr(d.name, 'Template'),
    description:     toStr(d.description, ''),
    type:            toStr(d.type, 'bootcamp'),
    language:        toStr(d.language, 'es'),
    modules:         safeJson(d.modules),
    resources:       safeJson(d.resources),
    employability:   safeJson(d.employability),
    competences:     safeJson(d.competences),
    schedule:        safeJson(d.schedule),
    modulesPildoras: safeJson(d.modulesPildoras),
    isDefault:       toBool(d.isDefault, false),
    createdAt:       toDate(d.createdAt) || new Date(),
  }));
  const n = await batchUpsert(SBootcampTemplate, rows);
  ok('templates', n);
}

async function migrateCatalog() {
  const pairs = [
    ['competences',          MCompetence,          SCompetence,          d => ({ id: toStr(d.id||d._id), name: toStr(d.name,''), description: toStr(d.description,''), areaId: toStr(d.areaId,null)||null, order: toInt(d.order,0), createdAt: toDate(d.createdAt)||new Date() })],
    ['indicators',           MIndicator,            SIndicator,           d => ({ id: toStr(d.id||d._id), name: toStr(d.name,''), description: toStr(d.description,''), competenceId: toStr(d.competenceId,null)||null, levelId: toStr(d.levelId,null)||null, order: toInt(d.order,0), createdAt: toDate(d.createdAt)||new Date() })],
    ['tools',                MTool,                 STool,                d => ({ id: toStr(d.id||d._id), name: toStr(d.name,''), description: toStr(d.description,''), category: toStr(d.category,''), createdAt: toDate(d.createdAt)||new Date() })],
    ['areas',                MArea,                 SArea,                d => ({ id: toStr(d.id||d._id), name: toStr(d.name,''), description: toStr(d.description,''), color: toStr(d.color,''), icon: toStr(d.icon,''), createdAt: toDate(d.createdAt)||new Date() })],
    ['levels',               MLevel,                SLevel,               d => ({ id: toStr(d.id||d._id), name: toStr(d.name,''), description: toStr(d.description,''), value: toInt(d.value,0), color: toStr(d.color,''), createdAt: toDate(d.createdAt)||new Date() })],
    ['resources',            MResource,             SResource,            d => ({ id: toStr(d.id||d._id), name: toStr(d.name,''), url: toStr(d.url,''), type: toStr(d.type,''), resourceTypeId: toStr(d.resourceTypeId,null)||null, createdAt: toDate(d.createdAt)||new Date() })],
    ['referents',            MReferent,             SReferent,            d => ({ id: toStr(d.id||d._id), name: toStr(d.name,''), role: toStr(d.role,''), linkedin: toStr(d.linkedin,''), bio: toStr(d.bio,''), createdAt: toDate(d.createdAt)||new Date() })],
    ['resourcetypes',        MResourceType,         SResourceType,        d => ({ id: toStr(d.id||d._id), name: toStr(d.name,''), description: toStr(d.description,''), icon: toStr(d.icon,''), createdAt: toDate(d.createdAt)||new Date() })],
    ['competenceindicators', MCompetenceIndicator,  SCompetenceIndicator, d => ({ id: toStr(d.id||d._id), competenceId: toStr(d.competenceId,''), indicatorId: toStr(d.indicatorId,''), order: toInt(d.order,0), createdAt: toDate(d.createdAt)||new Date() })],
    ['competencetools',      MCompetenceTool,       SCompetenceTool,      d => ({ id: toStr(d.id||d._id), competenceId: toStr(d.competenceId,''), toolId: toStr(d.toolId,''), createdAt: toDate(d.createdAt)||new Date() })],
    ['competenceareas',      MCompetenceArea,       SCompetenceArea,      d => ({ id: toStr(d.id||d._id), competenceId: toStr(d.competenceId,''), areaId: toStr(d.areaId,''), createdAt: toDate(d.createdAt)||new Date() })],
    ['competenceresources',  MCompetenceResource,   SCompetenceResource,  d => ({ id: toStr(d.id||d._id), competenceId: toStr(d.competenceId,''), resourceId: toStr(d.resourceId,''), createdAt: toDate(d.createdAt)||new Date() })],
  ];

  for (const [label, MongoModel, SqlModel, mapper] of pairs) {
    if (!should(label)) { skip(label); continue; }
    const docs = await MongoModel.find({}).lean();
    const rows = docs.map(mapper);
    const n = await batchUpsert(SqlModel, rows);
    ok(label, n);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  MongoDB → SQL Migration');
  if (DRY_RUN) console.log('  MODE: DRY RUN (no writes)');
  if (ONLY)    console.log('  ONLY:', ONLY.join(', '));
  console.log('══════════════════════════════════════════════\n');

  // 1. Connect to MongoDB
  log('Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  log('MongoDB connected ✓');

  // 2. Connect to SQL
  log('Connecting to SQL…');
  await sequelize.authenticate();
  log('SQL connected ✓');

  // 3. Sync SQL tables (create if not exist, alter if changed)
  log('Syncing SQL tables…');
  if (!DRY_RUN) await sequelize.sync({ alter: { drop: false } });
  log('SQL tables ready ✓\n');

  const start = Date.now();

  // Catalog first (referenced by other models)
  await migrateCatalog();
  // Main entities
  await migrateTeachers();
  await migrateAdmins();
  await migrateBootcampTemplates();
  await migratePromotions();
  await migrateStudents();
  await migrateQuickLinks();
  await migrateSections();
  await migrateExtendedInfo();
  await migrateAttendance();
  await migrateCalendars();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n✅ Migration complete in ${elapsed}s\n`);

  await mongoose.disconnect();
  await sequelize.close();
}

main().catch(err => {
  console.error('\n❌ Migration failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
