const multer = require('multer')
const path = require('path')

const storage1 = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/cardProfilePic')
    },
    filename: function (req, file, cb) {
        const ext = file.mimetype.split('/')[1];
        const originalName = file.originalname.replace(/\s+/g, '-');
        const fileName = `${originalName}${Date.now()}.${ext}`
        cb(null, fileName)
    }
})
const uploadCardProfilePic = multer({
    storage: storage1
})

const storage2 = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/cardCoverPic')
    },
    filename: function (req, file, cb) {
        const ext = file.mimetype.split('/')[1];
        const originalName = file.originalname.replace(/\s+/g, '-'); // Replace spaces with hyphens
        const fileName = `${originalName}${Date.now()}.${ext}`;
        cb(null, fileName);
    }
})
const uploadCardCoverePic = multer({
    storage: storage2
})

const storage3 = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/companyLogo')
    },
    filename: function (req, file, cb) {
        const ext = file.mimetype.split('/')[1];
        const originalName = file.originalname.replace(/\s+/g, '-');
        const fileName = `${originalName}${Date.now()}.${ext}`
        cb(null, fileName)
    }
})
const uploadCompanyLogo = multer({
    storage: storage3
})

const storage4 = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/avatar')
    },
    filename: function (req, file, cb) {
        const ext = file.mimetype.split('/')[1];
        const originalName = file.originalname.replace(/\s+/g, '-');
        const fileName = `${originalName}${Date.now()}.${ext}`
        cb(null, fileName)
    }
})
const uploadCAAvatar = multer({
    storage: storage4
})

const storage5 = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/superadminAvatar')
    },
    filename: function (req, file, cb) {
        const ext = file.mimetype.split('/')[1];
        const originalName = file.originalname.replace(/\s+/g, '-');
        const fileName = `${originalName}${Date.now()}.${ext}`
        cb(null, fileName)
    }
})
const uploadSAAvatar = multer({
    storage: storage5
})

const storage6 = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/createCardFiles')
    },
    filename: function (req, file, cb) {
        const ext = file.mimetype.split('/')[1];
        const originalName = file.originalname.replace(/\s+/g, '-');
        const fileName = `${originalName}${Date.now()}.${ext}`
        cb(null, fileName)
    }
})
const uploadCardFile = multer({
    storage: storage6
})

module.exports = {
    uploadCardProfilePic,
    uploadCardCoverePic,
    uploadCompanyLogo,
    uploadCAAvatar,
    uploadSAAvatar,
    uploadCardFile
}