import mongoose from 'mongoose';

const TeacherSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    lastName: { type: String, default: '' },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    location: { type: String, default: '' },
    provisional: { type: Boolean, default: false },
    passwordChangedAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Teacher', TeacherSchema);
