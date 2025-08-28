// Test script to verify backend functionality
const fetch = require('node-fetch');

async function testBackend() {
    const baseUrl = 'http://localhost:3000'; // Change this to your backend URL
    
    try {
        // Test 1: Check if backend is running
        // Testing backend connectivity
        const testResponse = await fetch(`${baseUrl}/test`);
        const testData = await testResponse.json();
        // Test endpoint response received
        
        // Test 2: Test login endpoint with sample data
        // Testing login endpoint
        const loginData = {
            email: 'test@example.com',
            password: 'testpassword123'
        };
        
        // Sending login data
        
        const loginResponse = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(loginData)
        });
        
        const loginResult = await loginResponse.json();
        // Login response received
        
        if (loginResponse.ok) {
            // Login endpoint working
        } else {
            // Login endpoint error
        }
        
    } catch (error) {
        // Test failed
    }
}

// Run the test
testBackend();
