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

//company name formattor function
module.exports.formatCompanyName = (companyName) => {
    companyName = companyName.replace(/[^a-zA-Z\s']/g, '');

    const words = companyName.split(' ').map(word => {
        return word.replace(/[^a-zA-Z']/g, '');
    });

    let formattedName = '';

    if (words.length === 1) {
        formattedName = words[0];
    } else if (words.length === 2) {
        formattedName = words.join('');
    } else {
        formattedName = words.map(word => {
            const firstLetter = word.charAt(0).toUpperCase();
            return firstLetter;
        }).join('');
    }

    return formattedName;
}

module.exports.generateVCard = (data) => {
    let vCardString = `BEGIN:VCARD\nVERSION:3.0\n`;
    vCardString += `FN:${data.first_name} ${data.last_name}\n`;
    vCardString += `EMAIL;TYPE=INTERNET:${data.user_email}\n`;
    vCardString += `TEL;TYPE=WORK,VOICE:${data.contact_number}\n`;
    vCardString += `TITLE:${data.designation}\n`;
    vCardString += `ORG:${data.company_name};${data.department || ''}\n`; // assuming department is available
    // Add more fields if needed
    vCardString += `END:VCARD`;
    return vCardString;
};
