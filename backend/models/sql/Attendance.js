import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';

const Attendance = sequelize.define('Attendance', {
    id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    promotionId: { type: DataTypes.STRING, allowNull: false },
    studentId:   { type: DataTypes.STRING, allowNull: false },
    date:        { type: DataTypes.STRING, allowNull: false },
    status:      { type: DataTypes.STRING, defaultValue: '' },
    note:        { type: DataTypes.TEXT,   defaultValue: '' }
}, {
    tableName: 'attendance',
    underscored: false,
    timestamps: false,
    indexes: [
        { unique: true, fields: ['promotionId', 'studentId', 'date'] }
    ]
});

export default Attendance;
