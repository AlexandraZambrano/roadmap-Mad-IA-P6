import mongoose from 'mongoose';
import Student from './backend/models/Student.js';

// Configuración de MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/roadmap-manager';

async function analyzeStudentStructure() {
  try {
    console.log('🔍 Analizando estructura de estudiantes existentes...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Obtener todos los estudiantes como objetos planos
    const students = await Student.find({}).lean();
    console.log(`📊 Total de estudiantes encontrados: ${students.length}`);

    if (students.length === 0) {
      console.log('ℹ️  No hay estudiantes en la base de datos');
      return;
    }

    // Analizar estructura de cada estudiante
    students.forEach((student, index) => {
      console.log(`\n👤 Estudiante ${index + 1}: ${student.name} ${student.lastname}`);
      console.log(`   📧 Email: ${student.email}`);
      console.log(`   🆔 ID: ${student.id || 'NO DEFINIDO'}`);
      
      // Verificar campos requeridos del nuevo esquema
      console.log(`\n   📋 Campos del esquema actual:`);
      console.log(`   ✓ name: ${student.name}`);
      console.log(`   ✓ lastname: ${student.lastname}`);
      console.log(`   ${student.phone ? '✓' : '❌'} phone: ${student.phone || 'FALTA'}`);
      console.log(`   ${student.administrativeSituation ? '✓' : '❌'} administrativeSituation: ${student.administrativeSituation || 'FALTA'}`);
      console.log(`   ✓ age: ${student.age}`);
      console.log(`   ✓ email: ${student.email}`);
      
      // Verificar estructuras de seguimiento
      console.log(`\n   📊 Estructuras de seguimiento:`);
      console.log(`   ${student.technicalTracking ? '✓' : '❌'} technicalTracking: ${student.technicalTracking ? 'EXISTE' : 'FALTA'}`);
      if (student.technicalTracking) {
        console.log(`       - teacherNotes: ${student.technicalTracking.teacherNotes?.length || 0} elementos`);
        console.log(`       - competences: ${student.technicalTracking.competences?.length || 0} elementos`);
        console.log(`       - teams: ${student.technicalTracking.teams?.length || 0} elementos`);
        console.log(`       - completedPildoras: ${student.technicalTracking.completedPildoras?.length || 0} elementos`);
        console.log(`       - completedModules: ${student.technicalTracking.completedModules?.length || 0} elementos`);
      }
      
      console.log(`   ${student.transversalTracking ? '✓' : '❌'} transversalTracking: ${student.transversalTracking ? 'EXISTE' : 'FALTA'}`);
      if (student.transversalTracking) {
        console.log(`       - employabilitySessions: ${student.transversalTracking.employabilitySessions?.length || 0} elementos`);
        console.log(`       - individualSessions: ${student.transversalTracking.individualSessions?.length || 0} elementos`);
        console.log(`       - incidents: ${student.transversalTracking.incidents?.length || 0} elementos`);
      }

      // Mostrar campos legacy que existen
      console.log(`\n   📜 Campos legacy existentes:`);
      const legacyFields = ['notes', 'nationality', 'profession', 'address', 'progress', 'projectsAssignments'];
      legacyFields.forEach(field => {
        if (student[field] !== undefined) {
          const value = typeof student[field] === 'object' 
            ? JSON.stringify(student[field]).substring(0, 50) + '...'
            : student[field];
          console.log(`       - ${field}: ${value}`);
        }
      });
    });

    // Resumen de qué necesita migración
    console.log(`\n📋 RESUMEN DE MIGRACIÓN NECESARIA:`);
    
    const needsPhone = students.filter(s => !s.phone).length;
    const needsAdminSituation = students.filter(s => !s.administrativeSituation).length;
    const needsTechnicalTracking = students.filter(s => !s.technicalTracking).length;
    const needsTransversalTracking = students.filter(s => !s.transversalTracking).length;

    console.log(`   - Estudiantes sin phone: ${needsPhone}/${students.length}`);
    console.log(`   - Estudiantes sin administrativeSituation: ${needsAdminSituation}/${students.length}`);
    console.log(`   - Estudiantes sin technicalTracking: ${needsTechnicalTracking}/${students.length}`);
    console.log(`   - Estudiantes sin transversalTracking: ${needsTransversalTracking}/${students.length}`);

    if (needsPhone > 0 || needsAdminSituation > 0 || needsTechnicalTracking > 0 || needsTransversalTracking > 0) {
      console.log(`\n🔧 ACCIÓN REQUERIDA: Ejecutar migración para actualizar ${students.length} estudiantes`);
      console.log(`   Comando: node backend/quick-migration.js`);
    } else {
      console.log(`\n✅ TODOS LOS ESTUDIANTES tienen la estructura correcta`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

analyzeStudentStructure().catch(console.error);
