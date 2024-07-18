import { addMessage, populatePageMetadata } from './uiHandler.js';

export async function fetchChecksumAlgorithm(siteUrl) {
    try {
        const response = await fetch(`${siteUrl}/api/files/fixityAlgorithm`);
        if (!response.ok) {
            console.log("Did not get fixityAlgorithm from Dataverse, using MD5");
            return "MD5";
        }
        const checksumAlgJson = await response.json();
        return checksumAlgJson.data.message || "MD5";
    } catch (error) {
        console.log("Error fetching checksum algorithm, using MD5");
        return "MD5";
    }
}

export async function retrieveDatasetInfo(siteUrl, datasetPid, apiKey) {
    try {
        const response = await fetch(`${siteUrl}/api/datasets/:persistentId/versions/:latest?persistentId=${datasetPid}`, {
            headers: { "X-Dataverse-key": apiKey },
        });
        const body = await response.json();
        const data = body.data;
        console.log(data);
        populatePageMetadata(data, siteUrl, datasetPid);
        if (data.files !== null) {
            window.existingFiles = {};
            window.convertedFileNameMap = {};
            for (let i = 0; i < data.files.length; i++) {
                let entry = data.files[i];
                let df = entry.dataFile;
                let convertedFile = false;
                if (("originalFileFormat" in df) && (df.contentType !== df.originalFileFormat)) {
                    console.log(`The file named ${df.filename} on the server was created by Dataverse's ingest process from an original uploaded file`);
                    convertedFile = true;
                }
                let filepath = df.filename;
                if ('directoryLabel' in entry) {
                    filepath = `${entry.directoryLabel}/${filepath}`;
                }
                console.log(`Storing: ${filepath}`);
                window.existingFiles[filepath] = df.checksum;
                if (convertedFile) {
                    window.convertedFileNameMap[removeExtension(filepath)] = filepath;
                }
            }
        }
        $('#files').prop('disabled', false);
        addMessage('info', 'msgReadyToStart', window.dvLocale);
    } catch (error) {
        console.log('Failure: ' + error);
    }
}

function removeExtension(name) {
    let extIndex = name.indexOf(".");
    let sepIndex = name.indexOf('/');
    if (extIndex > sepIndex) {
        return name.substring(0, extIndex);
    } else {
        return name;
    }
}
