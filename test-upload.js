// Quick test script for CSV upload API
const fs = require('fs');
const path = require('path');

async function testUpload() {
  const csvPath = path.join(__dirname, '__tests__', 'fixtures', 'sample-badge-scans-50.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const csvBlob = new Blob([csvContent], { type: 'text/csv' });

  const formData = new FormData();
  formData.append('file', csvBlob, 'sample-badge-scans-50.csv');
  formData.append('eventName', 'Test Trade Show');

  try {
    const response = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    console.log('Upload test result:');
    console.log('Status:', response.status);
    console.log('Success:', result.success);
    console.log('Total rows:', result.data?.totalRows);
    console.log('Detected mappings:', JSON.stringify(result.data?.detectedMappings, null, 2));
    console.log('Confidence:', result.data?.confidence);
    console.log('Errors:', result.data?.errors || 'None');

    if (response.ok && result.success) {
      console.log('\n✅ CSV upload test PASSED!');
      return true;
    } else {
      console.log('\n❌ CSV upload test FAILED!');
      console.log('Full response:', JSON.stringify(result, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ Test error:', error);
    return false;
  }
}

testUpload();
