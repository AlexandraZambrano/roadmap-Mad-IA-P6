import mongoose from 'mongoose';

const ModuleSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    duration: { type: Number, required: true },
    courses: [{
        name: { type: String },
        url: { type: String },
        duration: { type: Number, default: 1 },
        startOffset: { type: Number, default: 0 }
    }],
    projects: [{
        name: { type: String },
        url: { type: String },
        duration: { type: Number, default: 1 },
        startOffset: { type: Number, default: 0 }
    }],
    pildoras: [{
        id: { type: String, required: true },
        title: { type: String, required: true },
        type: { type: String, enum: ['individual', 'couple'], default: 'individual' },
        assignedStudentIds: [{ type: String }]
    }],
    createdAt: { type: Date, default: Date.now }
});

const PromotionSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    startDate: { type: String },
    endDate: { type: String },
    weeks: { type: Number },
    modules: [ModuleSchema],
    employability: [{
        name: { type: String },
        url: { type: String },
        startMonth: { type: Number, default: 1 },
        duration: { type: Number, default: 1 }
    }],
    teacherId: { type: String, required: true },
    collaborators: [{ type: String }],
    accessPassword: { type: String }, // Password for students to access promotion
    passwordChangeHistory: [{
        oldPassword: String,
        newPassword: String,
        changedAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Promotion', PromotionSchema);
