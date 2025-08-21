// Test script to verify backend functionality
const fetch = require('node-fetch');

async function testBackend() {
    const baseUrl = 'http://localhost:3000'; // Change this to your backend URL
    
    try {
        // Test 1: Check if backend is running
        console.log('🧪 Testing backend connectivity...');
        const testResponse = await fetch(`${baseUrl}/test`);
        const testData = await testResponse.json();
        console.log('✅ Test endpoint response:', testData);
        
        // Test 2: Test login endpoint with sample data
        console.log('\n🧪 Testing login endpoint...');
        const loginData = {
            email: 'test@example.com',
            password: 'testpassword123'
        };
        
        console.log('📤 Sending login data:', loginData);
        
        const loginResponse = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(loginData)
        });
        
        const loginResult = await loginResponse.json();
        console.log('📡 Login response status:', loginResponse.status);
        console.log('📦 Login response body:', loginResult);
        
        if (loginResponse.ok) {
            console.log('✅ Login endpoint working!');
        } else {
            console.log('❌ Login endpoint error:', loginResult);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testBackend();
