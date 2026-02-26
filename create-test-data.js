import mongoose from 'mongoose';
import Student from './backend/models/Student.js';
import Promotion from './backend/models/Promotion.js';

// Configuración de MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/roadmap-manager';

async function createTestData() {
  try {
    console.log('🧪 Creando datos de prueba...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // 1. Crear promoción de prueba
    const testPromotion = new Promotion({
      id: 'promo-test-2024',
      name: 'Promoción Test 2024',
      description: 'Promoción de prueba para testing',
      startDate: '2024-01-15',
      endDate: '2024-07-15',
      weeks: 24,
      teacherId: 'teacher-test-001',
      modules: [
        {
          id: 'module-1',
          name: 'Fundamentos Web',
          duration: 4,
          courses: [
            {
              name: 'HTML/CSS',
              url: 'https://example.com/html-css',
              duration: 2,
              startOffset: 0
            },
            {
              name: 'JavaScript',
              url: 'https://example.com/javascript',
              duration: 2,
              startOffset: 2
            }
          ],
          projects: [
            {
              name: 'Landing Page',
              url: 'https://github.com/test/landing-page',
              duration: 1,
              startOffset: 3
            }
          ]
        },
        {
          id: 'module-2',
          name: 'Frontend con React',
          duration: 6,
          courses: [
            {
              name: 'React Básico',
              url: 'https://example.com/react-basic',
              duration: 3,
              startOffset: 4
            },
            {
              name: 'React Avanzado',
              url: 'https://example.com/react-advanced',
              duration: 3,
              startOffset: 7
            }
          ],
          projects: [
            {
              name: 'Aplicación React',
              url: 'https://github.com/test/react-app',
              duration: 2,
              startOffset: 8
            }
          ]
        }
      ],
      employability: [
        {
          name: 'CV y LinkedIn',
          url: 'https://example.com/cv-linkedin',
          startMonth: 1,
          duration: 1
        },
        {
          name: 'Entrevistas técnicas',
          url: 'https://example.com/entrevistas',
          startMonth: 3,
          duration: 1
        },
        {
          name: 'Portfolio personal',
          url: 'https://example.com/portfolio',
          startMonth: 5,
          duration: 2
        }
      ]
    });

    await testPromotion.save();
    console.log('✅ Promoción de prueba creada');

    // 2. Crear estudiantes de prueba
    const testStudents = [
      {
        id: 'student-001',
        name: 'Ana',
        lastname: 'García López',
        administrativeSituation: 'permiso_trabajo',
        age: 24,
        email: 'ana.garcia@test.com',
        phone: '+34 600 111 111',
        nationality: 'Española',
        dni: '11111111A',
        gender: 'Femenino',
        englishLevel: 'B2',
        educationLevel: 'Universidad',
        profession: 'Diseñadora',
        residenceCommunity: 'Madrid'
      },
      {
        id: 'student-002',
        name: 'Carlos',
        lastname: 'Rodríguez Pérez',
        administrativeSituation: 'no_permiso_trabajo',
        age: 28,
        email: 'carlos.rodriguez@test.com',
        phone: '+34 600 222 222',
        nationality: 'Colombiana',
        dni: '22222222B',
        gender: 'Masculino',
        englishLevel: 'A2',
        educationLevel: 'FP',
        profession: 'Técnico',
        residenceCommunity: 'Madrid'
      },
      {
        id: 'student-003',
        name: 'María',
        lastname: 'Fernández Silva',
        administrativeSituation: 'ciudadano_ue',
        age: 26,
        email: 'maria.fernandez@test.com',
        phone: '+34 600 333 333',
        nationality: 'Italiana',
        dni: '33333333C',
        gender: 'Femenino',
        englishLevel: 'C1',
        educationLevel: 'Universidad',
        profession: 'Marketing',
        residenceCommunity: 'Madrid'
      }
    ];

    let createdStudents = 0;
    for (const studentData of testStudents) {
      const student = new Student({
        ...studentData,
        promotionId: 'promo-test-2024',
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

      await student.save();
      console.log(`✅ Estudiante creado: ${student.name} ${student.lastname}`);
      createdStudents++;
    }

    console.log(`\n🎉 Datos de prueba creados exitosamente:`);
    console.log(`   - 1 promoción: ${testPromotion.name}`);
    console.log(`   - ${createdStudents} estudiantes con estructuras de seguimiento completas`);

    // Verificación
    const totalStudents = await Student.countDocuments({});
    const studentsWithTracking = await Student.countDocuments({
      'technicalTracking': { $exists: true },
      'transversalTracking': { $exists: true }
    });

    console.log(`\n📊 Verificación:`);
    console.log(`   Total estudiantes: ${totalStudents}`);
    console.log(`   Con estructuras de seguimiento: ${studentsWithTracking}`);

  } catch (error) {
    if (error.code === 11000) {
      console.log('ℹ️  Los datos ya existen en la base de datos');
    } else {
      console.error('❌ Error creando datos:', error);
    }
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

createTestData().catch(console.error);
