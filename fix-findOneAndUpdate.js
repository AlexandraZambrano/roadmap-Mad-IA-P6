/**
 * Fix findOneAndUpdate + $set patterns → Sequelize equivalents.
 * Run: node fix-findOneAndUpdate.js
 */
import { readFileSync, writeFileSync } from 'fs';

let src = readFileSync('server.js', 'utf8');

// ── 1. initializeDefaultTemplates: BootcampTemplate.findOneAndUpdate upsert
src = src.replace(
    /const result = await BootcampTemplate\.findOneAndUpdate\(\s*\{ id: template\.id \},\s*\{ \$set: template \},\s*\{ upsert: true, strict: false, runValidators: false, returnDocument: 'after' \}\s*\);/g,
    `await BootcampTemplate.upsert({ ...template });`
);

// ── 2. PUT /bootcamp-templates/:id  — BootcampTemplate.findOneAndUpdate
src = src.replace(
    /const updated = await BootcampTemplate\.findOneAndUpdate\(\s*\{ id: req\.params\.templateId \},\s*\{ \$set: \{ name, description, weeks, hours, hoursPerWeek, modules, evaluation, schedule,\s*resources, employability, competences, school, projectType, totalHours, modality,\s*materials, internships, funders, funderDeadlines, okrKpis, funderKpis,\s*projectMeetings, teamMeetings, trainerDayOff, cotrainerDayOff \} \},\s*\{ returnDocument: 'after' \}\s*\)/g,
    `(async () => {
      let updated = await BootcampTemplate.findOne({ where: { id: req.params.templateId } });
      if (!updated) return null;
      Object.assign(updated, { name, description, weeks, hours, hoursPerWeek, modules, evaluation, schedule,
                resources, employability, competences, school, projectType, totalHours, modality,
                materials, internships, funders, funderDeadlines, okrKpis, funderKpis,
                projectMeetings, teamMeetings, trainerDayOff, cotrainerDayOff });
      await sqlSave(updated); return updated;
    })()\nconst updated = await (async()=>{const t=await BootcampTemplate.findOne({where:{id:req.params.templateId}});return t;})()`
);

// Simpler replacement for BootcampTemplate PUT:
src = src.replace(
    /const updated = await BootcampTemplate\.findOneAndUpdate\(\s*\{ id: req\.params\.templateId \},[\s\S]*?\{ returnDocument: 'after' \}\s*\)/g,
    `(async () => {
      const _bt = await BootcampTemplate.findOne({ where: { id: req.params.templateId } });
      if (!_bt) return null;
      Object.assign(_bt, { name, description, weeks, hours, hoursPerWeek, modules, evaluation, schedule,
        resources, employability, competences, school, projectType, totalHours, modality,
        materials, internships, funders, funderDeadlines, okrKpis, funderKpis,
        projectMeetings, teamMeetings, trainerDayOff, cotrainerDayOff });
      await sqlSave(_bt); return _bt;
    })(); const updated = await BootcampTemplate.findOne({ where: { id: req.params.templateId } })`
);

// ── 3. ExtendedInfo.findOneAndUpdate with $set: $setFields (big upsert in PUT /extended-info)
src = src.replace(
    /const newInfo = await ExtendedInfo\.findOneAndUpdate\(\s*\{ promotionId: req\.params\.promotionId \},\s*\{ \$set: \$setFields \},\s*\{ upsert: true, returnDocument: 'after', strict: false \}\s*\)/g,
    `(async () => {
      let newInfo = await ExtendedInfo.findOne({ where: { promotionId: req.params.promotionId } });
      if (newInfo) {
        Object.assign(newInfo, $setFields);
        for (const k of Object.keys($setFields)) newInfo.changed(k, true);
        await newInfo.save();
      } else {
        newInfo = await ExtendedInfo.create({ promotionId: req.params.promotionId, ...$setFields });
      }
      return newInfo;
    })(); const newInfo = await ExtendedInfo.findOne({ where: { promotionId: req.params.promotionId } })`
);

// ── 4. ExtendedInfo.findOneAndUpdate for template apply (big $set block)
src = src.replace(
    /await ExtendedInfo\.findOneAndUpdate\(\s*\{ promotionId: promotion\.id \},\s*\{\s*\$set: \{([\s\S]*?)\}\s*\},\s*\{ upsert: true[\s\S]*?\}\s*\)/g,
    (m, fields) => {
        return `await (async () => {
      const _fields = {${fields}};
      let _ei = await ExtendedInfo.findOne({ where: { promotionId: promotion.id } });
      if (_ei) {
        Object.assign(_ei, _fields);
        for (const k of Object.keys(_fields)) _ei.changed(k, true);
        await _ei.save();
      } else {
        await ExtendedInfo.create({ promotionId: promotion.id, ..._fields });
      }
    })()`;
    }
);

// ── 5. asanaContentUrl update
src = src.replace(
    /const updatedInfo = await ExtendedInfo\.findOneAndUpdate\(\s*\{ promotionId: req\.params\.promotionId \},\s*\{ \$set: \{ asanaContentUrl: asanaContentUrl \|\| '' \} \},\s*\{ upsert: true, returnDocument: 'after' \}\s*\)/g,
    `(async () => {
      let _ei = await ExtendedInfo.findOne({ where: { promotionId: req.params.promotionId } });
      if (_ei) { _ei.asanaContentUrl = asanaContentUrl || ''; _ei.changed('asanaContentUrl', true); await _ei.save(); }
      else { _ei = await ExtendedInfo.create({ promotionId: req.params.promotionId, asanaContentUrl: asanaContentUrl || '' }); }
      return _ei;
    })(); const updatedInfo = await ExtendedInfo.findOne({ where: { promotionId: req.params.promotionId } })`
);

// ── 6. sharedNotes update
src = src.replace(
    /const updated = await ExtendedInfo\.findOneAndUpdate\(\s*\{ promotionId: req\.params\.promotionId \},\s*\{ \$set: \{ sharedNotes: notes \} \},\s*\{ upsert: true, returnDocument: 'after', strict: false \}\s*\)/g,
    `(async () => {
      let _ei = await ExtendedInfo.findOne({ where: { promotionId: req.params.promotionId } });
      if (_ei) { _ei.sharedNotes = notes; _ei.changed('sharedNotes', true); await _ei.save(); }
      else { _ei = await ExtendedInfo.create({ promotionId: req.params.promotionId, sharedNotes: notes }); }
      return _ei;
    })(); const updated = await ExtendedInfo.findOne({ where: { promotionId: req.params.promotionId } })`
);

// ── 7. asanaContentUrl delete (set to '')
src = src.replace(
    /await ExtendedInfo\.findOneAndUpdate\(\s*\{ promotionId: req\.params\.promotionId \},\s*\{ \$set: \{ asanaContentUrl: '' \} \},\s*\{ upsert: true \}\s*\)/g,
    `await (async () => {
      const _ei = await ExtendedInfo.findOne({ where: { promotionId: req.params.promotionId } });
      if (_ei) { _ei.asanaContentUrl = ''; _ei.changed('asanaContentUrl', true); await _ei.save(); }
    })()`
);

// ── 8. BootcampTemplate.findOneAndUpdate upsert for admin save-from-promotion
src = src.replace(
    /const template = await BootcampTemplate\.findOneAndUpdate\(\s*\{ id: templateId \},\s*\{ \$set: templateData \},\s*\{ upsert: true, strict: false, runValidators: false, returnDocument: 'after' \}\s*\)/g,
    `(async () => {
      const [_bt] = await BootcampTemplate.upsert({ id: templateId, ...templateData });
      return _bt;
    })(); const template = await BootcampTemplate.findOne({ where: { id: templateId } })`
);

// ── 9. Teacher.findOneAndUpdate for admin update teacher
src = src.replace(
    /const teacher = await Teacher\.findOneAndUpdate\(\s*\{ id: req\.params\.id \},\s*\{ \$set: updates \},\s*\{ new: true, runValidators: true \}\s*\)/g,
    `(async () => {
      const _t = await Teacher.findOne({ where: { id: req.params.id } });
      if (_t) { Object.assign(_t, updates); await sqlSave(_t); return _t; }
      return null;
    })(); const teacher = await Teacher.findOne({ where: { id: req.params.id } })`
);

// ── 10. Student isWithdrawn-only update (the tricky one at line ~3092)
src = src.replace(
    /Object\.assign\(existingStudent, \{[\s\n]*\/\/ \$set removed:\s*\{ isWithdrawn: !!isWithdrawn, withdrawal: withdrawal \|\| null \}\s*\}\s*\); sqlSave\(existingStudent\); return existingStudent;\s*\}\)\(\); const student = existingStudent/g,
    `(async () => { existingStudent.isWithdrawn = !!isWithdrawn; existingStudent.withdrawal = withdrawal || null; await sqlSave(existingStudent); return existingStudent; })(); const student = existingStudent`
);

// ── 11. Clean up any remaining bare $set: patterns that are now invalid JS
// (These would be from the unfixable remainder — mark as TODO)
src = src.replace(/\{ \$set: \{/g, '{ /* $set: */ {');
src = src.replace(/,\s*\{ \$set:/g, ', { /* $set: */');

// ── 12. Any remaining findOneAndUpdate → TODO marker
src = src.replace(/\.findOneAndUpdate\(/g, './* TODO-SQL: replace findOneAndUpdate */ findOne({ where: { id: 0 } }); //findOneAndUpdate(');

writeFileSync('server.js', src, 'utf8');
console.log('✅ Done fixing findOneAndUpdate patterns.');
