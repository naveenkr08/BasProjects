// get-user-token.js
const axios = require('axios');
const fs = require('fs');

const creds = {
  clientid: 'sb-973e91c7-4f79-4077-8e7f-50070a469ab8!b613742|document-translation-us10!b1112',
  clientsecret: '19a703d1-293c-4a06-b990-73c4ade8d124$3ocJYUDVQ49O2m3bSspV6t7mayGsJ5GUt8RW1UWD-4I=',
  url: 'https://c58cc7detrial.authentication.us10.hana.ondemand.com'
};

async function getUserToken() {
  const res = await axios.post(
    `${creds.url}/oauth/token`,
    new URLSearchParams({
      grant_type: 'password',
      username: 'YOUR_SAP_BTP_EMAIL',      // <-- your BTP trial login email
      password: 'YOUR_SAP_BTP_PASSWORD',    // <-- your BTP trial password
      response_type: 'token'
    }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      auth: {
        username: creds.clientid,
        password: creds.clientsecret
      }
    }
  );

  const tokenData = { ...res.data, fetched_at: Date.now() };
  fs.writeFileSync('.user-token.json', JSON.stringify(tokenData, null, 2));
  console.log('Token saved! Scope:', res.data.scope);
  console.log('Expires in:', res.data.expires_in, 'seconds');
}

getUserToken().catch(console.error);