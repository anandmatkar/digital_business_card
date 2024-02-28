const express = require("express");
const controller = require("../controllers/indexController");
const { verifyTokenForSA } = require("../middleware/authMiddleware");
const { uploadCompanyLogo } = require("../utils/uploadFiles");
const router = express.Router();

/**   Auth Section */

router.get('/isSupReg', controller.superAdminController.isSupReg)
router.post('/registerSuperAdmin', controller.superAdminController.registerSuperAdmin)
router.post('/loginSuperAdmin', controller.superAdminController.loginSuperAdmin)
router.get('/showSAProfile', verifyTokenForSA, controller.superAdminController.showSAProfile)
router.put('/changePassword', verifyTokenForSA, controller.superAdminController.changePassword)

/**   Company and company admin Section */

router.post('/createCompany', verifyTokenForSA, controller.superAdminController.createCompany)
router.get('/companyList', verifyTokenForSA, controller.superAdminController.companyList)
router.get('/companyDetails', verifyTokenForSA, controller.superAdminController.companyDetails)
router.get('/cardListsForSA', verifyTokenForSA, controller.superAdminController.cardListsForSA)
router.post('/createCompanyAdmin', verifyTokenForSA, controller.superAdminController.createCompanyAdmin)
router.put('/editCompanyDetails', verifyTokenForSA, controller.superAdminController.editCompanyDetails)
router.put('/deactivateCompanyAndCompanyAdmin', verifyTokenForSA, controller.superAdminController.deactivateCompanyAndCompanyAdmin)
router.put('/editCompanyAdmin', verifyTokenForSA, controller.superAdminController.editCompanyAdmin)
router.put('/editSAProfile', verifyTokenForSA, controller.superAdminController.editSAProfile)
router.post('/uploadCompanyLogoForSA', verifyTokenForSA, uploadCompanyLogo.single('image'), controller.superAdminController.uploadCompanyLogoForSA)

module.exports = router