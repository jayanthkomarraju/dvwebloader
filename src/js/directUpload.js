import { UploadState } from './utils.js';
import { sleep, getChecksum } from './utils.js';
import { directUploadFinished, uploadFailure } from './fileUpload.js';

export class fileUploadClass {
    constructor(file) {
        this.file = file;
        this.state = UploadState.QUEUED;
        this.send = true;
    }

    async startRequestForDirectUploadUrl() {
        this.state = UploadState.REQUESTING;
        while (window.inDataverseCall === true) {
            await sleep(100);
        }
        window.inDataverseCall = true;
        this.requestDirectUploadUrls();
    }

    async requestDirectUploadUrls() {
        $.ajax({
            url: `${window.siteUrl}/api/datasets/:persistentId/uploadurls?persistentId=${window.datasetPid}&size=${this.file.size}`,
            headers: { "X-Dataverse-key": window.apiKey },
            type: 'GET',
            context: this,
            cache: false,
            dataType: "json",
            processData: false,
            success: function(body) {
                let data = body.data;
                this.storageId = data.storageIdentifier;
                delete data.storageIdentifier;
                this.urls = data;
                window.inDataverseCall = false;
                this.doUpload();
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.log('Failure: ' + jqXHR.status);
                console.log('Failure: ' + errorThrown);
                uploadFailure(jqXHR, this.file);
            }
        });
    }

    async doUpload() {
        this.state = UploadState.UPLOADING;
        var thisFile = window.curFile;
        this.id = thisFile;

        var filerows = $('.ui-fileupload-files .ui-fileupload-row');
        for (let i = 0; i < filerows.length; i++) {
            var upid = filerows[i].getAttribute('upid');
            if (typeof upid === "undefined" || upid === null || upid === '') {
                var newUpId = getUpId();
                filerows[i].setAttribute('upid', newUpId);
            }
        }

        var files = $('.ui-fileupload-files');
        var fileNode = files.find("[upid='" + thisFile + "']");
        window.filesInProgress = window.filesInProgress - 1;
        window.fileList.splice(window.fileList.indexOf(this), 1);
        window.curFile = window.curFile + 1;

        const progBar = fileNode.find('.ui-fileupload-progress');
        const cancelButton = fileNode.find('.ui-fileupload-cancel');
        var cancelled = false;
        cancelButton.click(function() {
            cancelled = true;
        });
        progBar.html('');
        progBar.append($('<progress/>').attr('class', 'ui-progressbar ui-widget ui-widget-content ui-corner-all'));

        if (this.urls.hasOwnProperty("url")) {
            $.ajax({
                url: this.urls.url,
                headers: { "x-amz-tagging": "dv-state=temp" },
                type: 'PUT',
                data: this.file,
                context: this,
                cache: false,
                processData: false,
                success: function() {
                    if (!cancelled) {
                        this.reportUpload();
                    }
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.log('Failure: ' + jqXHR.status);
                    console.log('Failure: ' + errorThrown);
                    uploadFailure(jqXHR, thisFile);
                },
                xhr: function() {
                    var myXhr = $.ajaxSettings.xhr();
                    if (myXhr.upload) {
                        myXhr.upload.addEventListener('progress', function(e) {
                            if (e.lengthComputable) {
                                var doublelength = 2 * e.total;
                                progBar.children('progress').attr({
                                    value: e.loaded,
                                    max: doublelength
                                });
                            }
                        });
                    }
                    return myXhr;
                }
            });
        } else {
            this.uploadMultipart(progBar, cancelled);
        }
    }

    async uploadMultipart(progBar, cancelled) {
        var loaded = [];
        this.etags = [];
        this.numEtags = 0;
        var doublelength = 2 * this.file.size;
        var partSize = this.urls.partSize;
        var started = 0;
        loaded[this.id] = [];
        for (const [key, value] of Object.entries(this.urls.urls)) {
            if (!window.directUploadEnabled || cancelled) {
                while ((started - this.numEtags) > 0) {
                    await sleep(100);
                }
                this.cancelMPUpload();
                directUploadFinished();
                break;
            }
            started = started + 1;
            while ((started - this.numEtags) > 10) {
                await sleep(100);
            }
            if (typeof this.etags[key] === 'undefined' || this.etags[key] === -1) {
                this.etags[key] = -1;
                var size = Math.min(partSize, this.file.size - (key - 1) * partSize);
                var offset = (key - 1) * partSize;
                var blob = this.file.slice(offset, offset + size);
                $.ajax({
                    url: value,
                    type: 'PUT',
                    data: blob,
                    context: this,
                    cache: false,
                    processData: false,
                    success: function(data, status, response) {
                        this.etags[key] = response.getResponseHeader('ETag').replace(/["]+/g, '');
                        this.numEtags = this.numEtags + 1;
                        if (this.numEtags === Object.keys(this.urls.urls).length) {
                            this.multipartComplete();
                        }
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        this.etags[key] = -1;
                        this.numEtags = this.numEtags + 1;
                        if (this.numEtags === Object.keys(this.urls.urls).length) {
                            this.multipartComplete();
                        }
                    },
                    xhr: function() {
                        var myXhr = $.ajaxSettings.xhr();
                        if (myXhr.upload) {
                            myXhr.upload.addEventListener('progress', function(e) {
                                if (e.lengthComputable) {
                                    loaded[this.id][key - 1] = e.loaded;
                                    var total = 0;
                                    for (let val of loaded[this.id].values()) {
                                        if (typeof val !== 'undefined') {
                                            total = total + val;
                                        }
                                    }
                                    progBar.children('progress').attr({
                                        value: total,
                                        max: doublelength
                                    });
                                }
                            });
                        }
                        return myXhr;
                    }
                });
            }
        }
    }

    multipartComplete() {
        var allGood = true;
        for (let val in this.etags.values()) {
            if (val === -1) {
                allGood = false;
                break;
            }
        }
        if (!allGood) {
            if (this.alreadyRetried) {
                uploadFailure(null, this.file.name);
                this.cancelMPUpload();
            } else {
                this.alreadyRetried = true;
                this.doUpload();
            }
        } else {
            this.finishMPUpload();
        }
    }

    reportUpload() {
        this.state = UploadState.UPLOADED;
        if (window.directUploadReport) {
            getChecksum(this.file, prog => {
                var current = 1 + prog;
                $('[upid="' + this.id + '"] progress').attr({
                    value: current,
                    max: 2
                });
            }).then(checksum => {
                this.hashVal = checksum;
                this.handleDirectUpload();
            }).catch(err => console.error(err));
        }
    }

    async cancelMPUpload() {
        $.ajax({
            url: `${window.siteUrl}${this.urls.abort}`,
            headers: { "X-Dataverse-key": window.apiKey },
            type: 'DELETE',
            context: this,
            cache: false,
            processData: false,
            success: function() {
                console.log('Successfully cancelled upload of ' + this.file.name);
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.log('Failure: ' + jqXHR.status);
                console.log('Failure: ' + errorThrown);
            }
        });
    }

    async finishMPUpload() {
        var eTagsObject = {};
        for (var i = 1; i <= this.numEtags; i++) {
            eTagsObject[i] = this.etags[i];
        }
        $.ajax({
            url: `${window.siteUrl}${this.urls.complete}`,
            type: 'PUT',
            headers: { "X-Dataverse-key": window.apiKey },
            context: this,
            data: JSON.stringify(eTagsObject),
            cache: false,
            processData: false,
            success: function() {
                this.reportUpload();
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.log('Failure: ' + jqXHR.status);
                console.log('Failure: ' + errorThrown);
            }
        });
    }

    async handleDirectUpload() {
        this.state = UploadState.HASHED;
        while (window.inDataverseCall === true) {
            await sleep(100);
        }
        window.toRegisterFileList.push(this);
        directUploadFinished();
    }
}
