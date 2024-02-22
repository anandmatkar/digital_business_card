const express = require("express");
const controller = require("../controllers/indexController");
const router = express.Router();

router.get('/isSupReg', controller.superAdminController.isSupReg)

module.exports = router