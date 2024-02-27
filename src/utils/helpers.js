const qr = require('qrcode');
const path = require('path');
const { promisify } = require('util');

module.exports.mysql_real_escape_string = (str) => {
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
        switch (char) {
            case "\0":
                return "\\0";
            case "\x08":
                return "\\b";
            case "\x09":
                return "\\t";
            case "\x1a":
                return "\\z";
            case "\n":
                return " ";
            case "\r":
                return "\\r";
            case "\"":
                return "\"" + char;
            case "'":
                return "'" + char;
            case "\\":
                return "'" + char;
            case "%":
                return "\%";
        }
    })
}

module.exports.isValidUUID = (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

const qrToFileAsync = promisify(qr.toFile);

module.exports.generateQRCode = async (url, directoryPath, fileName) => {
    try {
        await qrToFileAsync(path.join(directoryPath, fileName), url);
        console.log('QR code generated successfully');
        return true;
    } catch (err) {
        console.error('Error generating QR code:', err);
        return false;
    }
}