import { getLocalizedString } from './lang.js';

export function initApp(dvLocale) {
    initTranslation(dvLocale);
    addMessage('info', 'msgGettingDatasetInfo', dvLocale);
}

export function initTranslation(dvLocale) {
    initSpanTxt('title-text', 'title', dvLocale);
    initSpanTxt('select-dir-text', 'selectDir', dvLocale);
    initSpanTxt('help-tutorial-text', 'helpTutorial', dvLocale);
    initSpanTxt('sponsor-text', 'sponsor', dvLocale);
}

function initSpanTxt(htmlId, key, dvLocale) {
    $('#' + htmlId).text(getLocalizedString(dvLocale, key));
}

export function addMessage(type, key, dvLocale) {
    $('#messages').html('').append($('<div/>').addClass(type).text(getLocalizedString(dvLocale, key)));
}

export async function populatePageMetadata(data, siteUrl, datasetPid) {
    var mdFields = data.metadataBlocks.citation.fields;
    var title = "";
    var authors = "";
    var datasetUrl = `${siteUrl}/dataset.xhtml?persistentId=${datasetPid}`;
    var version = new URLSearchParams(window.location.search.substring(1)).get("datasetversion");
    if (version === ":draft") {
        version = "DRAFT";
    }

    for (var field in mdFields) {
        if (mdFields[field].typeName === "title") {
            title = mdFields[field].value;
        }
        if (mdFields[field].typeName === "author") {
            var authorFields = mdFields[field].value;
            for (var author in authorFields) {
                if (authors.length > 0) {
                    authors = authors + "; ";
                }
                authors = authors + authorFields[author].authorName.value;
            }
        }
    }
    let mdDiv = $('<div/>').append($('<h2/>').text(getLocalizedString(dvLocale, 'uploadingTo')).append($('<a/>').prop("href", datasetUrl).prop('target', '_blank').text(title)));
    $('#top').prepend(mdDiv);
}

export function removeErrors() {
    var errors = document.getElementsByClassName("ui-fileupload-error");
    for (let i = errors.length - 1; i >= 0; i--) {
        errors[i].parentNode.removeChild(errors[i]);
    }
}

export function setupDirectUploadUI(enabled) {
    if (enabled) {
        $('.ui-fileupload-upload').hide();
        $('.ui-fileupload-cancel').hide();
        var fileInput = document.getElementById('datasetForm:fileUpload_input');
        if (fileInput !== null) {
            fileInput.addEventListener('change', function(event) {
                window.fileList = [];
                for (var i = 0; i < fileInput.files.length; i++) {
                    queueFileForDirectUpload(fileInput.files[i]);
                }
            }, { once: false });
        }
        var fileDropWidget = document.getElementById('datasetForm:fileUpload');
        fileDropWidget.addEventListener('drop', function(event) {
            window.fileList = [];
            for (var i = 0; i < event.dataTransfer.files.length; i++) {
                queueFileForDirectUpload(event.dataTransfer.files[i]);
            }
        }, { once: false });
        var config = { childList: true };
        var callback = function(mutations) {
            mutations.forEach(function(mutation) {
                for (let i = 0; i < mutation.addedNodes.length; i++) {
                    if (mutation.addedNodes[i].id === 'datasetForm:fileUpload_input') {
                        fileInput = mutation.addedNodes[i];
                        mutation.addedNodes[i].addEventListener('change', function(event) {
                            for (var j = 0; j < mutation.addedNodes[i].files.length; j++) {
                                queueFileForDirectUpload(mutation.addedNodes[i].files[j]);
                            }
                        }, { once: false });
                    }
                }
            });
        };
        if (window.observer2 !== null) {
            window.observer2.disconnect();
        }
        window.observer2 = new MutationObserver(callback);
        window.observer2.observe(document.getElementById('datasetForm:fileUpload'), config);
    }
}

export function uploadStarted() {
    removeErrors();
    var curId = 0;
    var files = $('.ui-fileupload-files .ui-fileupload-row');
    for (let i = 0; i < files.length; i++) {
        files[i].setAttribute('upid', curId);
        curId = curId + 1;
    }
    var config = { childList: true };
    var callback = function(mutations) {
        mutations.forEach(function(mutation) {
            for (let i = 0; i < mutation.addedNodes.length; i++) {
                mutation.addedNodes[i].setAttribute('upid', curId);
                curId = curId + 1;
            }
            removeErrors();
        });
    };
    if (window.observer !== null) {
        window.observer.disconnect();
    }
    window.observer = new MutationObserver(callback);
    window.observer.observe(files[0].parentElement, config);
}

export function uploadFinished(fileupload) {
    if (fileupload.files.length === 0) {
        $('button[id$="AllUploadsFinished"]').trigger('click');
        if (window.observer !== null) {
            window.observer.disconnect();
            window.observer = null;
        }
    }
}
