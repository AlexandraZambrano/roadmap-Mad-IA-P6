// Test script for student progress tracking
async function testProgressTracking() {
    try {
        const API_URL = 'http://localhost:3001';
        const promotionId = '0e4c169d-3b29-45c9-82b4-76bf956e8d38';
        
        // Get students list first
        const studentsResponse = await fetch(`${API_URL}/api/promotions/${promotionId}/students`);
        console.log('Students response status:', studentsResponse.status);
        
        if (!studentsResponse.ok) {
            console.log('Failed to get students - probably need authentication');
            return;
        }
        
        const students = await studentsResponse.json();
        console.log('Found students:', students.length);
        
        if (students.length > 0) {
            const firstStudent = students[0];
            console.log('Testing with student:', firstStudent.name, firstStudent.email);
            
            // Test GET student details endpoint
            const studentDetailResponse = await fetch(`${API_URL}/api/promotions/${promotionId}/students/${firstStudent.id}`);
            console.log('Student detail response status:', studentDetailResponse.status);
            
            if (studentDetailResponse.ok) {
                const studentDetail = await studentDetailResponse.json();
                console.log('Student detail:', {
                    name: studentDetail.name,
                    lastname: studentDetail.lastname,
                    progress: studentDetail.progress,
                    notes: studentDetail.notes
                });
            }
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

console.log('Testing student progress tracking...');
testProgressTracking();
