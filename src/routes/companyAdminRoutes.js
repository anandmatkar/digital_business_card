const express = require("express");
const controller = require("../controllers/indexController");
const { verifyTokenForCA } = require("../middleware/authMiddleware");
const router = express.Router();

/* Auth Section */

router.post("/loginCompanyAdmin", controller.companyAdminController.loginCompanyAdmin
);
router.get("/showCAProfile", verifyTokenForCA, controller.companyAdminController.showCAProfile
);
router.post("/forgetPassword", controller.companyAdminController.forgetPassword
);
router.put("/resetPassword", controller.companyAdminController.resetPassword);

router.put("/changePassword", verifyTokenForCA, controller.companyAdminController.changePassword
);
router.put("/editProfile", verifyTokenForCA, controller.companyAdminController.editProfile
);

/**==== card section ==== */

router.post("/createCard", verifyTokenForCA, controller.companyAdminController.createCard
);
router.get("/cardLists", verifyTokenForCA, controller.companyAdminController.cardLists
);
router.put("/activateSingleCardForQr", verifyTokenForCA, controller.companyAdminController.activateSingleCardForQr
);
router.put("/activateMultipleCardsForQR", verifyTokenForCA, controller.companyAdminController.activateMultipleCardsForQR
);
router.put("/deactivateCard", verifyTokenForCA, controller.companyAdminController.deactivateCard
);

module.exports = router;
