import mongoose from 'mongoose';

const CompetenceSchema = new mongoose.Schema({
    id: { type: Number },
    name: { type: String, required: true },
    description: { type: String }
}, {
    collection: 'competences'   // reads from the existing 'competences' collection
});

export default mongoose.model('Competence', CompetenceSchema);
