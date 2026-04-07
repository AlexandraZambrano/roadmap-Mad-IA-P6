/**
 * Final Mongoose → Sequelize cleanup pass for server.js
 * Fixes all TODO-SQL findOneAndUpdate blocks, deleteMany, and findAll without where.
 *
 * Run: node fix-server-final.js
 */
import { readFileSync, writeFileSync } from 'fs';

let src = readFileSync('server.js', 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function rep(from, to, desc) {
    const before = src;
    src = src.split(from).join(to);
    const n = before.split(from).length - 1;
    if (n > 0) console.log(`  [+${n}] ${desc || from.substring(0, 60)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PUT /api/profile — update profile fields
//    Was: Teacher.findOneAndUpdate({ id }, { name, lastName, location }, { returnDocument: 'after' })
//    Fix: findOne + assign fields + sqlSave
// ─────────────────────────────────────────────────────────────────────────────
src = src.replace(
    /user = await Teacher\.\/\* TODO-SQL: replace findOneAndUpdate \*\/ findOne\(\{ where: \{ id: 0 \} \}\); \/\/findOneAndUpdate\(\s*\{ id: req\.user\.id \},\s*\{\s*name: name \|\| undefined,\s*lastName: lastName \|\| undefined,\s*location: location \|\| undefined\s*\},\s*\{ returnDocument: 'after' \}\s*\);/,
    `user = await Teacher.findOne({ where: { id: req.user.id } });
      if (user) {
        if (name !== undefined) user.name = name;
        if (lastName !== undefined) user.lastName = lastName;
        if (location !== undefined) user.location = location;
        await sqlSave(user);
      }`
);
src = src.replace(
    /user = await Admin\.\/\* TODO-SQL: replace findOneAndUpdate \*\/ findOne\(\{ where: \{ id: 0 \} \}\); \/\/findOneAndUpdate\(\s*\{ id: req\.user\.id \},\s*\{\s*name: name \|\| undefined,\s*lastName: lastName \|\| undefined,\s*location: location \|\| undefined\s*\},\s*\{ returnDocument: 'after' \}\s*\);/,
    `user = await Admin.findOne({ where: { id: req.user.id } });
      if (user) {
        if (name !== undefined) user.name = name;
        if (lastName !== undefined) user.lastName = lastName;
        if (location !== undefined) user.location = location;
        await sqlSave(user);
      }`
);
src = src.replace(
    /user = await Student\.\/\* TODO-SQL: replace findOneAndUpdate \*\/ findOne\(\{ where: \{ id: 0 \} \}\); \/\/findOneAndUpdate\(\s*\{ id: req\.user\.id \},\s*\{\s*name: name \|\| undefined,\s*lastName: lastName \|\| undefined\s*\},\s*\{ returnDocument: 'after' \}\s*\);/,
    `user = await Student.findOne({ where: { id: req.user.id } });
      if (user) {
        if (name !== undefined) user.name = name;
        if (lastName !== undefined) user.lastName = lastName;
        await sqlSave(user);
      }`
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. PUT /api/profile/password — change password
// ─────────────────────────────────────────────────────────────────────────────
src = src.replace(
    /user = await Teacher\.\/\* TODO-SQL: replace findOneAndUpdate \*\/ findOne\(\{ where: \{ id: 0 \} \}\); \/\/findOneAndUpdate\(\s*\{ id: req\.user\.id \},\s*\{\s*password: hashedPassword,\s*passwordChangedAt: new Date\(\)\s*\},\s*\{ returnDocument: 'after' \}\s*\);/,
    `user = await Teacher.findOne({ where: { id: req.user.id } });
      if (user) { user.password = hashedPassword; user.passwordChangedAt = new Date(); await sqlSave(user); }`
);
src = src.replace(
    /user = await Admin\.\/\* TODO-SQL: replace findOneAndUpdate \*\/ findOne\(\{ where: \{ id: 0 \} \}\); \/\/findOneAndUpdate\(\s*\{ id: req\.user\.id \},\s*\{\s*password: hashedPassword,\s*passwordChangedAt: new Date\(\)\s*\},\s*\{ returnDocument: 'after' \}\s*\);/,
    `user = await Admin.findOne({ where: { id: req.user.id } });
      if (user) { user.password = hashedPassword; user.passwordChangedAt = new Date(); await sqlSave(user); }`
);
src = src.replace(
    /user = await Student\.\/\* TODO-SQL: replace findOneAndUpdate \*\/ findOne\(\{ where: \{ id: 0 \} \}\); \/\/findOneAndUpdate\(\s*\{ id: req\.user\.id \},\s*\{\s*password: hashedPassword\s*\},\s*\{ returnDocument: 'after' \}\s*\);/,
    `user = await Student.findOne({ where: { id: req.user.id } });
      if (user) { user.password = hashedPassword; await sqlSave(user); }`
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Attendance upsert
// ─────────────────────────────────────────────────────────────────────────────
src = src.replace(
    /const attendance = await Attendance\.\/\* TODO-SQL: replace findOneAndUpdate \*\/ findOne\(\{ where: \{ id: 0 \} \}\); \/\/findOneAndUpdate\(\s*\{ promotionId: req\.params\.promotionId, studentId, date \},\s*updateData,\s*\{ upsert: true, new: true, setDefaultsOnInsert: true \}\s*\);/,
    `let attendance = await Attendance.findOne({ where: { promotionId: req.params.promotionId, studentId, date } });
    if (attendance) {
      Object.assign(attendance, updateData);
      await sqlSave(attendance);
    } else {
      attendance = await Attendance.create({ promotionId: req.params.promotionId, studentId, date, ...updateData });
    }`
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. PUT /api/promotions/:promotionId/holidays
// ─────────────────────────────────────────────────────────────────────────────
src = src.replace(
    /await Promotion\.\/\* TODO-SQL: replace findOneAndUpdate \*\/ findOne\(\{ where: \{ id: 0 \} \}\); \/\/findOneAndUpdate\(\{ id: req\.params\.promotionId \}, \{ holidays \}\);/,
    `const _promo = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (_promo) { _promo.holidays = holidays; await sqlSave(_promo); }`
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. PUT /api/promotions/:promotionId/students/:studentId/notes
// ─────────────────────────────────────────────────────────────────────────────
src = src.replace(
    /const student = await Student\.\/\* TODO-SQL: replace findOneAndUpdate \*\/ findOne\(\{ where: \{ id: 0 \} \}\); \/\/findOneAndUpdate\(\s*\{ id: req\.params\.studentId, promotionId: req\.params\.promotionId \},\s*\{ notes: notes \|\| '' \},\s*\{ returnDocument: 'after' \}\s*\);/,
    `const student = await Student.findOne({ where: { id: req.params.studentId, promotionId: req.params.promotionId } });
    if (student) { student.notes = notes || ''; await sqlSave(student); }`
);

// ─────────────────────────────────────────────────────────────────────────────
// 6. PUT /api/promotions/:id  — update promotion fields
// ─────────────────────────────────────────────────────────────────────────────
src = src.replace(
    /const promotion = await Promotion\.\/\* TODO-SQL: replace findOneAndUpdate \*\/ findOne\(\{ where: \{ id: 0 \} \}\); \/\/findOneAndUpdate\(\s*\{ id: req\.params\.id \},\s*\{ \.\.\.req\.body \},\s*\{ returnDocument: 'after' \}\s*\);\s*if \(!promotion\) return res\.status\(404\)\.json\(\{ error: 'Promotion not found' \}\);\s*if \(!canEditPromotion\(promotion, req\.user\.id\)\) return res\.status\(403\)\.json\(\{ error: 'Unauthorized' \}\);\s*res\.json\(promotion\);/,
    `const promotion = await Promotion.findOne({ where: { id: req.params.id } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });
    const allowed = ['name','description','startDate','endDate','weeks','modules','employability','teachingContentUrl','asanaWorkspaceUrl','accessPassword','holidays','collaborators','ownerModules','collaboratorModules'];
    for (const key of allowed) {
      if (req.body.hasOwnProperty(key)) promotion[key] = req.body[key];
    }
    await sqlSave(promotion);
    res.json(promotion);`
);

// ─────────────────────────────────────────────────────────────────────────────
// 7. PUT /api/promotions/:promotionId/sections/:sectionId
// ─────────────────────────────────────────────────────────────────────────────
src = src.replace(
    /const section = await Section\.\/\* TODO-SQL: replace findOneAndUpdate \*\/ findOne\(\{ where: \{ id: 0 \} \}\); \/\/findOneAndUpdate\(\s*\{ id: req\.params\.sectionId, promotionId: req\.params\.promotionId \},\s*\{ \.\.\.req\.body \},\s*\{ returnDocument: 'after' \}\s*\);\s*if \(!section\) return res\.status\(404\)\.json\(\{ error: 'Section not found' \}\);\s*res\.json\(section\);/,
    `const section = await Section.findOne({ where: { id: req.params.sectionId, promotionId: req.params.promotionId } });
    if (!section) return res.status(404).json({ error: 'Section not found' });
    const { title, content } = req.body;
    if (title !== undefined) section.title = title;
    if (content !== undefined) section.content = content;
    await sqlSave(section);
    res.json(section);`
);

// ─────────────────────────────────────────────────────────────────────────────
// 8. PUT /api/calendar — upsert google calendar
// ─────────────────────────────────────────────────────────────────────────────
src = src.replace(
    /const calendar = await Calendar\.\/\* TODO-SQL: replace findOneAndUpdate \*\/ findOne\(\{ where: \{ id: 0 \} \}\); \/\/findOneAndUpdate\(\s*\{ promotionId: req\.params\.promotionId \},\s*\{ googleCalendarId \},\s*\{ upsert: true, returnDocument: 'after' \}\s*\);\s*res\.json\(calendar\);/,
    `let calendar = await Calendar.findOne({ where: { promotionId: req.params.promotionId } });
    if (calendar) { calendar.googleCalendarId = googleCalendarId; await sqlSave(calendar); }
    else { calendar = await Calendar.create({ promotionId: req.params.promotionId, googleCalendarId }); }
    res.json(calendar);`
);

// ─────────────────────────────────────────────────────────────────────────────
// 9. PUT /api/teachers/:id  — update teacher by admin
// ─────────────────────────────────────────────────────────────────────────────
src = src.replace(
    /const teacher = await Teacher\.\/\* TODO-SQL: replace findOneAndUpdate \*\/ findOne\(\{ where: \{ id: 0 \} \}\); \/\/findOneAndUpdate\(\s*\{ id: req\.params\.id \},\s*\{ name, email, userRole \},\s*\{ new: true, runValidators: true \}\s*\);\s*if \(!teacher\) return res\.status\(404\)\.json\(\{ error: 'Teacher not found' \}\);\s*res\.json\(teacher\);/,
    `const teacher = await Teacher.findOne({ where: { id: req.params.id } });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    if (name !== undefined) teacher.name = name;
    if (email !== undefined) teacher.email = email;
    if (userRole !== undefined) teacher.userRole = userRole;
    await sqlSave(teacher);
    res.json(teacher);`
);

// ─────────────────────────────────────────────────────────────────────────────
// 10. deleteMany → Sequelize destroy with where
// ─────────────────────────────────────────────────────────────────────────────
rep('Student.deleteMany({ promotionId: req.params.id })',
    'Student.destroy({ where: { promotionId: req.params.id } })',
    'Student.deleteMany → destroy');
rep('QuickLink.deleteMany({ promotionId: req.params.id })',
    'QuickLink.destroy({ where: { promotionId: req.params.id } })',
    'QuickLink.deleteMany → destroy');
rep('Section.deleteMany({ promotionId: req.params.id })',
    'Section.destroy({ where: { promotionId: req.params.id } })',
    'Section.deleteMany → destroy');
rep('ExtendedInfo.deleteOne({ promotionId: req.params.id })',
    'ExtendedInfo.destroy({ where: { promotionId: req.params.id } })',
    'ExtendedInfo.deleteOne → destroy');
// Generic deleteMany fallback
src = src.replace(/(\w+)\.deleteMany\(\{([^}]+)\}\)/g, (m, model, filter) =>
    `${model}.destroy({ where: {${filter}} })`
);

// ─────────────────────────────────────────────────────────────────────────────
// 11. findAll({ id: { [Op.in]: ... } }) → findAll({ where: { id: ... } })
//     (missing 'where:' wrapper on some findAll calls)
// ─────────────────────────────────────────────────────────────────────────────
src = src.replace(
    /Teacher\.findAll\(\{ id: \{ \[Op\.in\]: collaboratorIds \} \}\)/g,
    "Teacher.findAll({ where: { id: { [Op.in]: collaboratorIds } } })"
);
src = src.replace(
    /Promotion\.findAll\(\{ id: \{ \[Op\.in\]: promotionIds \} \}\)/g,
    "Promotion.findAll({ where: { id: { [Op.in]: promotionIds } } })"
);

// ─────────────────────────────────────────────────────────────────────────────
// 12. Teacher.findOne({ email, id: { [Op.ne]: ... } }) → add where:
// ─────────────────────────────────────────────────────────────────────────────
src = src.replace(
    /Teacher\.findOne\(\{ email, id: \{ \[Op\.ne\]: req\.params\.id \} \}\)/g,
    "Teacher.findOne({ where: { email, id: { [Op.ne]: req.params.id } } })"
);

// ─────────────────────────────────────────────────────────────────────────────
// 13. Section.destroy result.deletedCount → Sequelize returns count directly
// ─────────────────────────────────────────────────────────────────────────────
rep('if (result.deletedCount === 0)', 'if (result === 0)', 'deletedCount → Sequelize count');

// ─────────────────────────────────────────────────────────────────────────────
// 14. Promotion.findAll({}) missing where (bare empty objects)
// ─────────────────────────────────────────────────────────────────────────────
rep('Promotion.findAll({})', 'Promotion.findAll()', 'Promotion.findAll({})');
rep('Teacher.findAll({})', 'Teacher.findAll()', 'Teacher.findAll({})');
rep('Student.findAll({})', 'Student.findAll()', 'Student.findAll({})');

// ─────────────────────────────────────────────────────────────────────────────
// 15. Remove any leftover comment garbage from broken TODO lines
// ─────────────────────────────────────────────────────────────────────────────
src = src.replace(/\/\* TODO-SQL:[^*]*\*\/ /g, '');
src = src.replace(/\/\/findOneAndUpdate\([^\n]*\n/g, '\n');

writeFileSync('server.js', src, 'utf8');
console.log('\n✅ Final SQL cleanup done.');
