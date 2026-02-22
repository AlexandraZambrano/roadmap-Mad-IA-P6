// Test script to manually create a student and debug the issue
import mongoose from 'mongoose';
import Student from './backend/models/Student.js';
import 'dotenv/config';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/bootcamp-manager';

async function testStudentCreation() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Test data exactly as it should come from frontend
        const testData = {
            id: `test-${Date.now()}`,
            name: 'Test Name',
            lastname: 'Test Lastname',
            email: `test${Date.now()}@test.com`,
            age: 25,
            nationality: 'Spanish',
            profession: 'Developer',
            address: 'Test Address',
            promotionId: '0e4c169d-3b29-45c9-82b4-76bf956e8d38',
            isManuallyAdded: true,
            notes: ''
        };

        console.log('Creating student with data:', testData);

        const student = await Student.create(testData);

        console.log('Student created successfully!');
        console.log('Created student fields:');
        console.log('  _id:', student._id);
        console.log('  id:', student.id);
        console.log('  name:', student.name);
        console.log('  lastname:', student.lastname);
        console.log('  email:', student.email);
        console.log('  age:', student.age);
        console.log('  nationality:', student.nationality);
        console.log('  profession:', student.profession);
        console.log('  address:', student.address);
        console.log('  promotionId:', student.promotionId);

        // Verify by fetching from database
        console.log('\nVerifying by fresh fetch...');
        const fetchedStudent = await Student.findById(student._id);
        console.log('Fetched student from DB:');
        console.log('  lastname from DB:', fetchedStudent.lastname);
        console.log('  lastname exists:', fetchedStudent.lastname !== undefined);
        console.log('  lastname type:', typeof fetchedStudent.lastname);

        // Show full object
        console.log('\nFull student object:');
        console.log(JSON.stringify(fetchedStudent, null, 2));

        // Clean up - delete the test student
        await Student.findByIdAndDelete(student._id);
        console.log('\nTest student deleted');

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run the test
testStudentCreation();
