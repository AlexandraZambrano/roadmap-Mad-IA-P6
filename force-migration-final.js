import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Configuración de MongoDB
const MONGO_URI = process.env.MONGO_URI;

async function forceMigration() {
  try {
    console.log('🔧 Migración forzada - agregando estructuras directamente...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Obtener todos los estudiantes directamente de la colección
    const studentsCollection = mongoose.connection.db.collection('students');
    
    // Buscar estudiantes sin las estructuras
    const studentsToUpdate = await studentsCollection.find({
      $or: [
        { 'technicalTracking': { $exists: false } },
        { 'transversalTracking': { $exists: false } }
      ]
    }).toArray();

    console.log(`📊 Encontrados ${studentsToUpdate.length} estudiantes para migrar`);

    let migratedCount = 0;

    for (const student of studentsToUpdate) {
      try {
        const updateData = {};

        // Agregar technicalTracking si no existe
        if (!student.technicalTracking) {
          updateData.technicalTracking = {
            teacherNotes: [],
            teams: [],
            completedPildoras: [],
            competences: [],
            completedModules: []
          };
        }

        // Agregar transversalTracking si no existe
        if (!student.transversalTracking) {
          updateData.transversalTracking = {
            employabilitySessions: [],
            individualSessions: [],
            incidents: []
          };
        }

        // Asegurar que phone existe
        if (!student.phone) {
          updateData.phone = '';
        }

        // Asegurar que administrativeSituation existe
        if (!student.administrativeSituation) {
          updateData.administrativeSituation = 'no_permiso_trabajo';
        }

        // Aplicar la actualización
        await studentsCollection.updateOne(
          { _id: student._id },
          { $set: updateData }
        );

        console.log(`✅ Migrado: ${student.name} ${student.lastname || ''}`);
        migratedCount++;

      } catch (error) {
        console.error(`❌ Error migrando ${student.name}:`, error.message);
      }
    }

    console.log(`\n🎉 Migración completada: ${migratedCount}/${studentsToUpdate.length} estudiantes`);

    // Verificación final
    const totalStudents = await studentsCollection.countDocuments({});
    const studentsWithBothStructures = await studentsCollection.countDocuments({
      'technicalTracking': { $exists: true },
      'transversalTracking': { $exists: true },
      'phone': { $exists: true },
      'administrativeSituation': { $exists: true }
    });

    console.log(`\n📊 Verificación final:`);
    console.log(`   Total estudiantes: ${totalStudents}`);
    console.log(`   Estudiantes con estructuras completas: ${studentsWithBothStructures}`);

    if (studentsWithBothStructures === totalStudents) {
      console.log(`\n🎉 ¡MIGRACIÓN EXITOSA! Todos los estudiantes están listos para el seguimiento.`);
    } else {
      console.log(`\n⚠️  Faltan ${totalStudents - studentsWithBothStructures} estudiantes por migrar`);
    }

    // Mostrar un ejemplo de estudiante migrado
    const sampleStudent = await studentsCollection.findOne({ 
      email: 'mirae.kang.dev@gmail.com' 
    });
    
    if (sampleStudent) {
      console.log(`\n👤 Ejemplo - ${sampleStudent.name} ${sampleStudent.lastname}:`);
      console.log(`   📞 phone: ${sampleStudent.phone !== undefined ? 'SÍ' : 'NO'}`);
      console.log(`   📋 administrativeSituation: ${sampleStudent.administrativeSituation !== undefined ? 'SÍ' : 'NO'}`);
      console.log(`   🔧 technicalTracking: ${sampleStudent.technicalTracking !== undefined ? 'SÍ' : 'NO'}`);
      console.log(`   🎯 transversalTracking: ${sampleStudent.transversalTracking !== undefined ? 'SÍ' : 'NO'}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

forceMigration().catch(console.error);
