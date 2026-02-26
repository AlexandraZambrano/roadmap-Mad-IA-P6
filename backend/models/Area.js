import mongoose from 'mongoose';

const AreaSchema = new mongoose.Schema({
    id: { type: Number },
    name: { type: String, required: true },
    icon: { type: String },
    description: { type: String }
}, {
    collection: 'areas'
});

export default mongoose.model('Area', AreaSchema);
