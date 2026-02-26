import mongoose from 'mongoose';
import Student from './models/Student.js';

// Configuración de MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/roadmap-manager';

async function rollbackMigration() {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    console.log('⚠️  ATENCIÓN: Esto eliminará las estructuras technicalTracking y transversalTracking');
    console.log('⚠️  Pero mantendrá los campos básicos agregados (phone, administrativeSituation, etc.)');
    
    // Obtener estudiantes con las nuevas estructuras
    const studentsToRollback = await Student.find({
      $or: [
        { 'technicalTracking': { $exists: true } },
        { 'transversalTracking': { $exists: true } }
      ]
    });

    console.log(`📊 Encontrados ${studentsToRollback.length} estudiantes para rollback`);

    let rollbackCount = 0;

    for (const student of studentsToRollback) {
      try {
        await Student.findByIdAndUpdate(
          student._id,
          { 
            $unset: { 
              technicalTracking: "",
              transversalTracking: ""
            }
          }
        );

        console.log(`✅ Rollback: ${student.name} ${student.lastname}`);
        rollbackCount++;
      } catch (error) {
        console.error(`❌ Error en rollback de ${student.name} ${student.lastname}:`, error.message);
      }
    }

    console.log(`\n📋 Rollback completado: ${rollbackCount} estudiantes procesados`);

  } catch (error) {
    console.error('❌ Error en rollback:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

// Función para limpiar datos específicos
async function cleanupSpecificStudent(email) {
  try {
    await mongoose.connect(MONGO_URI);
    
    const student = await Student.findOne({ email });
    if (!student) {
      console.log(`❌ No se encontró estudiante con email: ${email}`);
      return;
    }

    await Student.findByIdAndUpdate(
      student._id,
      { 
        $set: {
          'technicalTracking.teacherNotes': [],
          'technicalTracking.competences': [],
          'transversalTracking.employabilitySessions': [],
          'transversalTracking.individualSessions': [],
          'transversalTracking.incidents': []
        }
      }
    );

    console.log(`✅ Limpiado datos de seguimiento para ${student.name} ${student.lastname}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

export { rollbackMigration, cleanupSpecificStudent };

// Permitir ejecución directa
if (process.argv[1].includes('rollback-migration.js')) {
  const action = process.argv[2];
  
  if (action === 'rollback') {
    rollbackMigration().catch(console.error);
  } else if (action === 'cleanup' && process.argv[3]) {
    cleanupSpecificStudent(process.argv[3]).catch(console.error);
  } else {
    console.log('Uso:');
    console.log('  node rollback-migration.js rollback          # Hacer rollback completo');
    console.log('  node rollback-migration.js cleanup <email>   # Limpiar datos de un estudiante específico');
  }
}
