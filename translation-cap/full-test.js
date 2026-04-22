const axios = require('axios');
const fs = require('fs');
const AdmZip = require('adm-zip');

const BASE = 'http://localhost:4004/translation';

async function run() {

    // ── Check sample.docx contents first ─────────────────────────────────────
    console.log('=== Checking sample.docx ===');
    const sampleBuffer = fs.readFileSync('sample.docx');
    const sampleZip = new AdmZip(sampleBuffer);
    const sampleXml = sampleZip.readAsText('word/document.xml');
    const sampleMatches = sampleXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    const sampleText = sampleMatches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
    console.log('Text nodes found:', sampleMatches.length);
    console.log('Text inside sample.docx:', sampleText);
    console.log('');

    // ── Step 1: Upload ────────────────────────────────────────────────────────
    const contentB64 = sampleBuffer.toString('base64');
    console.log('File size:', contentB64.length);
    console.log('\n[1] Uploading...');

    const upRes = await axios.post(`${BASE}/uploadDocument`, {
        fileName: 'sample.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        contentB64,
        sourceLang: 'en',
        targetLang: 'de'
    });
    const jobId = upRes.data.value;
    console.log(' jobId:', jobId);

    // ── Step 2: Status ────────────────────────────────────────────────────────
    console.log('\n[2] Getting status...');
    const stRes = await axios.post(`${BASE}/getStatus`, { jobId });
    const parsed = JSON.parse(stRes.data.value);
    console.log(' Status:', parsed.status);
    const docId = parsed.translatedDocuments[0].id;
    console.log(' docId:', docId);

    // ── Step 3: Download ──────────────────────────────────────────────────────
    console.log('\n[3] Downloading...');
    const dlRes = await axios.post(`${BASE}/downloadResult`, { docId });
    const base64 = dlRes.data.value;
    const buffer = Buffer.from(base64, 'base64');
    fs.writeFileSync('translated_output.docx', buffer);
    console.log('✅ Saved translated_output.docx');

    // ── Verify translation ────────────────────────────────────────────────────
    console.log('\n=== Verifying translated_output.docx ===');
    const zip = new AdmZip(buffer);
    const xml = zip.readAsText('word/document.xml');
    const matches = xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    const text = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
    console.log('Translated text:', text);

    if (text === sampleText) {
        console.log('\n❌ Text is SAME as original — translation did not work!');
    } else {
        console.log('\n✅ Text CHANGED — translation worked!');
    }
}

run().catch(err => {
    console.error('❌ Error:', err.response?.data || err.message);
});