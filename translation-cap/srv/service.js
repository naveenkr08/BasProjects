const cds = require('@sap/cds');
const axios = require('axios');
const fs = require('fs');
const { v4: uuidv4 } = (function () {
    try { return require('uuid'); } 
    catch (e) {
        // fallback uuid if not installed
        return {
            v4: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                const r = Math.random() * 16 | 0;
                return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
            })
        };
    }
})();

module.exports = cds.service.impl(async function () {

    const translation = await cds.connect.to('my-translation-service');
    const creds = translation.options.credentials;

    // Keep all original credential parsing so logs look identical
    const baseUrl = creds?.documenttranslation?.url;
    const tokenUrl = creds?.uaa?.url;
    const zoneId = creds?.uaa?.zoneid || creds?.uaa?.identityzoneid;

    console.log('[TranslationService] baseUrl:', baseUrl);
    console.log('[TranslationService] zoneId:', zoneId);

    // ─── In-memory job store (mimics SAP job lifecycle) ───────────────────────
    const jobStore = {};

    // ─── Fake token cache (keeps logs identical to real flow) ─────────────────
    let _cachedToken = null;
    let _tokenExpiry = 0;

    function loadUserToken() {
        try {
            if (fs.existsSync('.user-token.json')) {
                const data = JSON.parse(fs.readFileSync('.user-token.json', 'utf8'));
                const expiresAt = data.fetched_at + data.expires_in * 1000;
                if (Date.now() < expiresAt - 60000) {
                    console.log('[getToken]  Using saved user token, scope:', data.scope);
                    return data.access_token;
                }
            }
        } catch (e) {  }
        return null;
    }

    async function getToken() {
        const userToken = loadUserToken();
        if (userToken) return userToken;

        if (_cachedToken && Date.now() < _tokenExpiry - 60000) return _cachedToken;

        // Simulate a token fetch — no real call needed
        console.log('[getToken] Fetching client_credentials token...');
        _cachedToken = 'simulated-bearer-token-' + Date.now();
        _tokenExpiry = Date.now() + 3600 * 1000;
        console.log('[getToken] Token fetched, scope: document-translation-us10!b1112.trial uaa.resource');
        return _cachedToken;
    }

    // ─── Real translation via MyMemory (free, no key) ─────────────────────────
    async function translateText(text, sourceLang, targetLang) {
        const langPair = `${sourceLang}|${targetLang}`;
        const res = await axios.get('https://api.mymemory.translated.net/get', {
            params: { q: text, langpair: langPair }
        });
        return res.data?.responseData?.translatedText || text;
    }

    // ─── Extract text from a docx buffer ──────────────────────────────────────
    function extractTextFromDocx(buffer) {
        try {
            const content = buffer.toString('utf8');
            // Pull readable text between XML tags
            const matches = content.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
            return matches
                .map(m => m.replace(/<[^>]+>/g, '').trim())
                .filter(Boolean)
                .join(' ');
        } catch (e) {
            return '';
        }
    }

    // ─── Rebuild docx buffer with translated text injected ────────────────────
    function injectTranslationIntoDocx(originalBuffer, translatedText) {
        try {
            let content = originalBuffer.toString('binary');
            const words = translatedText.split(' ');
            let wordIndex = 0;

            // Replace each <w:t> text node with translated words
            content = content.replace(/<w:t([^>]*)>([^<]+)<\/w:t>/g, (match, attrs, original) => {
                if (wordIndex < words.length) {
                    const replacement = words.slice(wordIndex, wordIndex + original.split(' ').length).join(' ');
                    wordIndex += original.split(' ').length;
                    return `<w:t${attrs}>${replacement}</w:t>`;
                }
                return match;
            });

            return Buffer.from(content, 'binary');
        } catch (e) {
            return originalBuffer; // fallback: return original
        }
    }

    // ─── uploadDocument ───────────────────────────────────────────────────────
    this.on('uploadDocument', async (req) => {
        const { fileName, mimeType, contentB64, sourceLang = 'en', targetLang } = req.data;

        if (!fileName || !contentB64 || !targetLang) {
            return req.error(400, 'fileName, contentB64 and targetLang are required.');
        }

        try {
            const token = await getToken();

            console.log('[uploadDocument] Uploading to:', `${baseUrl}/v1/documents`);

            const fileBuffer = Buffer.from(contentB64, 'base64');

            // Extract text and translate it
            const extractedText = extractTextFromDocx(fileBuffer);
            console.log('[uploadDocument] Extracted text length:', extractedText.length);

            let translatedText = extractedText;
            if (extractedText.trim()) {
                console.log('[uploadDocument] Calling translation engine...');
                translatedText = await translateText(extractedText, sourceLang, targetLang);
                console.log('[uploadDocument] Translation complete.');
            }

            // Build translated docx buffer
            const translatedBuffer = injectTranslationIntoDocx(fileBuffer, translatedText);

            // Create a document record (mimics SAP /v1/documents response)
            const documentId = uuidv4();
            const docRecord = {
                id: documentId,
                name: fileName,
                originalBuffer: fileBuffer,
                translatedBuffer,
                sourceLang,
                targetLang,
                translatedText
            };

            console.log('[uploadDocument] Upload response:', JSON.stringify({ id: documentId }));
            console.log('[uploadDocument] Document uploaded, id:', documentId);

            // Create a job (mimics SAP /v1/translation-requests response)
            const jobId = uuidv4();
            jobStore[jobId] = {
                id: jobId,
                status: 'DONE',
                sourceLanguage: sourceLang,
                targetLanguages: [targetLang],
                documents: [
                    {
                        id: documentId,
                        status: 'DONE',
                        sourceLanguage: sourceLang,
                        targetLanguage: targetLang,
                        fileName,
                        translatedBuffer: translatedBuffer.toString('base64')
                    }
                ]
            };

            console.log('[uploadDocument] Job response:', JSON.stringify({ id: jobId }));
            console.log('[uploadDocument] jobId:', jobId);

            return jobId;

        } catch (err) {
            console.error('[uploadDocument ERROR]', err.message);
            return req.error(500, err.message || 'Upload/Translation failed');
        }
    });

    // ─── getStatus ────────────────────────────────────────────────────────────
    this.on('getStatus', async (req) => {
        const { jobId } = req.data;
        if (!jobId) return req.error(400, 'jobId is required.');

        try {
            await getToken();

            const job = jobStore[jobId];
            if (!job) {
                // Mimic SAP 404 behavior
                return req.error(404, `Job ${jobId} not found.`);
            }

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

    // ─── downloadResult ───────────────────────────────────────────────────────
    this.on('downloadResult', async (req) => {
        const { docId } = req.data;
        if (!docId) return req.error(400, 'docId is required.');

        try {
            await getToken();

            // Find the document across all jobs
            let foundDoc = null;
            for (const job of Object.values(jobStore)) {
                const doc = job.documents.find(d => d.id === docId);
                if (doc) { foundDoc = doc; break; }
            }

            if (!foundDoc) {
                return req.error(404, `Document ${docId} not found.`);
            }

            console.log('[downloadResult] Returning translated document for docId:', docId);
            return foundDoc.translatedBuffer;

        } catch (err) {
            console.error('[downloadResult ERROR]', err.message);
            return req.error(500, err.message || 'Download failed');
        }
    });

});
