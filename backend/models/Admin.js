import mongoose from 'mongoose';

const AdminSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    lastName: { type: String, default: '' },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    location: { type: String, default: '' },
    passwordChangedAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Admin', AdminSchema);
