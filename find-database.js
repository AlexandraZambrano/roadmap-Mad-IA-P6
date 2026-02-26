import mongoose from 'mongoose';

// Posibles URIs de base de datos
const possibleURIs = [
  'mongodb://localhost:27017/roadmap-manager',
  'mongodb://localhost:27017/roadmap_manager',
  'mongodb://localhost:27017/bootcamp-manager', 
  'mongodb://localhost:27017/bootcamp_manager',
  'mongodb://localhost:27017/femcoders',
  'mongodb://localhost:27017/ia-school',
  'mongodb://localhost:27017/factoria-f5'
];

async function findCorrectDatabase() {
  console.log('🔍 Buscando la base de datos correcta...\n');

  for (const uri of possibleURIs) {
    try {
      console.log(`📡 Probando: ${uri}`);
      
      await mongoose.connect(uri);
      const db = mongoose.connection.db;
      
      // Verificar si tiene estudiantes
      const studentsCollection = db.collection('students');
      const studentCount = await studentsCollection.countDocuments();
      
      // Verificar si tiene promociones
      const promotionsCollection = db.collection('promotions');
      const promotionCount = await promotionsCollection.countDocuments();
      
      console.log(`   📊 Estudiantes: ${studentCount}, Promociones: ${promotionCount}`);
      
      if (studentCount > 0 || promotionCount > 0) {
        console.log(`   🎯 ¡Base de datos con contenido encontrada!`);
        
        // Buscar específicamente a Mirae
        const mirae = await studentsCollection.findOne({ name: "Mirae" });
        if (mirae) {
          console.log(`   ✅ ¡Encontrada Mirae Kang en esta base de datos!`);
          console.log(`      Email: ${mirae.email}`);
          console.log(`      Promoción: ${mirae.promotionId}`);
        }
        
        // Mostrar algunas promociones
        if (promotionCount > 0) {
          const promotions = await promotionsCollection.find({}).limit(3).toArray();
          console.log(`   📚 Promociones encontradas:`);
          promotions.forEach(promo => {
            console.log(`      - ${promo.name} (${promo.id})`);
          });
        }
        
        console.log(`\n✅ URI CORRECTA: ${uri}\n`);
        
        await mongoose.connection.close();
        return uri;
      }
      
      await mongoose.connection.close();
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message.substring(0, 100)}...`);
      try {
        await mongoose.connection.close();
      } catch (e) {
        // Ignorar errores de cierre
      }
    }
  }
  
  console.log('\n❌ No se encontró ninguna base de datos con contenido relevante');
  console.log('\n💡 Sugerencias:');
  console.log('   1. Verifica que MongoDB esté ejecutándose');
  console.log('   2. Verifica el nombre de la base de datos');
  console.log('   3. Si usas una conexión remota, proporciona la URI completa');
  
  return null;
}

// También listar todas las bases de datos disponibles
async function listAllDatabases() {
  try {
    console.log('\n🏛️  Listando todas las bases de datos disponibles:');
    
    await mongoose.connect('mongodb://localhost:27017/admin');
    const admin = mongoose.connection.db.admin();
    const databases = await admin.listDatabases();
    
    console.log('\n📋 Bases de datos encontradas:');
    for (const db of databases.databases) {
      console.log(`   - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
      
      // Conectar y verificar contenido
      try {
        await mongoose.connection.close();
        await mongoose.connect(`mongodb://localhost:27017/${db.name}`);
        
        const database = mongoose.connection.db;
        const collections = await database.listCollections().toArray();
        
        for (const collection of collections) {
          if (collection.name === 'students' || collection.name === 'promotions') {
            const count = await database.collection(collection.name).countDocuments();
            if (count > 0) {
              console.log(`     📊 ${collection.name}: ${count} documentos`);
            }
          }
        }
        
      } catch (e) {
        // Ignorar errores
      }
    }
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Error listando bases de datos:', error.message);
  }
}

async function main() {
  const correctURI = await findCorrectDatabase();
  if (!correctURI) {
    await listAllDatabases();
  }
}

main().catch(console.error);
