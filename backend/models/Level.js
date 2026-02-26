import mongoose from 'mongoose';

const LevelSchema = new mongoose.Schema({
    id: { type: Number },
    name: { type: String, required: true },
    description: { type: String }
}, {
    collection: 'levels'
});

export default mongoose.model('Level', LevelSchema);
