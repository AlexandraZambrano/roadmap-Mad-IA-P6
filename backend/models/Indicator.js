import mongoose from 'mongoose';

const IndicatorSchema = new mongoose.Schema({
    id: { type: Number },
    name: { type: String, required: true },
    description: { type: String },
    levelId: { type: Number }   // 1 = initial, 2 = medium, 3 = advanced
}, {
    collection: 'indicators'
});

export default mongoose.model('Indicator', IndicatorSchema);
