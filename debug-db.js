import mongoose from 'mongoose';

// Configuración de MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/roadmap-manager';

async function debugDatabase() {
  try {
    console.log('🔍 Debugging conexión a base de datos...');
    console.log(`📡 URI de conexión: ${MONGO_URI}`);
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Obtener info de la base de datos
    const db = mongoose.connection.db;
    const dbName = db.databaseName;
    console.log(`🏛️  Base de datos actual: ${dbName}`);

    // Listar todas las colecciones
    const collections = await db.listCollections().toArray();
    console.log('\n📁 Colecciones disponibles:');
    
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`   - ${collection.name}: ${count} documentos`);
    }

    // Obtener estudiantes con estructura completa
    const studentsCollection = db.collection('students');
    const allStudents = await studentsCollection.find({}).toArray();
    
    console.log('\n👥 Todos los estudiantes en la base de datos:');
    allStudents.forEach((student, index) => {
      console.log(`   ${index + 1}. ${student.name} ${student.lastname} (Email: ${student.email})`);
      console.log(`      ID: ${student.id || student._id}`);
      console.log(`      Promoción: ${student.promotionId}`);
      console.log(`      technicalTracking: ${student.technicalTracking ? 'SÍ' : 'NO'}`);
      console.log(`      transversalTracking: ${student.transversalTracking ? 'SÍ' : 'NO'}`);
      console.log(`      phone: ${student.phone || 'NO'}`);
      console.log(`      administrativeSituation: ${student.administrativeSituation || 'NO'}`);
    });

    // Verificar promociones
    const promotionsCollection = db.collection('promotions');
    const allPromotions = await promotionsCollection.find({}).toArray();
    
    console.log('\n🎓 Todas las promociones:');
    allPromotions.forEach((promo, index) => {
      console.log(`   ${index + 1}. ${promo.name} (ID: ${promo.id})`);
      console.log(`      Fechas: ${promo.startDate} - ${promo.endDate}`);
      console.log(`      Teacher: ${promo.teacherId}`);
    });

    // Buscar específicamente a Mirae Kang
    const mirae = await studentsCollection.findOne({ name: "Mirae" });
    if (mirae) {
      console.log('\n🎯 Estudiante Mirae encontrada:');
      console.log(JSON.stringify(mirae, null, 2));
    } else {
      console.log('\n❌ No se encontró estudiante Mirae en esta base de datos');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

debugDatabase().catch(console.error);
