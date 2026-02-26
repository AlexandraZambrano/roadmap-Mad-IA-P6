import mongoose from 'mongoose';

// competences ↔ areas
const CompetenceAreaSchema = new mongoose.Schema({
    id: { type: Number },
    id_competence: { type: Number },
    id_area: { type: Number }
}, {
    collection: 'competenceAreas'
});

export default mongoose.model('CompetenceArea', CompetenceAreaSchema);
