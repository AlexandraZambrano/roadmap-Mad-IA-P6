import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from './models/Student.js';

// Cargar variables de entorno
dotenv.config();

// Configuración de MongoDB
const MONGO_URI = process.env.MONGO_URI;

async function quickMigration() {
  try {
    console.log('⚡ Migración rápida iniciada...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Obtener solo estudiantes que no tienen las estructuras de seguimiento
    const studentsToUpdate = await Student.find({
      $or: [
        { 'technicalTracking': { $exists: false } },
        { 'transversalTracking': { $exists: false } }
      ]
    });

    console.log(`📊 Encontrados ${studentsToUpdate.length} estudiantes para migrar`);

    if (studentsToUpdate.length === 0) {
      console.log('ℹ️  No hay estudiantes que migrar');
      return;
    }

    let migratedCount = 0;

    for (const student of studentsToUpdate) {
      try {
        const updateData = {};

        // Solo agregar estructuras que faltan
        if (!student.technicalTracking) {
          updateData.technicalTracking = {
            teacherNotes: [],
            competences: []
          };
        }

        if (!student.transversalTracking) {
          updateData.transversalTracking = {
            employabilitySessions: [],
            individualSessions: [],
            incidents: []
          };
        }

        // Agregar campos básicos si faltan
        if (!student.phone) {
          updateData.phone = '';
        }

        if (!student.administrativeSituation) {
          updateData.administrativeSituation = 'no_permiso_trabajo';
        }

        await Student.findByIdAndUpdate(student._id, { $set: updateData });

        console.log(`✅ Migrado: ${student.name} ${student.lastname}`);
        migratedCount++;

      } catch (error) {
        console.error(`❌ Error migrando ${student.name} ${student.lastname}:`, error.message);
      }
    }

    console.log(`\n🎉 Migración completada: ${migratedCount}/${studentsToUpdate.length} estudiantes`);

    // Verificación rápida
    const verification = await Student.countDocuments({
      'technicalTracking': { $exists: true },
      'transversalTracking': { $exists: true }
    });

    console.log(`✅ Verificación: ${verification} estudiantes tienen estructuras completas`);

  } catch (error) {
    console.error('❌ Error en migración:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

export { quickMigration };

// Permitir ejecución directa
if (process.argv[1].includes('quick-migration.js')) {
  quickMigration().catch(console.error);
}
