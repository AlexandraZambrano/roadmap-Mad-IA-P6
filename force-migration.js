import mongoose from 'mongoose';

// Configuración de MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/roadmap-manager';

async function forceUpdateStudents() {
  try {
    console.log('🔧 Forzando actualización de todos los estudiantes...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Usar la colección directamente para evitar validaciones del schema
    const db = mongoose.connection.db;
    const studentsCollection = db.collection('students');

    // Obtener todos los estudiantes
    const allStudents = await studentsCollection.find({}).toArray();
    console.log(`📊 Total de estudiantes encontrados: ${allStudents.length}`);

    if (allStudents.length === 0) {
      console.log('ℹ️  No hay estudiantes en la base de datos');
      return;
    }

    let updatedCount = 0;

    for (const student of allStudents) {
      try {
        console.log(`\n👤 Procesando: ${student.name} ${student.lastname}`);
        
        // Verificar qué campos faltan
        const missingFields = [];
        const updateData = {};

        if (!student.phone) {
          missingFields.push('phone');
          updateData.phone = '';
        }

        if (!student.administrativeSituation) {
          missingFields.push('administrativeSituation');
          updateData.administrativeSituation = 'no_permiso_trabajo';
        }

        if (!student.technicalTracking) {
          missingFields.push('technicalTracking');
          updateData.technicalTracking = {
            teacherNotes: [],
            teams: [],
            completedPildoras: [],
            competences: [],
            completedModules: []
          };
        }

        if (!student.transversalTracking) {
          missingFields.push('transversalTracking');
          updateData.transversalTracking = {
            employabilitySessions: [],
            individualSessions: [],
            incidents: []
          };
        }

        // Migrar datos legacy si existen
        if (student.notes && student.notes.trim() !== '') {
          if (!updateData.technicalTracking) updateData.technicalTracking = {};
          if (!updateData.technicalTracking.teacherNotes) updateData.technicalTracking.teacherNotes = [];
          
          updateData.technicalTracking.teacherNotes.push({
            type: 'activity',
            name: 'Notas generales (migradas)',
            note: student.notes,
            level: 2,
            createdAt: new Date(),
            createdBy: 'migration'
          });
          
          console.log(`   📝 Migrando notas: "${student.notes.substring(0, 50)}..."`);
        }

        if (student.projectsAssignments && Array.isArray(student.projectsAssignments) && student.projectsAssignments.length > 0) {
          if (!updateData.technicalTracking) updateData.technicalTracking = {};
          if (!updateData.technicalTracking.teams) updateData.technicalTracking.teams = [];
          
          student.projectsAssignments.forEach(assignment => {
            updateData.technicalTracking.teams.push({
              teamName: assignment.groupName || 'Equipo sin nombre',
              projectName: assignment.projectName,
              moduleId: assignment.moduleId,
              teammates: assignment.teammates || [],
              startDate: assignment.assignedAt || new Date()
            });
          });
          
          console.log(`   👥 Migrando ${student.projectsAssignments.length} asignaciones de proyectos`);
        }

        if (missingFields.length > 0) {
          console.log(`   ➕ Agregando campos: ${missingFields.join(', ')}`);
          
          // Actualizar usando la colección directamente
          const result = await studentsCollection.updateOne(
            { _id: student._id },
            { $set: updateData }
          );

          if (result.modifiedCount > 0) {
            console.log(`   ✅ Estudiante actualizado exitosamente`);
            updatedCount++;
          } else {
            console.log(`   ⚠️  No se realizaron cambios`);
          }
        } else {
          console.log(`   ✅ Ya tiene todos los campos necesarios`);
        }

      } catch (error) {
        console.error(`   ❌ Error actualizando ${student.name} ${student.lastname}:`, error.message);
      }
    }

    console.log(`\n🎉 Migración completada: ${updatedCount}/${allStudents.length} estudiantes actualizados`);

    // Verificación final
    const verificationStudents = await studentsCollection.find({}).toArray();
    let completeStudents = 0;

    verificationStudents.forEach(student => {
      if (student.phone !== undefined && 
          student.administrativeSituation && 
          student.technicalTracking && 
          student.transversalTracking) {
        completeStudents++;
      }
    });

    console.log(`✅ Verificación final: ${completeStudents}/${verificationStudents.length} estudiantes con estructura completa`);

  } catch (error) {
    console.error('❌ Error en migración:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

forceUpdateStudents().catch(console.error);
