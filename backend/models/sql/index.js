/**
 * Central SQL models index.
 * Import this file once at app startup — it syncs all tables
 * and re-exports every model.
 *
 * Usage in server.js:
 *   import { db, Teacher, Promotion, Student, ... } from './backend/models/sql/index.js';
 *   await db.sync({ alter: true });   // or { force: false } in production
 */

import sequelize from '../../db/sequelize.js';

import Teacher          from './Teacher.js';
import Admin            from './Admin.js';
import Promotion        from './Promotion.js';
import Student          from './Student.js';
import QuickLink        from './QuickLink.js';
import Section          from './Section.js';
import ExtendedInfo     from './ExtendedInfo.js';
import Attendance       from './Attendance.js';
import Calendar         from './Calendar.js';
import BootcampTemplate from './BootcampTemplate.js';
import {
    Competence,
    Indicator,
    Tool,
    Area,
    Level,
    Resource,
    Referent,
    ResourceType,
    CompetenceIndicator,
    CompetenceTool,
    CompetenceArea,
    CompetenceResource
} from './catalog.js';

export {
    sequelize as db,
    Teacher,
    Admin,
    Promotion,
    Student,
    QuickLink,
    Section,
    ExtendedInfo,
    Attendance,
    Calendar,
    BootcampTemplate,
    Competence,
    Indicator,
    Tool,
    Area,
    Level,
    Resource,
    Referent,
    ResourceType,
    CompetenceIndicator,
    CompetenceTool,
    CompetenceArea,
    CompetenceResource
};
