const express = require("express");
const router = express.Router();

router.use('/superAdmin', require('./superAdminRoutes'))

module.exports = router;