import mongoose from 'mongoose';

const ReferentSchema = new mongoose.Schema({
    id: { type: Number },
    name: { type: String, required: true },
    avatar: { type: String },
    link: { type: String }
}, {
    collection: 'referents'
});

export default mongoose.model('Referent', ReferentSchema);
