import mongoose from 'mongoose';

const ToolSchema = new mongoose.Schema({
    id: { type: Number },
    name: { type: String, required: true },
    description: { type: String }
}, {
    collection: 'tools'
});

export default mongoose.model('Tool', ToolSchema);
