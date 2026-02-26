import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Configuración de MongoDB - usar la variable de entorno
const MONGO_URI = process.env.MONGO_URI;

async function findAllStudents() {
  try {
    console.log('🔍 Buscando TODOS los estudiantes en la base de datos...');
    console.log(`🔗 Conectando a: ${MONGO_URI ? 'MongoDB Atlas (f5-dash)' : 'MongoDB local'}`);
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Obtener todas las colecciones
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📁 Colecciones encontradas:');
    
    for (const collection of collections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      console.log(`   - ${collection.name}: ${count} documentos`);
      
      // Si la colección parece contener estudiantes, mostrar algunos datos
      if (collection.name.toLowerCase().includes('student') || count > 0) {
        console.log(`   📋 Examinando colección: ${collection.name}`);
        
        // Obtener algunos documentos de muestra
        const sampleDocs = await mongoose.connection.db.collection(collection.name)
          .find({})
          .limit(5)
          .toArray();
          
        sampleDocs.forEach((doc, index) => {
          if (doc.name || doc.email) {
            console.log(`      ${index + 1}. ${doc.name || 'Sin nombre'} ${doc.lastname || ''}`);
            console.log(`         Email: ${doc.email || 'Sin email'}`);
            console.log(`         ID: ${doc.id || 'Sin ID'}`);
            console.log(`         Promoción: ${doc.promotionId || 'Sin promoción'}`);
            console.log(`         technicalTracking: ${doc.technicalTracking ? 'SÍ' : 'NO'}`);
            console.log(`         transversalTracking: ${doc.transversalTracking ? 'SÍ' : 'NO'}`);
            console.log(`         phone: ${doc.phone || 'NO'}`);
            console.log(`         administrativeSituation: ${doc.administrativeSituation || 'NO'}`);
          }
        });
      }
    }

    // Buscar específicamente por "Mirae"
    console.log('\n🔍 Buscando específicamente estudiantes como "Mirae"...');
    
    for (const collection of collections) {
      const miraeResults = await mongoose.connection.db.collection(collection.name)
        .find({
          $or: [
            { name: { $regex: /mirae/i } },
            { lastname: { $regex: /kang/i } },
            { email: { $regex: /mirae/i } }
          ]
        })
        .toArray();
        
      if (miraeResults.length > 0) {
        console.log(`   📋 Encontrado en colección: ${collection.name}`);
        miraeResults.forEach(doc => {
          console.log(`      👤 ${doc.name} ${doc.lastname}`);
          console.log(`         _id: ${doc._id}`);
          console.log(`         Email: ${doc.email}`);
          console.log(`         technicalTracking: ${doc.technicalTracking ? 'EXISTE' : 'FALTA'}`);
          console.log(`         transversalTracking: ${doc.transversalTracking ? 'EXISTE' : 'FALTA'}`);
          console.log(`         Estructura completa:`, Object.keys(doc));
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

findAllStudents().catch(console.error);
