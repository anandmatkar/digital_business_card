const express = require("express");
const controller = require("../controllers/indexController");
const { verifyTokenForSA } = require("../middleware/authMiddleware");
const router = express.Router();

router.get('/isSupReg', controller.superAdminController.isSupReg)
router.post('/registerSuperAdmin', controller.superAdminController.registerSuperAdmin)
router.post('/loginSuperAdmin', controller.superAdminController.loginSuperAdmin)
router.get('/showSAProfile', verifyTokenForSA, controller.superAdminController.showSAProfile)

module.exports = router