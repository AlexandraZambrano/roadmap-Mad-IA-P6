import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from './backend/models/Student.js';

// Cargar variables de entorno
dotenv.config();

// Configuración de MongoDB
const MONGO_URI = process.env.MONGO_URI;

async function fixMigration() {
  try {
    console.log('🔧 Corrigiendo migración - agregando campo phone faltante...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Buscar estudiantes sin phone o con phone vacío
    const studentsWithoutPhone = await Student.find({
      $or: [
        { phone: { $exists: false } },
        { phone: '' },
        { phone: null }
      ]
    });

    console.log(`📊 Encontrados ${studentsWithoutPhone.length} estudiantes sin teléfono`);

    let fixedCount = 0;
    for (const student of studentsWithoutPhone) {
      try {
        await Student.findByIdAndUpdate(
          student._id,
          { 
            $set: { 
              phone: '' 
            }
          }
        );

        console.log(`✅ Corregido phone para: ${student.name} ${student.lastname}`);
        fixedCount++;
      } catch (error) {
        console.error(`❌ Error corrigiendo ${student.name}:`, error.message);
      }
    }

    // Verificación final mejorada
    const totalStudents = await Student.countDocuments({});
    
    // Verificar usando .lean() para obtener objetos planos
    const studentsWithStructures = await Student.find({}).lean();
    
    let validCount = 0;
    let invalidStudents = [];
    
    studentsWithStructures.forEach(student => {
      const hasPhone = student.phone !== undefined;
      const hasAdminSituation = student.administrativeSituation !== undefined;
      const hasTechnical = student.technicalTracking !== undefined;
      const hasTransversal = student.transversalTracking !== undefined;
      
      if (hasPhone && hasAdminSituation && hasTechnical && hasTransversal) {
        validCount++;
      } else {
        invalidStudents.push({
          name: `${student.name} ${student.lastname}`,
          phone: hasPhone,
          admin: hasAdminSituation,
          technical: hasTechnical,
          transversal: hasTransversal
        });
      }
    });

    console.log(`\n📊 Verificación final:`);
    console.log(`   Total estudiantes: ${totalStudents}`);
    console.log(`   Estudiantes válidos: ${validCount}`);
    console.log(`   Campos phone corregidos: ${fixedCount}`);

    if (invalidStudents.length > 0) {
      console.log(`\n❌ Estudiantes con problemas (${invalidStudents.length}):`);
      invalidStudents.forEach(s => {
        console.log(`   - ${s.name}: phone=${s.phone}, admin=${s.admin}, tech=${s.technical}, trans=${s.transversal}`);
      });
    }

    if (validCount === totalStudents) {
      console.log(`\n🎉 ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!`);
      console.log(`   Todos los ${totalStudents} estudiantes tienen las estructuras requeridas.`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

fixMigration().catch(console.error);
