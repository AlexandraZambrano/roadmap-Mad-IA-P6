import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';

const Teacher = sequelize.define('Teacher', {
    id:               { type: DataTypes.STRING, primaryKey: true },
    externalId:       { type: DataTypes.STRING, allowNull: true },
    name:             { type: DataTypes.STRING, allowNull: false },
    lastName:         { type: DataTypes.STRING, defaultValue: '' },
    email:            { type: DataTypes.STRING, allowNull: false, unique: true },
    password:         { type: DataTypes.STRING, allowNull: false },
    location:         { type: DataTypes.STRING, defaultValue: '' },
    provisional:      { type: DataTypes.BOOLEAN, defaultValue: false },
    userRole:         { type: DataTypes.STRING, defaultValue: 'Formador/a' },
    passwordChangedAt:{ type: DataTypes.DATE,   allowNull: true }
}, { tableName: 'teachers', underscored: false, timestamps: false });

export default Teacher;
