import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from './backend/models/Student.js';

// Cargar variables de entorno
dotenv.config();

// Configuración de MongoDB
const MONGO_URI = process.env.MONGO_URI;

async function verifyMigration() {
  try {
    console.log('✅ Verificando migración...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Verificar Mirae específicamente
    const mirae = await Student.findOne({ email: 'mirae.kang.dev@gmail.com' });
    
    if (!mirae) {
      console.log('❌ No se encontró a Mirae Kang');
      return;
    }

    console.log(`\n👤 Verificando: ${mirae.name} ${mirae.lastname}`);
    console.log(`   📧 Email: ${mirae.email}`);
    console.log(`   📞 Phone: ${mirae.phone || 'NO DEFINIDO'}`);
    console.log(`   📋 administrativeSituation: ${mirae.administrativeSituation || 'NO DEFINIDO'}`);
    console.log(`   🔧 technicalTracking: ${mirae.technicalTracking ? 'EXISTE' : 'FALTA'}`);
    console.log(`   🎯 transversalTracking: ${mirae.transversalTracking ? 'EXISTE' : 'FALTA'}`);

    if (mirae.technicalTracking) {
      console.log(`   📚 teacherNotes: ${mirae.technicalTracking.teacherNotes?.length || 0} elementos`);
      console.log(`   ⚡ competences: ${mirae.technicalTracking.competences?.length || 0} elementos`);
    }

    if (mirae.transversalTracking) {
      console.log(`   💼 employabilitySessions: ${mirae.transversalTracking.employabilitySessions?.length || 0} elementos`);
      console.log(`   👥 individualSessions: ${mirae.transversalTracking.individualSessions?.length || 0} elementos`);
      console.log(`   ⚠️  incidents: ${mirae.transversalTracking.incidents?.length || 0} elementos`);
    }

    // Verificar estadísticas generales
    const totalStudents = await Student.countDocuments({});
    const studentsWithTracking = await Student.countDocuments({
      technicalTracking: { $exists: true },
      transversalTracking: { $exists: true }
    });

    console.log(`\n📊 Estadísticas generales:`);
    console.log(`   Total estudiantes: ${totalStudents}`);
    console.log(`   Con estructuras de seguimiento: ${studentsWithTracking}`);

    // Verificar algunos estudiantes más
    const sampleStudents = await Student.find({}).limit(3).select('name lastname technicalTracking transversalTracking phone administrativeSituation');
    
    console.log(`\n📋 Muestra de estudiantes migrados:`);
    sampleStudents.forEach((student, index) => {
      console.log(`   ${index + 1}. ${student.name} ${student.lastname}`);
      console.log(`      📞 phone: ${student.phone || 'FALTA'}`);
      console.log(`      📋 adminSituation: ${student.administrativeSituation || 'FALTA'}`);
      console.log(`      🔧 technical: ${student.technicalTracking ? 'OK' : 'FALTA'}`);
      console.log(`      🎯 transversal: ${student.transversalTracking ? 'OK' : 'FALTA'}`);
    });

    if (studentsWithTracking === totalStudents) {
      console.log(`\n🎉 MIGRACIÓN EXITOSA: Todos los estudiantes tienen las estructuras de seguimiento`);
    } else {
      console.log(`\n⚠️  MIGRACIÓN INCOMPLETA: ${totalStudents - studentsWithTracking} estudiantes sin estructuras`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

verifyMigration().catch(console.error);
