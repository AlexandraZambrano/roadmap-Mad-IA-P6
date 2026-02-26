import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from './backend/models/Student.js';

// Cargar variables de entorno
dotenv.config();

// Configuración de MongoDB
const MONGO_URI = process.env.MONGO_URI;

async function debugStudentData() {
  try {
    console.log('🔍 Verificando estructura de datos de estudiantes...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Buscar un estudiante específico para debug
    const student = await Student.findOne({ 
      email: 'mirae.kang.dev@gmail.com' 
    }).lean();

    if (!student) {
      console.log('❌ No se encontró el estudiante');
      return;
    }

    console.log(`\n👤 Estudiante: ${student.name} ${student.lastname}`);
    console.log('\n📊 Estructura completa del technicalTracking:');
    console.log(JSON.stringify(student.technicalTracking, null, 2));
    
    console.log('\n📊 Estructura completa del transversalTracking:');
    console.log(JSON.stringify(student.transversalTracking, null, 2));

    // Verificar específicamente teacherNotes
    if (student.technicalTracking?.teacherNotes) {
      console.log('\n📝 Notas del profesor encontradas:');
      student.technicalTracking.teacherNotes.forEach((note, index) => {
        console.log(`   ${index + 1}. Tipo: ${note.type}`);
        console.log(`      Nombre: ${note.name}`);
        console.log(`      Nota: ${note.note}`);
        console.log(`      Fecha creación: ${note.createdAt}`);
        console.log(`      Nivel: ${note.level}`);
        console.log(`      ----`);
      });
    } else {
      console.log('\n📝 No hay notas del profesor en technicalTracking');
    }

    // Verificar si hay notas en el nivel raíz (legacy)
    if (student.teacherNotes) {
      console.log('\n📝 Notas del profesor en nivel raíz (legacy):');
      console.log(JSON.stringify(student.teacherNotes, null, 2));
    }

    // Verificar si hay notas en el campo "notes" general
    if (student.notes) {
      console.log(`\n📝 Notas generales: ${student.notes}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

debugStudentData().catch(console.error);
