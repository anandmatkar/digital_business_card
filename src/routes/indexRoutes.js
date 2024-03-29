const express = require("express");
const controller = require("../controllers/indexController");
const router = express.Router();


router.use('/superAdmin', require('./superAdminRoutes'))
router.use('/companyAdmin', require('./companyAdminRoutes'))


router.get("/card", controller.companyAdminController.card);
router.get("/vcf", controller.companyAdminController.vcf);

module.exports = router;