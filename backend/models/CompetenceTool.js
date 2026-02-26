import mongoose from 'mongoose';

// competences ↔ tools
const CompetenceToolSchema = new mongoose.Schema({
    id: { type: Number },
    id_competence: { type: Number },
    id_tool: { type: Number }
}, {
    collection: 'competenceTools'
});

export default mongoose.model('CompetenceTool', CompetenceToolSchema);
