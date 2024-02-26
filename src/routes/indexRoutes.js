const express = require("express");
const router = express.Router();

router.use('/superAdmin', require('./superAdminRoutes'))
router.use('/companyAdmin', require('./companyAdminRoutes'))

module.exports = router;