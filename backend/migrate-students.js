import mongoose from 'mongoose';
import Student from './models/Student.js';

// Configuración de MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/roadmap-manager';

async function migrateStudents() {
  try {
    // Conectar a MongoDB
    console.log('Conectando a MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Obtener todos los estudiantes
    console.log('Obteniendo estudiantes...');
    const students = await Student.find({});
    console.log(`📊 Encontrados ${students.length} estudiantes`);

    let migratedCount = 0;
    let alreadyMigratedCount = 0;
    let errorCount = 0;

    // Procesar cada estudiante
    for (const student of students) {
      try {
        // Verificar si ya tiene las nuevas estructuras
        if (student.technicalTracking || student.transversalTracking) {
          console.log(`⏭️  Estudiante ${student.name} ${student.lastname} ya migrado`);
          alreadyMigratedCount++;
          continue;
        }

        // Preparar datos de migración
        const updateData = {};

        // Agregar campos obligatorios faltantes con valores por defecto
        if (!student.administrativeSituation) {
          updateData.administrativeSituation = 'nacional'; // Valor por defecto
        }
        
        if (!student.phone) {
          updateData.phone = ''; // Valor por defecto vacío
        }

        // Agregar campos opcionales faltantes
        if (student.nationality === null || student.nationality === undefined) {
          updateData.nationality = '';
        }
        
        if (student.profession === null || student.profession === undefined) {
          updateData.profession = '';
        }

        if (!student.dni) updateData.dni = '';
        if (!student.gender) updateData.gender = '';
        if (!student.englishLevel) updateData.englishLevel = '';
        if (!student.educationLevel) updateData.educationLevel = '';
        if (!student.residenceCommunity) updateData.residenceCommunity = '';

        // Inicializar estructuras de seguimiento
        updateData.technicalTracking = {
          teacherNotes: [],
          teams: [],
          completedPildoras: [],
          competences: [],
          completedModules: []
        };

        updateData.transversalTracking = {
          employabilitySessions: [],
          individualSessions: [],
          incidents: []
        };

        // Migrar datos existentes si los hay
        // Si el estudiante tiene notas en el campo legacy 'notes', crear una nota del profesor
        if (student.notes && student.notes.trim() !== '') {
          updateData.technicalTracking.teacherNotes.push({
            type: 'activity',
            name: 'Nota migrada',
            note: student.notes,
            level: 2, // Nivel medio por defecto
            createdAt: student.createdAt || new Date()
          });
        }

        // Migrar projectsAssignments si existen
        if (student.projectsAssignments && student.projectsAssignments.length > 0) {
          updateData.technicalTracking.teams = student.projectsAssignments.map(project => ({
            teamName: project.groupName || 'Equipo sin nombre',
            projectName: project.projectName,
            moduleId: project.moduleId,
            teammates: project.teammates || [],
            role: 'Miembro',
            startDate: project.assignedAt || student.createdAt,
            endDate: project.done ? new Date() : null
          }));
        }

        // Actualizar el estudiante
        await Student.findByIdAndUpdate(
          student._id,
          { $set: updateData },
          { new: true, runValidators: false } // Deshabilitamos validadores para evitar problemas con campos requeridos
        );

        console.log(`✅ Migrado: ${student.name} ${student.lastname} (${student.email})`);
        migratedCount++;

      } catch (error) {
        console.error(`❌ Error migrando ${student.name} ${student.lastname}:`, error.message);
        errorCount++;
      }
    }

    // Resumen de la migración
    console.log('\n📋 Resumen de la migración:');
    console.log(`✅ Estudiantes migrados: ${migratedCount}`);
    console.log(`⏭️  Ya migrados: ${alreadyMigratedCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`📊 Total procesados: ${students.length}`);

    // Verificar migración
    console.log('\n🔍 Verificando migración...');
    const updatedStudents = await Student.find({
      $or: [
        { 'technicalTracking': { $exists: false } },
        { 'transversalTracking': { $exists: false } }
      ]
    });

    if (updatedStudents.length === 0) {
      console.log('✅ ¡Migración completada exitosamente! Todos los estudiantes tienen las nuevas estructuras.');
    } else {
      console.log(`⚠️  ${updatedStudents.length} estudiantes aún no tienen las estructuras completas.`);
      updatedStudents.forEach(student => {
        console.log(`  - ${student.name} ${student.lastname} (${student.email})`);
      });
    }

  } catch (error) {
    console.error('❌ Error en la migración:', error);
  } finally {
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('🔌 Conexión a MongoDB cerrada');
  }
}

// Función para mostrar el estado actual antes de migrar
async function checkCurrentState() {
  try {
    await mongoose.connect(MONGO_URI);
    
    const totalStudents = await Student.countDocuments({});
    const studentsWithTechnical = await Student.countDocuments({ 'technicalTracking': { $exists: true } });
    const studentsWithTransversal = await Student.countDocuments({ 'transversalTracking': { $exists: true } });
    const studentsWithPhone = await Student.countDocuments({ 'phone': { $exists: true, $ne: null } });
    const studentsWithAdminSituation = await Student.countDocuments({ 'administrativeSituation': { $exists: true, $ne: null } });

    console.log('📊 Estado actual de la base de datos:');
    console.log(`   Total de estudiantes: ${totalStudents}`);
    console.log(`   Con technicalTracking: ${studentsWithTechnical}`);
    console.log(`   Con transversalTracking: ${studentsWithTransversal}`);
    console.log(`   Con campo phone: ${studentsWithPhone}`);
    console.log(`   Con administrativeSituation: ${studentsWithAdminSituation}`);
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error verificando estado:', error);
  }
}

// Función principal
async function main() {
  console.log('🚀 Iniciando migración de estudiantes...\n');
  
  // Mostrar estado actual
  await checkCurrentState();
  
  console.log('\n🔄 Iniciando migración...\n');
  
  // Ejecutar migración
  await migrateStudents();
}

// Ejecutar si es llamado directamente
if (process.argv[1].includes('migrate-students.js')) {
  main().catch(console.error);
}

export { migrateStudents, checkCurrentState };
