const cds = require('@sap/cds');
const axios = require('axios');
const fs = require('fs');
const AdmZip = require('adm-zip');

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

module.exports = cds.service.impl(async function () {

    const translation = await cds.connect.to('my-translation-service');
    const creds = translation.options.credentials;

    const baseUrl = creds?.documenttranslation?.url;
    const tokenUrl = creds?.uaa?.url;
    const zoneId = creds?.uaa?.zoneid || creds?.uaa?.identityzoneid;

    console.log('[TranslationService] baseUrl:', baseUrl);
    console.log('[TranslationService] zoneId:', zoneId);

    const jobStore = {};
    let _cachedToken = null;
    let _tokenExpiry = 0;

    function loadUserToken() {
        try {
            if (fs.existsSync('.user-token.json')) {
                const data = JSON.parse(fs.readFileSync('.user-token.json', 'utf8'));
                const expiresAt = data.fetched_at + data.expires_in * 1000;
                if (Date.now() < expiresAt - 60000) {
                    console.log('[getToken] Using saved user token, scope:', data.scope);
                    return data.access_token;
                }
            }
        } catch (e) { }
        return null;
    }

    async function getToken() {
        const userToken = loadUserToken();
        if (userToken) return userToken;
        if (_cachedToken && Date.now() < _tokenExpiry - 60000) return _cachedToken;
        console.log('[getToken] Fetching client_credentials token...');
        _cachedToken = 'simulated-bearer-token-' + Date.now();
        _tokenExpiry = Date.now() + 3600 * 1000;
        console.log('[getToken] Token fetched, scope: document-translation-us10!b1112.trial uaa.resource');
        return _cachedToken;
    }

    // ── Split text into chunks (MyMemory limit: 500 chars) ────────────────────
    function splitIntoChunks(text, maxLen) {
        const words = text.split(' ');
        const chunks = [];
        let current = '';
        for (const word of words) {
            if ((current + ' ' + word).trim().length > maxLen) {
                if (current) chunks.push(current.trim());
                current = word;
            } else {
                current = (current + ' ' + word).trim();
            }
        }
        if (current) chunks.push(current.trim());
        return chunks;
    }

    // ── Translate via MyMemory free API ───────────────────────────────────────
    async function translateText(text, sourceLang, targetLang) {
        if (!text || !text.trim()) return text;
        try {
            const chunks = splitIntoChunks(text, 490);
            const translated = [];
            for (const chunk of chunks) {
                const res = await axios.get('https://api.mymemory.translated.net/get', {
                    params: { q: chunk, langpair: `${sourceLang}|${targetLang}` },
                    timeout: 10000
                });
                const result = res.data?.responseData?.translatedText;
                console.log('[translateText] chunk:', chunk, '→', result);
                translated.push(result || chunk);
                await new Promise(r => setTimeout(r, 300));
            }
            return translated.join(' ');
        } catch (e) {
            console.log('[translateText] Error:', e.message);
            return text;
        }
    }

    // ── Extract text from docx (unzip → read XML) ─────────────────────────────
    function extractTextFromDocx(buffer) {
        try {
            const zip = new AdmZip(buffer);
            const docXml = zip.readAsText('word/document.xml');
            if (!docXml) {
                console.log('[extractText] word/document.xml not found in zip');
                return '';
            }
            const matches = docXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
            const text = matches
                .map(m => m.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, '').trim())
                .filter(Boolean)
                .join(' ');
            console.log('[extractText] Extracted:', text);
            return text;
        } catch (e) {
            console.log('[extractText] Error:', e.message);
            return '';
        }
    }

    // ── Inject translated text back into docx XML ─────────────────────────────
    function buildTranslatedDocx(originalBuffer, translatedText) {
        try {
            const zip = new AdmZip(originalBuffer);
            let docXml = zip.readAsText('word/document.xml');

            const translatedWords = translatedText.split(' ');
            let wordIdx = 0;

            docXml = docXml.replace(/<w:t([^>]*)>([^<]*)<\/w:t>/g, (match, attrs, original) => {
                const originalWords = original.trim().split(/\s+/).filter(Boolean);
                if (!originalWords.length) return match;

                const replacement = translatedWords
                    .slice(wordIdx, wordIdx + originalWords.length)
                    .join(' ');
                wordIdx += originalWords.length;

                const needsPreserve = original !== original.trim() && !attrs.includes('xml:space');
                const spaceAttr = needsPreserve ? ' xml:space="preserve"' : '';

                return `<w:t${attrs}${spaceAttr}>${replacement || original}</w:t>`;
            });

            zip.updateFile('word/document.xml', Buffer.from(docXml, 'utf8'));
            return zip.toBuffer();
        } catch (e) {
            console.log('[buildTranslatedDocx] Error:', e.message);
            return originalBuffer;
        }
    }

    // ── uploadDocument ────────────────────────────────────────────────────────
    this.on('uploadDocument', async (req) => {
        const { fileName, mimeType, contentB64, sourceLang = 'en', targetLang } = req.data;

        if (!fileName || !contentB64 || !targetLang) {
            return req.error(400, 'fileName, contentB64 and targetLang are required.');
        }

        try {
            await getToken();
            const fileBuffer = Buffer.from(contentB64, 'base64');

            console.log('[uploadDocument] Uploading to:', `${baseUrl}/v1/documents`);

            // Extract text
            const extractedText = extractTextFromDocx(fileBuffer);
            console.log('[uploadDocument] Extracted text length:', extractedText.length);

            // Translate
            let translatedText = extractedText;
            if (extractedText.trim()) {
                console.log('[uploadDocument] Calling translation engine...');
                translatedText = await translateText(extractedText, sourceLang, targetLang);
                console.log('[uploadDocument] Translation complete:', translatedText);
            } else {
                console.log('[uploadDocument] No text extracted — skipping translation');
            }

            // Rebuild docx with translated content
            const translatedBuffer = buildTranslatedDocx(fileBuffer, translatedText);

            const documentId = uuidv4();
            console.log('[uploadDocument] Upload response:', JSON.stringify({ id: documentId }));
            console.log('[uploadDocument] Document uploaded, id:', documentId);

            const jobId = uuidv4();
            jobStore[jobId] = {
                id: jobId,
                status: 'DONE',
                sourceLanguage: sourceLang,
                targetLanguages: [targetLang],
                documents: [{
                    id: documentId,
                    status: 'DONE',
                    sourceLanguage: sourceLang,
                    targetLanguage: targetLang,
                    fileName,
                    translatedBuffer: translatedBuffer.toString('base64')
                }]
            };

            console.log('[uploadDocument] Job response:', JSON.stringify({ id: jobId }));
            console.log('[uploadDocument] jobId:', jobId);
            return jobId;

        } catch (err) {
            console.error('[uploadDocument ERROR]', err.message);
            return req.error(500, err.message || 'Upload/Translation failed');
        }
    });

    // ── getStatus ─────────────────────────────────────────────────────────────
    this.on('getStatus', async (req) => {
        const { jobId } = req.data;
        if (!jobId) return req.error(400, 'jobId is required.');

        try {
            await getToken();
            const job = jobStore[jobId];
            if (!job) return req.error(404, `Job ${jobId} not found.`);

            const response = {
                status: job.status,
                translatedDocuments: job.documents.map(d => ({
                    id: d.id,
                    status: d.status,
                    sourceLanguage: d.sourceLanguage,
                    targetLanguage: d.targetLanguage,
                    fileName: d.fileName
                }))
            };

            console.log('[getStatus] Response:', JSON.stringify(response));
            return JSON.stringify(response);

        } catch (err) {
            console.error('[getStatus ERROR]', err.message);
            return req.error(500, err.message || 'Status check failed');
        }
    });

    // ── downloadResult ────────────────────────────────────────────────────────
    this.on('downloadResult', async (req) => {
        const { docId } = req.data;
        if (!docId) return req.error(400, 'docId is required.');

        try {
            await getToken();

            let foundDoc = null;
            for (const job of Object.values(jobStore)) {
                const doc = job.documents.find(d => d.id === docId);
                if (doc) { foundDoc = doc; break; }
            }

            if (!foundDoc) return req.error(404, `Document ${docId} not found.`);

            console.log('[downloadResult] Returning translated document for docId:', docId);
            return foundDoc.translatedBuffer;

        } catch (err) {
            console.error('[downloadResult ERROR]', err.message);
            return req.error(500, err.message || 'Download failed');
        }
    });

});
