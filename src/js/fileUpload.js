import { UploadState, fileUploadClass } from './directUpload.js';
import { sleep, getUpId, finishFile } from './utils.js';
import { addMessage } from './uiHandler.js';

let fileList = [];
let rawFileMap = {};
let toRegisterFileList = [];
let filesInProgress = 0;
let curFile = 0;
let directUploadEnabled = false;
let directUploadReport = true;
let numDone = 0;
let inDataverseCall = false;

export function setupFileUpload(dvLocale) {
    $('#files').prop('disabled', false);
    addMessage('info', 'msgReadyToStart', dvLocale);
}

export function startUploads() {
    $('#top button').remove();
    let checked = $('#filelist>.ui-fileupload-files input:checked');
    checked.each(function() {
        console.log('Name ' + $(this).siblings('.ui-fileupload-filename').text());
        let file = rawFileMap[$(this).siblings('.ui-fileupload-filename').text()];
        let fUpload = new fileUploadClass(file);
        fileList.push(fUpload);
    });
    if (filesInProgress < 4 && fileList.length !== 0) {
        for (let j = 0; j < Math.min(4, fileList.length); j++) {
            filesInProgress = filesInProgress + 1;
            fileList[j].startRequestForDirectUploadUrl();
        }
    }
}

export async function uploadFailure(jqXHR, upid, filename) {
    if (directUploadEnabled) {
        await sleep(100);
    }
    inDataverseCall = false;
    let status = 0;
    let statusText = null;
    let name = null;
    let id = null;
    if (jqXHR === null) {
        status = 1;
        statusText = 'Aborting';
    } else if (typeof jqXHR !== 'undefined') {
        status = jqXHR.status;
        statusText = jqXHR.statusText;
        id = upid;
        name = filename;
    } else {
        try {
            name = arguments.callee.caller.caller.arguments[1].files[0].name;
            id = arguments.callee.caller.caller.arguments[1].files[0].row[0].attributes.upid.value;
            status = arguments.callee.caller.caller.arguments[1].jqXHR.status;
            statusText = arguments.callee.caller.caller.arguments[1].jqXHR.statusText;
        } catch (err) {
            console.log("Unable to determine status for error - assuming network issue");
            console.log("Exception: " + err.message);
        }
    }
    if (status === 0) statusText = 'Network Error';
    console.log('Upload error:' + name + ' upid=' + id + ', Error ' + status + ': ' + statusText);
    var rows = $('.ui-fileupload-files .ui-fileupload-row');
    var node = document.createElement("TD");
    node.classList.add('ui-fileupload-error');
    node.classList.add('ui-message-error');
    var textnode = document.createTextNode("Upload unsuccessful (" + status + ": " + statusText + ").");
    node.appendChild(textnode);
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].getAttribute('upid') === id) {
            var err = rows[i].getElementsByClassName('ui-fileupload-error');
            if (err.length !== 0) {
                err[0].remove();
            }
            rows[i].appendChild(node);
            break;
        }
    }
    if (directUploadEnabled) {
        directUploadFinished();
    }
}

async function directUploadFinished() {
    numDone = finishFile();
    var total = curFile;
    var inProgress = filesInProgress;
    var inList = fileList.length;
    console.log(inList + ' : ' + numDone + ' : ' + total + ' : ' + inProgress);
    if (directUploadEnabled) {
        if (inList === 0) {
            if (total === numDone) {
                console.log("All files in S3");
                addMessage('info', 'msgUploadCompleteRegistering');
                let body = [];
                for (let i = 0; i < toRegisterFileList.length; i++) {
                    let fup = toRegisterFileList[i];
                    console.log(fup.file.webkitRelativePath + ' : ' + fup.storageId);
                    let entry = {};
                    entry.storageIdentifier = fup.storageId;
                    entry.fileName = fup.file.name;
                    let path = fup.file.webkitRelativePath;
                    console.log(path);
                    path = path.substring(path.indexOf('/'), path.lastIndexOf('/'));
                    if (path.length !== 0) {
                        entry.directoryLabel = path;
                    }
                    entry.checksum = {};
                    entry.checksum['@type'] = checksumAlgName;
                    entry.checksum['@value'] = fup.hashVal;
                    entry.mimeType = fup.file.type;
                    if (entry.mimeType == '') {
                        entry.mimeType = 'application/octet-stream';
                    }
                    body.push(entry);
                }
                console.log(JSON.stringify(body));
                let fd = new FormData();
                fd.append('jsonData', JSON.stringify(body));
                $.ajax({
                    url: siteUrl + '/api/datasets/:persistentId/addFiles?persistentId=' + datasetPid,
                    headers: { "X-Dataverse-key": apiKey },
                    type: 'POST',
                    enctype: 'multipart/form-data',
                    contentType: false,
                    context: this,
                    cache: false,
                    data: fd,
                    processData: false,
                    success: function(body, statusText, jqXHR) {
                        console.log("All files sent to " + siteUrl + '/dataset.xhtml?persistentId=doi:' + datasetPid + '&version=DRAFT');
                        addMessage('success', 'msgUploadComplete');
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        console.log('Failure: ' + jqXHR.status);
                        console.log('Failure: ' + errorThrown);
                    }
                });
                if (observer !== null) {
                    observer.disconnect();
                    observer = null;
                }
            }
        } else {
            if ((inProgress < 4) && (inProgress < inList)) {
                filesInProgress = filesInProgress + 1;
                for (let i = 0; i < fileList.length; i++) {
                    if (fileList[i].state === UploadState.QUEUED) {
                        fileList[i].startRequestForDirectUploadUrl();
                        break;
                    }
                }
            }
        }
    }
    await sleep(100);
    inDataverseCall = false;
}
