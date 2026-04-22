// check-translation.js
const fs = require('fs');

const buffer = fs.readFileSync('translated_output.docx');
const content = buffer.toString('utf8');

// Extract all text nodes
const matches = content.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
const text = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');

console.log('Text found in docx:', text || '⚠️ No text found');