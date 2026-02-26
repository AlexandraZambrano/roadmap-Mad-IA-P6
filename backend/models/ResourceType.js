import mongoose from 'mongoose';

const ResourceTypeSchema = new mongoose.Schema({
    id: { type: Number },
    name: { type: String, required: true }
}, {
    collection: 'resourceTypes'
});

export default mongoose.model('ResourceType', ResourceTypeSchema);
