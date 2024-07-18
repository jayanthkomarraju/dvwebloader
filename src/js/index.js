import { initApp } from './uiHandler.js';
import { fetchChecksumAlgorithm, retrieveDatasetInfo } from './apiHandler.js';
import { setupFileInputChange, addIconAndLogo } from './fileHandler.js';

$(document).ready(function() {
   const queryParams = new URLSearchParams(window.location.search.substring(1));
   const siteUrl = queryParams.get("siteUrl");
   console.log(siteUrl);
   addIconAndLogo(siteUrl);
   
   const datasetPid = queryParams.get("datasetPid");
   console.log('PID: ' + datasetPid);
   const apiKey = queryParams.get("key");
   console.log(apiKey);
   const dvLocale = queryParams.get("dvLocale");
   console.log('locale: ' + dvLocale);
   
   initApp(dvLocale);
   fetchChecksumAlgorithm(siteUrl)
       .then(checksumAlgName => {
           setupCryptoJS(checksumAlgName);
           retrieveDatasetInfo(siteUrl, datasetPid, apiKey);
       });
   setupFileInputChange();
});

function setupCryptoJS(checksumAlgName) {
   const head = document.getElementsByTagName('head')[0];
   const js = document.createElement("script");
   js.type = "text/javascript";
   switch (checksumAlgName) {
       case 'MD5':
           js.src = "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.0.0/md5.js";
           break;
       case 'SHA-1':
           js.src = "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.0.0/sha1.js";
           break;
       case 'SHA-256':
           js.src = "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.0.0/sha256.js";
           break;
       case 'SHA-512':
           js.src = "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.0.0/x64-core.js";
           head.appendChild(js);
           const jsSHA512 = document.createElement("script");
           jsSHA512.type = "text/javascript";
           jsSHA512.src = "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.0.0/sha512.js";
           head.appendChild(jsSHA512);
           break;
       default:
           js.src = "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.0.0/md5.js";
   }
   head.appendChild(js);
}