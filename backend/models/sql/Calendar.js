import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';

const Calendar = sequelize.define('Calendar', {
    promotionId:       { type: DataTypes.STRING, primaryKey: true },
    googleCalendarId:  { type: DataTypes.STRING, allowNull: false }
}, { tableName: 'calendars', underscored: false, timestamps: false });

export default Calendar;
