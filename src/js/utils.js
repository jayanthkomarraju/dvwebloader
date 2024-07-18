export const UploadState = {
    QUEUED: 'queued',
    REQUESTING: 'requesting',
    UPLOADING: 'uploading',
    UPLOADED: 'uploaded',
    HASHED: 'hashed',
    FINISHED: 'finished',
    FAILED: 'failed'
};

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const getUpId = (function() {
    let counter = -1;
    return function() {
        counter += 1;
        return counter;
    };
})();

export const finishFile = (function() {
    let counter = 0;
    return function() {
        counter += 1;
        return counter;
    };
})();

export async function getChecksum(blob, cbProgress) {
    return new Promise((resolve, reject) => {
        let checksumAlg;
        switch (window.checksumAlgName) {
            case 'MD5':
                checksumAlg = CryptoJS.algo.MD5.create();
                break;
            case 'SHA-1':
                checksumAlg = CryptoJS.algo.SHA1.create();
                break;
            case 'SHA-256':
                checksumAlg = CryptoJS.algo.SHA256.create();
                break;
            case 'SHA-512':
                checksumAlg = CryptoJS.algo.SHA512.create();
                break;
            default:
                console.log(`${window.checksumAlgName} is not supported, using MD5 as the checksum algorithm`);
                checksumAlg = CryptoJS.algo.MD5.create();
        }
        readChunked(blob, (chunk, offs, total) => {
            checksumAlg.update(CryptoJS.enc.Latin1.parse(chunk));
            if (cbProgress) {
                cbProgress(offs / total);
            }
        }, err => {
            if (err) {
                reject(err);
            } else {
                let hash = checksumAlg.finalize();
                let hashHex = hash.toString(CryptoJS.enc.Hex);
                resolve(hashHex);
            }
        });
    });
}

function readChunked(file, chunkCallback, endCallback) {
    let fileSize = file.size;
    let chunkSize = 64 * 1024 * 1024; // 64MB
    let offset = 0;
    let reader = new FileReader();
    reader.onload = function() {
        if (reader.error) {
            endCallback(reader.error || {});
            return;
        }
        offset += reader.result.length;
        chunkCallback(reader.result, offset, fileSize);
        if (offset >= fileSize) {
            endCallback(null);
            return;
        }
        readNext();
    };
    reader.onerror = function(err) {
        endCallback(err || {});
    };
    function readNext() {
        let fileSlice = file.slice(offset, offset + chunkSize);
        reader.readAsBinaryString(fileSlice);
    }
    readNext();
}
