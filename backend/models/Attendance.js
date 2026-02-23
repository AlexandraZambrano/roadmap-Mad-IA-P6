import mongoose from 'mongoose';

const AttendanceSchema = new mongoose.Schema({
    promotionId: { type: String, required: true, index: true },
    studentId: { type: String, required: true, index: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    status: {
        type: String,
        enum: ['Presente', 'Ausente', 'Con retraso', 'Justificado', ''],
        default: ''
    },
    note: { type: String, default: '' }
}, { timestamps: true });

// Ensure unique attendance record per student per day
AttendanceSchema.index({ promotionId: 1, studentId: 1, date: 1 }, { unique: true });

export default mongoose.model('Attendance', AttendanceSchema);
