import mongoose from 'mongoose';

// competences ↔ resources
const CompetenceResourceSchema = new mongoose.Schema({
    id: { type: Number },
    id_competence: { type: Number },
    id_resource: { type: Number }
}, {
    collection: 'competenceResources'
});

export default mongoose.model('CompetenceResource', CompetenceResourceSchema);
