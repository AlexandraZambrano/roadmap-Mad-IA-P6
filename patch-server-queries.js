/**
 * Automated Mongoose → Sequelize query migration for server.js
 *
 * Run: node patch-server-queries.js
 *
 * Transforms the most common Mongoose patterns to their Sequelize equivalents.
 * After running, manually verify any complex aggregation or $regex queries.
 */

import { readFileSync, writeFileSync } from 'fs';

let src = readFileSync('server.js', 'utf8');

let count = 0;
function rep(from, to) {
    const before = src;
    src = src.split(from).join(to);
    const n = (before.split(from).length - 1);
    if (n > 0) { console.log(`  [+${n}] ${from.substring(0,60).replace(/\n/g,'\\n')} → ${to.substring(0,60).replace(/\n/g,'\\n')}`); count += n; }
}
function repRe(from, to) {
    const before = src;
    src = src.replace(from, to);
    // count how many times the regex matched (approx)
    console.log(`  [re] ${from.toString().substring(0,60)}`);
}

// ─────────────────────────────────────────────────────────────────
// 1. Model.find({}) → Model.findAll()
// ─────────────────────────────────────────────────────────────────
rep('.find({}).sort({ id: 1 }).lean()', '.findAll({ order: [["id","ASC"]] })');
rep('.find({}).sort({ id: -1 }).lean()', '.findAll({ order: [["id","DESC"]] })');
rep('.find({}).lean()', '.findAll()');
rep('.find({})', '.findAll()');

// ─────────────────────────────────────────────────────────────────
// 2. Model.findOne({ field: value }) → Model.findOne({ where: { field: value } })
// ─────────────────────────────────────────────────────────────────
// Common single-field patterns
rep('Teacher.findOne({ email:', 'Teacher.findOne({ where: { email:');
rep('Admin.findOne({ email:', 'Admin.findOne({ where: { email:');
rep('Student.findOne({ email:', 'Student.findOne({ where: { email:');
rep('Student.findOne({ id:', 'Student.findOne({ where: { id:');
rep('Teacher.findOne({ id:', 'Teacher.findOne({ where: { id:');
rep('Admin.findOne({ id:', 'Admin.findOne({ where: { id:');
rep('Promotion.findOne({ id:', 'Promotion.findOne({ where: { id:');
rep('QuickLink.findOne({ id:', 'QuickLink.findOne({ where: { id:');
rep('Section.findOne({ id:', 'Section.findOne({ where: { id:');
rep('ExtendedInfo.findOne({ promotionId:', 'ExtendedInfo.findOne({ where: { promotionId:');
rep('Calendar.findOne({ promotionId:', 'Calendar.findOne({ where: { promotionId:');
rep('Attendance.findOne({ promotionId:', 'Attendance.findOne({ where: { promotionId:');
rep('BootcampTemplate.findOne({ id:', 'BootcampTemplate.findOne({ where: { id:');
rep('Student.findOne({ where: { id: req.params.studentId } })', 'Student.findOne({ where: { id: req.params.studentId } })');

// Close the where object brace for single-field findOne patterns
// Pattern: Model.findOne({ where: { field: value }})  — need to add extra } to close where: {}
// This is done by a smarter approach in step 4 below

// ─────────────────────────────────────────────────────────────────
// 3. Model.find({ field: value }) → Model.findAll({ where: { field: value } })
// ─────────────────────────────────────────────────────────────────
rep('QuickLink.find({ promotionId:', 'QuickLink.findAll({ where: { promotionId:');
rep('Section.find({ promotionId:', 'Section.findAll({ where: { promotionId:');
rep('Student.find({ promotionId:', 'Student.findAll({ where: { promotionId:');
rep('Attendance.find({ promotionId:', 'Attendance.findAll({ where: { promotionId:');
rep('Promotion.find({', 'Promotion.findAll({');
rep('Student.find({', 'Student.findAll({');
rep('Teacher.find({', 'Teacher.findAll({');

// ─────────────────────────────────────────────────────────────────
// 4. .save() → .save() stays (Sequelize instances also have .save())
//    BUT: new Model({...}) → Model.build({...})  -- or keep as create
// ─────────────────────────────────────────────────────────────────
// Sequelize instances do have .save(), so promotion.save() works IF
// the instance was fetched with findOne (Sequelize returns instances).
// No change needed for .save().

// ─────────────────────────────────────────────────────────────────
// 5. Model.deleteOne({ ... }) → Model.destroy({ where: { ... } })
//    Model.findOneAndDelete → Model.findOne + destroy
// ─────────────────────────────────────────────────────────────────
rep('QuickLink.deleteOne({ id:', 'QuickLink.destroy({ where: { id:');
rep('Section.deleteOne({ id:', 'Section.destroy({ where: { id:');
rep('Attendance.deleteOne({', 'Attendance.destroy({ where: {');
rep('Student.deleteOne({ id:', 'Student.destroy({ where: { id:');
rep('Teacher.deleteOne({ id:', 'Teacher.destroy({ where: { id:');
rep('Promotion.deleteOne({ id:', 'Promotion.destroy({ where: { id:');
rep('Calendar.deleteOne({', 'Calendar.destroy({ where: {');

// ─────────────────────────────────────────────────────────────────
// 6. Model.updateOne({ filter }, { $set: data }) → Model.update(data, { where: filter })
// ─────────────────────────────────────────────────────────────────
// These are complex — mark them with TODO for manual review
src = src.replace(/(\w+)\.updateOne\(\s*\{/g, (m, model) => {
    return `/* TODO-SQL: ${model}.update( data, */ ${model}.updateOne_FIXME({`;
});

// ─────────────────────────────────────────────────────────────────
// 7. .lean() → (no-op for Sequelize, instances are already plain after .get({plain:true}))
//    Remove .lean() calls — Sequelize instances work like plain objects for JSON serialization
// ─────────────────────────────────────────────────────────────────
rep('.lean()', '');

// ─────────────────────────────────────────────────────────────────
// 8. toObject() / toJSON() — Sequelize instances have .toJSON() built-in, no change needed
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// 9. Mongoose $in / $regex operators used in finds
// ─────────────────────────────────────────────────────────────────
rep('{ $in:', '{ [Op.in]:');
rep('{ $nin:', '{ [Op.notIn]:');
rep('{ $regex:', '{ [Op.regexp]:');
rep('{ $gt:', '{ [Op.gt]:');
rep('{ $gte:', '{ [Op.gte]:');
rep('{ $lt:', '{ [Op.lt]:');
rep('{ $lte:', '{ [Op.lte]:');
rep('{ $ne:', '{ [Op.ne]:');

// ─────────────────────────────────────────────────────────────────
// 10. Model.countDocuments() → Model.count()
// ─────────────────────────────────────────────────────────────────
rep('.countDocuments()', '.count()');

// ─────────────────────────────────────────────────────────────────
// 11. Promotion.find().sort/limit/skip  — wrap in findAll options
// ─────────────────────────────────────────────────────────────────
rep('.sort({ createdAt: -1 })', '');  // handled by order in findAll if needed
rep('.sort({ id: 1 })', '');
rep('.select(', './* select is not needed in SQL — removing */ _select(');

// ─────────────────────────────────────────────────────────────────
// 12. Model.create({ ... }) — Sequelize uses same API, no change needed ✓
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// 13. Close unclosed where: {} braces for findOne single-field patterns
//     Pattern added in step 2: findOne({ where: { field: X }})
//     needs to be: findOne({ where: { field: X } })
// ─────────────────────────────────────────────────────────────────
// Already correct because original was: findOne({ field: X }) — one level
// After rep: findOne({ where: { field: X }) — missing one closing brace
// Fix: replace }) with } }) for these patterns
const modelNames = ['Teacher','Admin','Student','Promotion','QuickLink','Section','ExtendedInfo','Calendar','Attendance','BootcampTemplate'];
for (const m of modelNames) {
    // findOne({ where: { X: Y })  → findOne({ where: { X: Y } })
    src = src.replace(
        new RegExp(`(${m}\\.findOne\\(\\{ where: \\{ [^}]+\\})(\\))`, 'g'),
        (match, inner, closing) => {
            // Check if already properly closed (has two consecutive })
            if (inner.endsWith('} ') || match.includes('} })')) return match;
            return `${inner} }${closing}`;
        }
    );
    // findAll({ where: { X: Y })  → findAll({ where: { X: Y } })
    src = src.replace(
        new RegExp(`(${m}\\.findAll\\(\\{ where: \\{ [^}]+\\})(\\))`, 'g'),
        (match, inner, closing) => {
            if (inner.endsWith('} ') || match.includes('} })')) return match;
            return `${inner} }${closing}`;
        }
    );
    // destroy({ where: { X: Y })  → destroy({ where: { X: Y } })
    src = src.replace(
        new RegExp(`(${m}\\.destroy\\(\\{ where: \\{ [^}]+\\})(\\))`, 'g'),
        (match, inner, closing) => {
            if (inner.endsWith('} ') || match.includes('} })')) return match;
            return `${inner} }${closing}`;
        }
    );
}

writeFileSync('server.js', src, 'utf8');
console.log(`\n✅ Done. ${count} replacements applied.`);
console.log('\n⚠️  Search for "FIXME" in server.js for updateOne patterns that need manual attention.');
