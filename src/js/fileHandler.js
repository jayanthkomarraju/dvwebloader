import { startUploads } from './fileUpload.js';
import { getLocalizedString } from './lang.js';
import { addMessage } from './uiHandler.js';

export function setupFileInputChange() {
    var input = document.getElementById('files');
    input.onchange = function(e) {
        var files = e.target.files;
        for (let i = 0; i < files.length; ++i) {
            let f = files[i];
            queueFileForDirectUpload(f);
            console.debug(files[i].webkitRelativePath);
        }
        let numExists = $('#filelist>.ui-fileupload-files .file-exists').length;
        let totalFiles = Object.keys(window.rawFileMap).length;
        if (totalFiles === numExists) {
            addMessage('info', 'msgFilesAlreadyExist', window.dvLocale);
        } else if (numExists !== 0 && totalFiles > numExists) {
            addMessage('info', 'msgUploadOnlyCheckedFiles', window.dvLocale);
        }
        $('label.button').hide();
    };
}

export function addIconAndLogo(siteUrl) {
    $('head')
        .append($('<link/>').attr('sizes', '180x180').attr('rel', 'apple-touch-icon').attr('href', `${siteUrl}/jakarta.faces.resource/images/fav/apple-touch-icon.png.xhtml`))
        .append($('<link/>').attr('type', 'image/png').attr('sizes', '16x16').attr('rel', 'icon').attr('href', `${siteUrl}/jakarta.faces.resource/images/fav/favicon-16x16.png.xhtml`))
        .append($('<link/>').attr('type', 'image/png').attr('sizes', '32x32').attr('rel', 'icon').attr('href', `${siteUrl}/jakarta.faces.resource/images/fav/favicon-32x32.png.xhtml`))
        .append($('<link/>').attr('color', '#da532c').attr('rel', 'mask-icon').attr('href', `${siteUrl}/jakarta.faces.resource/images/fav/safari-pinned-tab.svg.xhtml`))
        .append($('<meta/>').attr('content', '#da532c').attr('name', 'msapplication-TileColor'))
        .append($('<meta/>').attr('content', '#ffffff').attr('name', 'theme-color'));
    $('#logo').attr('src', `${siteUrl}/logos/preview_logo.svg`).attr('onerror', `handleImageError(this,'${siteUrl}')`);
}

export function queueFileForDirectUpload(file) {
    if (window.fileList.length === 0) { }
    var fUpload = new window.fileUploadClass(file);
    let send = true;
    let path = file.webkitRelativePath.substring(file.webkitRelativePath.indexOf('/') + 1);
    if (path in window.existingFiles) {
        send = false;
    } else if (removeExtension(path) in window.convertedFileNameMap) {
        send = false;
    }
    window.rawFileMap[path] = file;
    if (send) {
        if ($('#upload').length === 0) {
            $('<button/>').prop('id', 'upload').text(getLocalizedString(window.dvLocale, 'startUpload')).addClass('button').click(startUploads).appendTo($('#top'));
        }
    }
    let fileBlock = $('#filelist>.ui-fileupload-files');
    if (fileBlock.length === 0) {
        fileBlock = ($('<div/>').addClass('ui-fileupload-files')).appendTo($('#filelist'));
    }
    let row = ($('<div/>').addClass('ui-fileupload-row').attr('upid', 'file_' + fileBlock.children().length)).appendTo(fileBlock);
    if (!send) {
        row.addClass('file-exists');
    }
    row.append($('<input/>').prop('type', 'checkbox').prop('id', 'file_' + fileBlock.children().length).prop('checked', send))
        .append($('<div/>').addClass('ui-fileupload-filename').text(path))
        .append($('<div/>').text(file.size)).append($('<div/>').addClass('ui-fileupload-progress'))
        .append($('<div/>').addClass('ui-fileupload-cancel'));
    $('#file_' + fileBlock.children().length).click(toggleUpload);
}

function toggleUpload() {
    if ($('.ui-fileupload-row').children('input:checked').length !== 0) {
        if ($('#upload').length === 0) {
            $('<button/>').prop('id', 'upload').text(getLocalizedString(window.dvLocale, 'startUpload')).addClass('button').click(startUploads).insertBefore($('#messages'));
            addMessage('info', 'msgStartUpload', window.dvLocale);
        }
    } else {
        $('#upload').remove();
        addMessage('info', 'msgNoFile', window.dvLocale);
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
