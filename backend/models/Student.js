import mongoose from 'mongoose';

const StudentSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    lastname: { type: String, required: false, default: '' }, // Changed to not required for existing students
    email: { type: String, required: true },
    age: { type: Number, default: null },
    nationality: { type: String, default: '' },
    profession: { type: String, default: '' }, // Current profession/background
    address: { type: String, default: '' }, // Full address
    promotionId: { type: String },
    notes: { type: String, default: '' }, // Teacher notes about the student
    progress: {
        modulesCompleted: { type: Number, default: 0 },
        modulesViewed: [{ type: String }], // IDs of modules viewed
        sectionsCompleted: [{ type: String }], // IDs of sections completed
        lastAccessed: { type: Date }
    },
    projectsAssignments: [{
        id: { type: String, required: true },
        moduleId: { type: String, required: true },
        projectName: { type: String, required: true },
        groupName: { type: String, default: '' },
        teammates: [{ type: String }], // other student ids in the group
        done: { type: Boolean, default: false },
        assignedAt: { type: Date, default: Date.now }
    }],
    // ── Ficha de Seguimiento: Datos adicionales ───────────────────────────────
    phone: { type: String, default: '' },
    administrativeSituation: { type: String, default: '' },
    identificationDocument: { type: String, default: '' },
    gender: { type: String, default: '' },
    englishLevel: { type: String, default: '' },
    educationLevel: { type: String, default: '' },
    community: { type: String, default: '' },

    // ── Seguimiento Técnico ───────────────────────────────────────────────────
    technicalTracking: {
        teacherNotes: { type: Array, default: [] },
        teams: { type: Array, default: [] },
        competences: { type: Array, default: [] },
        completedModules: { type: Array, default: [] },
        completedPildoras: { type: Array, default: [] }
    },

    // ── Seguimiento Transversal ───────────────────────────────────────────────
    transversalTracking: {
        employabilitySessions: { type: Array, default: [] },
        individualSessions: { type: Array, default: [] },
        incidents: { type: Array, default: [] }
    },

    isManuallyAdded: { type: Boolean, default: true }, // Changed default to true since we removed auto-tracking
    accessLog: [{
        accessedAt: { type: Date, default: Date.now },
        ipAddress: { type: String },
        userAgent: { type: String }
    }],
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Student', StudentSchema);
