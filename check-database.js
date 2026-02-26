import mongoose from 'mongoose';
import Student from './backend/models/Student.js';
import Promotion from './backend/models/Promotion.js';

// Configuración de MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/roadmap-manager';

async function checkDatabase() {
  try {
    console.log('🔍 Verificando contenido completo de la base de datos...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Verificar promociones
    const promotions = await Promotion.find({});
    console.log(`📊 Total de promociones: ${promotions.length}`);

    if (promotions.length > 0) {
      console.log('\n📋 Promociones encontradas:');
      promotions.forEach((promo, index) => {
        console.log(`   ${index + 1}. ${promo.name} (ID: ${promo.id})`);
      });
    }

    // Verificar estudiantes
    const students = await Student.find({});
    console.log(`📊 Total de estudiantes: ${students.length}`);

    // Listar todas las colecciones en la base de datos
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📁 Colecciones en la base de datos:');
    for (const collection of collections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      console.log(`   - ${collection.name}: ${count} documentos`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

async function createTestStudent() {
  try {
    console.log('🧪 Creando estudiante de prueba...');
    await mongoose.connect(MONGO_URI);

    // Verificar si hay promociones
    const promotions = await Promotion.find({});
    let promotionId = 'test-promotion';
    
    if (promotions.length > 0) {
      promotionId = promotions[0].id;
      console.log(`🎯 Usando promoción existente: ${promotions[0].name}`);
    }

    const testStudent = new Student({
      id: 'test-student-001',
      name: 'Juan',
      lastname: 'Pérez',
      administrativeSituation: 'permiso_trabajo',
      age: 25,
      email: 'juan.perez@test.com',
      phone: '+34 600 123 456',
      nationality: 'Española',
      dni: '12345678A',
      gender: 'Masculino',
      englishLevel: 'B1',
      educationLevel: 'Universidad',
      profession: 'Desarrollador Junior',
      residenceCommunity: 'Madrid',
      promotionId: promotionId,
      technicalTracking: {
        teacherNotes: [],
        competences: []
      },
      transversalTracking: {
        employabilitySessions: [],
        individualSessions: [],
        incidents: []
      }
    });

    await testStudent.save();
    console.log('✅ Estudiante de prueba creado correctamente');

    // Verificar que se guardó correctamente
    const savedStudent = await Student.findOne({ id: 'test-student-001' });
    console.log(`📋 Verificación - Estudiante encontrado: ${savedStudent.name} ${savedStudent.lastname}`);
    console.log(`   technicalTracking: ${savedStudent.technicalTracking ? 'OK' : 'FALTA'}`);
    console.log(`   transversalTracking: ${savedStudent.transversalTracking ? 'OK' : 'FALTA'}`);

  } catch (error) {
    console.error('❌ Error creando estudiante:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

const action = process.argv[2];

if (action === 'check') {
  checkDatabase().catch(console.error);
} else if (action === 'create') {
  createTestStudent().catch(console.error);
} else {
  console.log('Uso:');
  console.log('  node check-database.js check    # Verificar contenido de BD');
  console.log('  node check-database.js create   # Crear estudiante de prueba');
}
