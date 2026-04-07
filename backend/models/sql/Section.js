import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';

const Section = sequelize.define('Section', {
    id:          { type: DataTypes.STRING, primaryKey: true },
    promotionId: { type: DataTypes.STRING, allowNull: false },
    title:       { type: DataTypes.STRING, allowNull: false },
    content:     { type: DataTypes.TEXT,   allowNull: false }
}, { tableName: 'sections', underscored: false, timestamps: false });

export default Section;
