import mongoose from 'mongoose';
import Student from './backend/models/Student.js';

// Configuración de MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/roadmap-manager';

async function checkStudents() {
  try {
    console.log('🔍 Verificando estudiantes en la base de datos...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Obtener todos los estudiantes
    const allStudents = await Student.find({});
    console.log(`📊 Total de estudiantes: ${allStudents.length}`);

    if (allStudents.length === 0) {
      console.log('ℹ️  No hay estudiantes en la base de datos');
      return;
    }

    // Verificar estructura de algunos estudiantes
    for (let i = 0; i < Math.min(3, allStudents.length); i++) {
      const student = allStudents[i];
      console.log(`\n👤 Estudiante ${i + 1}: ${student.name} ${student.lastname}`);
      console.log(`   Email: ${student.email}`);
      console.log(`   technicalTracking existe: ${student.technicalTracking ? 'SÍ' : 'NO'}`);
      console.log(`   transversalTracking existe: ${student.transversalTracking ? 'SÍ' : 'NO'}`);
      console.log(`   phone: ${student.phone || 'NO DEFINIDO'}`);
      console.log(`   administrativeSituation: ${student.administrativeSituation || 'NO DEFINIDO'}`);
      
      if (student.technicalTracking) {
        console.log(`   - teacherNotes: ${student.technicalTracking.teacherNotes?.length || 0} elementos`);
        console.log(`   - competences: ${student.technicalTracking.competences?.length || 0} elementos`);
      }
      
      if (student.transversalTracking) {
        console.log(`   - employabilitySessions: ${student.transversalTracking.employabilitySessions?.length || 0} elementos`);
        console.log(`   - individualSessions: ${student.transversalTracking.individualSessions?.length || 0} elementos`);
        console.log(`   - incidents: ${student.transversalTracking.incidents?.length || 0} elementos`);
      }
    }

    // Contar estudiantes por categoría
    const withoutTechnical = await Student.countDocuments({
      'technicalTracking': { $exists: false }
    });
    
    const withoutTransversal = await Student.countDocuments({
      'transversalTracking': { $exists: false }
    });

    const withoutPhone = await Student.countDocuments({
      $or: [
        { 'phone': { $exists: false } },
        { 'phone': '' }
      ]
    });

    const withoutAdminSituation = await Student.countDocuments({
      $or: [
        { 'administrativeSituation': { $exists: false } },
        { 'administrativeSituation': '' }
      ]
    });

    console.log(`\n📈 Estadísticas:`);
    console.log(`   Sin technicalTracking: ${withoutTechnical}`);
    console.log(`   Sin transversalTracking: ${withoutTransversal}`);
    console.log(`   Sin phone: ${withoutPhone}`);
    console.log(`   Sin administrativeSituation: ${withoutAdminSituation}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

checkStudents().catch(console.error);
