import mongoose from 'mongoose';

// competences ↔ indicators
const CompetenceIndicatorSchema = new mongoose.Schema({
    id: { type: Number },
    id_competence: { type: Number },
    id_indicator: { type: Number }
}, {
    collection: 'competenceIndicators'
});

export default mongoose.model('CompetenceIndicator', CompetenceIndicatorSchema);
