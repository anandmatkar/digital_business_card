const express = require("express");
const controller = require("../controllers/indexController");
const { verifyTokenForCA } = require("../middleware/authMiddleware");
const { uploadCardProfilePic, uploadCardCoverePic, uploadCompanyLogo, uploadCAAvatar, uploadCardFile } = require("../utils/uploadFiles");
const { uploadCardCoverPicture } = require("../controllers/companyAdminController");
const { validate } = require("../middleware/validation");
const router = express.Router();

/* Auth Section */

router.post("/loginCompanyAdmin", controller.companyAdminController.loginCompanyAdmin);
router.get("/showCAProfile", verifyTokenForCA, controller.companyAdminController.showCAProfile);
router.post("/forgetPassword", controller.companyAdminController.forgetPassword);
router.put("/resetPassword", controller.companyAdminController.resetPassword);

router.put("/changePassword", verifyTokenForCA, controller.companyAdminController.changePassword);
router.put("/editProfile", verifyTokenForCA, controller.companyAdminController.editProfile);
router.post("/uploadAvatar", verifyTokenForCA, uploadCAAvatar.single('image'), controller.companyAdminController.uploadAvatar);

/**==== card section ==== */

router.post("/createCard", verifyTokenForCA, controller.companyAdminController.createCard);
router.get("/cardLists", verifyTokenForCA, controller.companyAdminController.cardLists);
router.get("/cardDetailsForCA", verifyTokenForCA, controller.companyAdminController.cardDetailsForCA);
router.put("/activateSingleCardForQr", verifyTokenForCA, controller.companyAdminController.activateSingleCardForQr);
router.put("/activateMultipleCardsForQR", verifyTokenForCA, controller.companyAdminController.activateMultipleCardsForQR);
router.put("/deactivateCard", verifyTokenForCA, controller.companyAdminController.deactivateCard);
router.put("/deleteCard", verifyTokenForCA, controller.companyAdminController.deleteCard);
router.put("/editCard", verifyTokenForCA, controller.companyAdminController.editCard);
router.post("/uploadCardProfilePicture", verifyTokenForCA, uploadCardProfilePic.single("image"), controller.companyAdminController.uploadCardProfilePicture);
router.post("/uploadCardCoverPicture", verifyTokenForCA, uploadCardCoverePic.single("image"), controller.companyAdminController.uploadCardCoverPicture);
router.post("/uploadCreateCardFile", verifyTokenForCA, uploadCardFile.single('file'), controller.companyAdminController.uploadCreateCardFile);
router.get("/exportCardDetail", controller.companyAdminController.exportCardDetail);

/** == company section== */
router.post("/uploadCompanyLogo", verifyTokenForCA, uploadCompanyLogo.single("image"), controller.companyAdminController.uploadCompanyLogo);
router.post("/editCompanyDetails", verifyTokenForCA, controller.companyAdminController.editCompanyDetails);
router.put("/editSocialMedia", verifyTokenForCA, controller.companyAdminController.editSocialMedia);
router.get("/companyDetails", verifyTokenForCA, controller.companyAdminController.companyDetails);
router.get("/socialMediaDetails", verifyTokenForCA, controller.companyAdminController.socialMediaDetails);
router.get("/qrCodeList", verifyTokenForCA, controller.companyAdminController.qrCodeList);



module.exports = router;
