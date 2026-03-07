import { DeepseekUploader } from './dist/utils/uploader.js';
import { DeepseekAuth } from './dist/utils/auth.js';
import fs from 'fs';
import path from 'path';

async function test() {
  const args = process.argv.slice(2);
  const filePath = args[0] || '/home/safwan/Downloads/Media/Images/hanif.jpg';
  console.log(`Starting OCR test on: ${filePath}`);
  
  const startTime = Date.now();
  
  try {
    const result = await DeepseekUploader.sendData(filePath);
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n--- OCR RESULT ---');
    console.log(result);
    console.log('\n------------------');
    console.log(`\nTotal processing time: ${duration} seconds`);
  } catch (error) {
    console.error('\n--- OCR FAILED ---');
    console.error(error);
  }
}

test();
