service TranslationService @(path: '/translation') {

    action uploadDocument(
        fileName   : String,
        mimeType   : String,
        contentB64 : String, // Base64-encoded file content
        sourceLang : String default 'en',
        targetLang : String
    ) returns String; 

   
    action getStatus(
        jobId : String
    ) returns String; 

   
    action downloadResult(
        docId : String
    ) returns String; 
}