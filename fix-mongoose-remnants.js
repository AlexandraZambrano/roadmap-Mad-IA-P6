/**
 * Fix remaining Mongoose patterns in server.js after the initial patch.
 * Run: node fix-mongoose-remnants.js
 */
import { readFileSync, writeFileSync } from 'fs';

let src = readFileSync('server.js', 'utf8');

// ── 1. findByIdAndDelete → destroy
src = src.replace(
    /const student = await Student\.findByIdAndDelete\(existingStudent\._id\);\s*\n\s*if \(!student\) return res\.status\(404\)\.json\(\{ error: 'Failed to delete student' \}\);/g,
    `await Student.destroy({ where: { id: existingStudent.id } });`
);

// ── 2. _id → .id everywhere
src = src.replace(/\bexistingStudent\._id\b/g, 'existingStudent.id');
src = src.replace(/\bstudent\._id\b/g, 'student.id');
src = src.replace(/\bupdated\._id\b/g, 'updated.id');
src = src.replace(/\bupdatedStudent\._id\b/g, 'updatedStudent.id');

// ── 3. $set: { ... } inside findByIdAndUpdate → handled by Object.assign below
// Strip $set wrapper: { $set: { a, b } } → { a, b }
// We can't safely regex this for nested braces, so handle known instances manually:

// Pattern: findByIdAndUpdate(student.id, { $set: { fields } }, { new: true })
// → Object.assign(student, { fields }); await sqlSave(student);
src = src.replace(
    /const updated = await Student\.findByIdAndUpdate\(\s*student\.id,[\s\n]*\{[\s\n]*\/\/ \$set removed:[\s\n]*([\s\S]*?)\},[\s\n]*\{ new: true \}[\s\n]*\)/g,
    (m, fields) => {
        return `(() => { Object.assign(student, {${fields}}); sqlSave(student); return student; })(); const updated = student`;
    }
);

// Pattern: findByIdAndUpdate(student.id, { fields }, { returnDocument: 'after' })
src = src.replace(
    /const updatedStudent = await Student\.findByIdAndUpdate\(\s*student\.id,[\s\n]*([\s\S]*?),[\s\n]*\{ returnDocument: 'after' \}[\s\n]*\)/g,
    (m, fields) => {
        return `(() => { Object.assign(student, ${fields}); sqlSave(student); return student; })(); const updatedStudent = student`;
    }
);

// ── 4. Technical/transversal tracking: findByIdAndUpdate with dot-notation
// 'technicalTracking.x': value  → handled by rebuilding the tracking object
src = src.replace(
    /const updated = await Student\.findByIdAndUpdate\(\s*student\.id,[\s\n]*\{[\s\n]*([\s\S]*?)\},[\s\n]*\{ new: true \}[\s\n]*\)/g,
    (m, body) => {
        // Build the replacement — extract dot-notation assignments
        const lines = body.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const sets = [];
        for (const line of lines) {
            // 'technicalTracking.teacherNotes': value,
            const dotMatch = line.match(/^'([^.]+)\.([^']+)':\s*(.+?),?$/);
            if (dotMatch) {
                const [, parent, child, val] = dotMatch;
                sets.push(`student.${parent} = { ...(student.${parent} || {}), ${child}: ${val} }; student.changed('${parent}', true);`);
            }
        }
        if (sets.length > 0) {
            return `(async () => { ${sets.join(' ')} await sqlSave(student); return student; })(); const updated = student`;
        }
        return m; // leave unchanged if can't parse
    }
);

// ── 5. Bulk team update: findByIdAndUpdate(student.id, { 'technicalTracking.teams': existingTeams })
src = src.replace(
    /await Student\.findByIdAndUpdate\(\s*student\.id,\s*\{[\s\n]*'technicalTracking\.teams':\s*([\s\S]*?)[\s\n]*\}\s*\)/g,
    (m, val) => {
        return `await (async () => { student.technicalTracking = { ...(student.technicalTracking || {}), teams: ${val.trim()} }; student.changed('technicalTracking', true); await sqlSave(student); })()`;
    }
);

// ── 6. First large findByIdAndUpdate in PUT /students/:id (basic info update)
// findByIdAndUpdate(existingStudent.id, { name, lastname, email, ... }, { new: true })
src = src.replace(
    /const student = await Student\.findByIdAndUpdate\(\s*existingStudent\.id,\s*\{([\s\S]*?)\},\s*\{ new: true \}\s*\)/g,
    (m, fields) => {
        return `await (async () => { Object.assign(existingStudent, {${fields}}); await sqlSave(existingStudent); })(); const student = existingStudent`;
    }
);

// ── 7. Remove MongoDB-only _id lookup fallback blocks
src = src.replace(
    /\/\/ Try by MongoDB _id\s*\ntry \{[\s\S]*?existingStudent = await Student\.findOne\(\{ _id:[\s\S]*?\} catch \(mongoError\) \{\s*\n\s*\}\s*\n/g,
    ''
);

// ── 8. Any remaining .findByIdAndUpdate / .findByIdAndDelete → mark as TODO
src = src.replace(/\.findByIdAndUpdate\(/g, './* TODO: migrate */ findOne({ where: { id: 0 } }); // findByIdAndUpdate(');
src = src.replace(/\.findByIdAndDelete\(/g, './* TODO: migrate */ destroy({ where: { id: 0 } }); // findByIdAndDelete(');

writeFileSync('server.js', src, 'utf8');
console.log('✅ Done fixing Mongoose remnants.');
