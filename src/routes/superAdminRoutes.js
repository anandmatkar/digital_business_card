const express = require("express");
const controller = require("../controllers/indexController");
const { verifyTokenForSA } = require("../middleware/authMiddleware");
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
router.post('/createCompanyAdmin', verifyTokenForSA, controller.superAdminController.createCompanyAdmin)
router.put('/editCompanyDetails', verifyTokenForSA, controller.superAdminController.editCompanyDetails)
router.put('/deactivateCompanyAndCompanyAdmin', verifyTokenForSA, controller.superAdminController.deactivateCompanyAndCompanyAdmin)

module.exports = router