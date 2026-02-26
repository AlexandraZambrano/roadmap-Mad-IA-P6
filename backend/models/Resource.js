import mongoose from 'mongoose';

const ResourceSchema = new mongoose.Schema({
    id: { type: Number },
    label: { type: String, required: true },
    url: { type: String },
    comments: { type: String }
}, {
    collection: 'resources'
});

export default mongoose.model('Resource', ResourceSchema);
