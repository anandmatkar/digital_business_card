const superAdminController = require('../controllers/superAdminController');
const companyAdminController = require('./companyAdminController.js');

const controller = {
    superAdminController: superAdminController,
    companyAdminController: companyAdminController
}

module.exports = controller