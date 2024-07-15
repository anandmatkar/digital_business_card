const connection = require("../config/database");
const { body, validationResult } = require('express-validator');
const qrImage = require("qr-image");
const {
  issueJWT,
  verifyPassResTokenCA,
} = require("../middleware/authMiddleware");
const {
  generateQRCode,
  isValidUUID,
  formatCompanyName,
  generateVCard,
} = require("../utils/helpers");
const { mysql_real_escape_string } = require("../utils/helpers");
const {
  handleCatchErrors,
  handleSWRError,
  handleResponse,
} = require("../utils/response");
const bcrypt = require("bcrypt");
const randomstring = require("randomstring");
const {
  companyAdminValidation,
  cardValidation,
} = require("../middleware/validation");
const { dbScript, db_sql, db_sql_ca } = require("../utils/dbscript");
const fs = require("fs");
let path = require("path");
const { forgetPassword } = require("../utils/sendMail");
const { unescape, escape } = require("querystring");
const ExcelJS = require('exceljs');

/* Auth Section */

module.exports.loginCompanyAdmin = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return handleResponse(res, 400, false, "Email or Password are required.");
    }

    let errors = await companyAdminValidation.loginCompanyAdminValidation(
      req,
      res
    );

    if (!errors.isEmpty()) {
      const firstError = errors.array()[0].msg;
      return handleResponse(res, 400, false, firstError);
    }

    let s1 = dbScript(db_sql_ca["Q1"], {
      var1: mysql_real_escape_string(email.toLowerCase()),
    });
    let findCompanyAdmin = await connection.query(s1);
    if (findCompanyAdmin.rowCount > 0) {
      if (findCompanyAdmin.rows[0].is_active) {
        let matchPassword = await bcrypt.compare(
          password,
          findCompanyAdmin.rows[0].password
        );
        if (matchPassword) {
          let user = {
            id: findCompanyAdmin.rows[0].id,
            email: findCompanyAdmin.rows[0].email,
            role: "Admin",
          };
          let token = await issueJWT(user);
          findCompanyAdmin.rows[0].token = token;
          delete findCompanyAdmin.rows[0].password;
          return handleResponse(
            res,
            200,
            true,
            "Logged In Successfully",
            findCompanyAdmin.rows[0]
          );
        } else {
          return handleResponse(res, 403, false, "Invalid Credentials");
        }
      } else {
        return handleResponse(
          res,
          400,
          false,
          "Account Deactivated Please Contact Administrator"
        );
      }
    } else {
      return handleResponse(res, 403, false, "Invalid Credentials");
    }
  } catch (error) {
    return handleCatchErrors(res, error);
  }
};

module.exports.showCAProfile = async (req, res) => {
  try {
    let { id } = req.user;
    let s1 = dbScript(db_sql_ca["Q2"], { var1: id });
    let findCompanyAdmin = await connection.query(s1);
    if (findCompanyAdmin.rowCount > 0) {
      return handleResponse(
        res,
        200,
        true,
        "CompanyAdmin Profile Details",
        findCompanyAdmin.rows[0]
      );
    } else {
      return handleResponse(res, 404, false, "Company Admin Not Found");
    }
  } catch (error) {
    return handleCatchErrors(res, error);
  }
};

module.exports.forgetPassword = async (req, res) => {
  try {
    let { email } = req.body;

    if (!email) {
      return handleResponse(res, 400, false, "Email is required.");
    }

    let errors = await companyAdminValidation.forgetPasswordCAValidation(
      req,
      res
    );

    if (!errors.isEmpty()) {
      const firstError = errors.array()[0].msg;
      return handleResponse(res, 400, false, firstError);
    }

    // Check if the email exists in your system
    const s1 = dbScript(db_sql_ca["Q1"], {
      var1: mysql_real_escape_string(email.toLowerCase()),
    });
    const findCompanyAdmin = await connection.query(s1);
    if (findCompanyAdmin.rowCount > 0) {
      if (findCompanyAdmin.rows[0].is_active) {
        let user = {
          id: findCompanyAdmin.rows[0].id,
          email: findCompanyAdmin.rows[0].email,
          role: "Admin",
        };
        const resetToken = await issueJWT(user);
        const link = `${process.env.FORGET_PASSWORD_LINK}/${resetToken}`;
        forgetPassword(
          email.toLowerCase(),
          link,
          findCompanyAdmin.rows[0].first_name
        );

        return handleResponse(
          res,
          200,
          true,
          "Reset Password Link has been sent to the email."
        );
      } else {
        return handleResponse(
          res,
          401,
          false,
          "Account is Deactivated, Please Contact your administrator"
        );
      }
    } else {
      return handleResponse(res, 404, false, "Company Admin Not Found.");
    }
  } catch (error) {
    return handleCatchErrors(res, error);
  }
};

module.exports.resetPassword = async (req, res) => {
  try {
    let { resetToken, password } = req.body;

    if (!resetToken) {
      return handleResponse(
        res,
        400,
        false,
        "Password Reset Token is required."
      );
    }

    let companyAdmin = await verifyPassResTokenCA(req);

    if (!companyAdmin || companyAdmin.role !== "Admin") {
      return handleResponse(res, 401, false, "Invalid or Unauthorized Token");
    }
    if (companyAdmin) {
      let errors = await companyAdminValidation.resetPasswordCAValidation(
        req,
        res
      );

      if (!errors.isEmpty()) {
        const firstError = errors.array()[0].msg;
        return handleResponse(res, 400, false, firstError);
      }
      await connection.query("BEGIN");
      let s1 = dbScript(db_sql_ca["Q3"], { var1: companyAdmin.id });
      let findCompanyAdmin = await connection.query(s1);
      if (findCompanyAdmin.rows[0]) {
        let hashedPassword = await bcrypt.hash(password, 10);
        let s2 = dbScript(db_sql_ca["Q4"], {
          var1: companyAdmin.id,
          var2: hashedPassword,
        });
        let resetPasswordCA = await connection.query(s2);
        if (resetPasswordCA.rowCount > 0) {
          await connection.query("COMMIT");
          handleResponse(
            res,
            200,
            true,
            "Password Reset Successfully",
            resetPasswordCA.rows
          );
        } else {
          await connection.query("ROLLBACK");
          handleSWRError(res);
        }
      } else {
        handleResponse(res, 404, false, "Company Admin Not Found");
      }
    } else {
      handleResponse(res, 404, false, "Reset Password Token is Invalid");
    }
  } catch (error) {
    await connection.query("ROLLBACK");
    return handleCatchErrors(res, error);
  }
};

module.exports.changePassword = async (req, res) => {
  try {
    let { id } = req.user;
    let { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return handleResponse(res, 400, false, "All Fields Required.");
    }

    let errors = await companyAdminValidation.changePasswordCAValidation(
      req,
      res
    );

    if (!errors.isEmpty()) {
      const firstError = errors.array()[0].msg;
      return handleResponse(res, 400, false, firstError);
    }

    await connection.query("BEGIN");

    let s1 = dbScript(db_sql_ca["Q3"], { var1: id });
    let findCompanyAdmin = await connection.query(s1);
    if (findCompanyAdmin.rows[0]) {
      let matchPassword = await bcrypt.compare(
        old_password,
        findCompanyAdmin.rows[0].password
      );
      if (matchPassword) {
        let hashedPassword = await bcrypt.hash(new_password, 10);

        let s2 = dbScript(db_sql_ca["Q4"], { var1: id, var2: hashedPassword });
        let changePasswordCA = await connection.query(s2);
        if (changePasswordCA.rowCount > 0) {
          await connection.query("COMMIT");
          handleResponse(res, 200, true, "Change Password Successfully");
        } else {
          await connection.query("ROLLBACK");
          handleSWRError(res);
        }
      } else {
        handleResponse(res, 403, false, "Incorrect Old Password");
      }
    } else {
      handleResponse(res, 404, false, "Company Admin not found");
    }
  } catch (error) {
    await connection.query("ROLLBACK");
    return handleCatchErrors(res, error);
  }
};

module.exports.editProfile = async (req, res) => {
  try {
    let { id } = req.user;
    let { first_name, last_name, email, phone_number, mobile_number, avatar } =
      req.body;
    if (!first_name || !last_name || !email) {
      return handleResponse(
        res,
        400,
        false,
        "Please Provide First Name and Last Name and Email"
      );
    }

    let errors = await companyAdminValidation.editProfileCAValidation(req, res);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0].msg;
      return handleResponse(res, 400, false, firstError);
    }

    await connection.query("BEGIN");
    let s1 = dbScript(db_sql_ca["Q3"], { var1: id });
    let findCompanyAdmin = await connection.query(s1);
    if (findCompanyAdmin.rowCount > 0) {
      let s2 = dbScript(db_sql_ca["Q5"], {
        var1: id,
        var2: mysql_real_escape_string(first_name),
        var3: mysql_real_escape_string(last_name),
        var4: mysql_real_escape_string(email),
        var5: mysql_real_escape_string(phone_number),
        var6: mysql_real_escape_string(mobile_number),
        var7: mysql_real_escape_string(avatar),
      });
      let updateCAProfile = await connection.query(s2);

      if (updateCAProfile.rowCount > 0) {
        let updatedCADetails = updateCAProfile.rows[0];
        delete updatedCADetails.password;
        await connection.query("COMMIT");
        return handleResponse(
          res,
          200,
          true,
          "Company Admin Profile Updated successfully",
          updatedCADetails
        );
      } else {
        await connection.query("ROLLBACK");
        return handleSWRError(res);
      }
    } else {
      return handleResponse(res, 401, false, "Company Admin Not Found");
    }
  } catch (error) {
    await connection.query("ROLLBACK");
    return handleCatchErrors(res, error);
  }
};

module.exports.uploadAvatar = async (req, res) => {
  try {
    let file = req.file;
    const validExtensions = ["jpg", "jpeg", "png"];
    const fileExtension = file.originalname.split(".").pop().toLowerCase();
    if (!validExtensions.includes(fileExtension)) {
      fs.unlinkSync(file.path);
      return res.status(400).json({
        success: false,
        message: "Only JPG, JPEG, and PNG files are allowed.",
      });
    }

    let path = `${process.env.COMPANY_ADMIN_AVATAR}/${file.filename}`;
    return handleResponse(
      res,
      201,
      true,
      "Avatar uploaded successfully.",
      path
    );
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/** ==== Company ===== */

module.exports.uploadCompanyLogo = async (req, res) => {
  try {
    let file = req.file;
    const validExtensions = ["jpg", "jpeg", "png"];
    const fileExtension = file.originalname.split(".").pop().toLowerCase();
    if (!validExtensions.includes(fileExtension)) {
      fs.unlinkSync(file.path);
      return res.status(400).json({
        success: false,
        message: "Only JPG, JPEG, and PNG files are allowed.",
      });
    }

    let path = `${process.env.COMPANY_LOGO_LINK}/${file.filename}`;
    return handleResponse(
      res,
      201,
      true,
      "Company Logo uploaded successfully.",
      path
    );
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports.editCompanyDetails = async (req, res) => {
  try {
    let { id } = req.user;
    let {
      company_id,
      company_name,
      company_email,
      description,
      company_address,
      company_logo,
      company_website,
      location,
      latitude,
      longitude,
      company_contact_number,
      product_service,
      cover_pic
    } = req.body;

    if (
      !company_id ||
      !company_name ||
      !company_email ||
      !company_contact_number
    ) {
      return handleResponse(res, 400, false, "Please provide all the fields.");
    }

    let isValidCId = isValidUUID(company_id);
    if (!isValidCId) {
      return handleResponse(res, 400, false, "Invalid Company Id");
    }

    let errors = await companyAdminValidation.editCompanyValidation(req, res);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0].msg;
      return handleResponse(res, 400, false, firstError);
    }

    await connection.query("BEGIN");

    let s1 = dbScript(db_sql["Q16"], { var1: id });
    let findCompanyAdmin = await connection.query(s1);
    if (findCompanyAdmin.rowCount > 0) {
      if (findCompanyAdmin.rows[0].id !== company_id) {
        return handleResponse(res, 400, false, "Provide Valid Company Id");
      }
      if (product_service && product_service.trim() !== '') {
        async function handleImage(product_service) {
          const imgRegex = /<img[^>]+src="([^">]+)"/g;
          let counter = 1;

          product_service = product_service.replace(
            imgRegex,
            (match, imagePath) => {
              if (imagePath.startsWith("https://midin.app/uploads/productServiceImage/")) {
                return match;
              } else if (imagePath.startsWith("uploads/productServiceImage/")) {
                return `<img src="https://midin.app/${imagePath}"`;
              } else if (imagePath.startsWith("../../uploads")) {
                const correctedPath = imagePath.replace("../..", "https://midin.app");
                return `<img src="${correctedPath}"`;
              } else if (imagePath.startsWith("data:image")) {
                const [, format, data] = imagePath.match(/^data:image\/(\w+);base64,(.+)$/);

                const filename = Date.now() + "-" + counter++ + "." + format;

                const filePath = path.join(__dirname, "..", "..", "uploads", "productServiceImage", filename);
                fs.writeFileSync(filePath, data, 'base64');

                return `<img src="${process.env.PRODUCT_SERVICE_IMAGE_PATH}/${filename}"`;
              } else {
                return match;
              }
            }
          );

          return product_service;
        }
        product_service = await handleImage(product_service);
      }
      product_service = JSON.stringify(product_service);
      let s2 = `
  UPDATE company 
  SET 
    company_name = $1, 
    company_email = $2,
    description = $3,
    company_address = $4,
    company_logo = $5,
    company_website = $6,
    location = $7,
    latitude = $8,
    longitude = $9,
    company_contact_number = $10,
    product_service = $11,
    cover_pic = $12
  WHERE 
    admin_id = $13 
    AND id = $14
    AND deleted_at IS NULL 
  RETURNING *`;

      let updateCompanyDetails = await connection.query(s2, [
        mysql_real_escape_string(company_name),
        mysql_real_escape_string(company_email.toLowerCase()),
        (description),
        (company_address),
        company_logo,
        company_website,
        location,
        latitude,
        longitude,
        company_contact_number,
        product_service,
        cover_pic,
        id,
        company_id
      ]);
      if (updateCompanyDetails.rowCount > 0) {

        await connection.query("COMMIT");
        updateCompanyDetails.rows[0].product_service = unescape(updateCompanyDetails.rows[0].product_service);
        return handleResponse(res, 200, true, "Company Details Updated Successfully.", updateCompanyDetails.rows);
      } else {
        await connection.query("ROLLBACK");
        return handleSWRError(res);
      }
    } else {
      return handleResponse(res, 401, false, "Admin not found");
    }
  } catch (error) {
    await connection.query("ROLLBACK");
    console.error(error);
    return res.status(500).json({ error: error.stack });
  }
};

module.exports.socialMediaDetails = async (req, res) => {
  try {
    let { id } = req.user;
    let { company_id } = req.query;
    if (!company_id) {
      return handleResponse(res, 400, false, 'Please provide the company ID');
    }
    let s1 = dbScript(db_sql["Q16"], { var1: id });
    let findCompanyAdmin = await connection.query(s1);
    if (findCompanyAdmin.rowCount > 0) {
      if (findCompanyAdmin.rows[0].id !== company_id) {
        return handleResponse(res, 401, false, "You are unauthorized to access this data.");
      }
      let s2 = dbScript(db_sql["Q40"], { var1: company_id });
      let findSocialMediaLinks = await connection.query(s2)
      console.log(findSocialMediaLinks.rows, "11111111111")
      if (findSocialMediaLinks.rowCount > 0) {
        return handleResponse(res, 200, true, "Social Media Details", findSocialMediaLinks.rows);
      } else {
        return handleResponse(res, 200, false, "Empty Social Media Details", []);
      }
    } else {
      return handleResponse(res, 401, false, "Admin not found");
    }
  } catch (error) {
    return handleCatchErrors(res, error);
  }
};

module.exports.companyDetails = async (req, res) => {
  try {
    let { id } = req.user;
    let s1 = dbScript(db_sql["Q16"], { var1: id });
    let findCompanyAdmin = await connection.query(s1);
    if (findCompanyAdmin.rowCount > 0) {
      if (findCompanyAdmin.rows[0].product_service) {
        findCompanyAdmin.rows[0].product_service = unescape(JSON.parse(findCompanyAdmin.rows[0].product_service));
      }
      findCompanyAdmin.rows[0].cover_pic = findCompanyAdmin.rows[0].cover_pic || process.env.DEFAULT_CARD_COVER_PIC;
      return handleResponse(res, 200, true, "Company Details", findCompanyAdmin.rows);
    } else {
      return handleResponse(res, 401, false, "Admin not found");
    }
  } catch (error) {
    return handleCatchErrors(res, error);
  }
};

module.exports.editSocialMedia = async (req, res) => {
  try {
    let { id } = req.user;

    let { company_id, facebook, instagram, linkedin, youtube, xiao_hong_shu, tiktok, we_chat, line, telegram, weibo, twitter, official_website } = req.body;
    await connection.query("BEGIN");

    let s1 = dbScript(db_sql["Q16"], { var1: id });
    let findCompanyAdmin = await connection.query(s1);
    if (findCompanyAdmin.rowCount > 0) {
      if (findCompanyAdmin.rows[0].id !== company_id) {
        return handleResponse(res, 401, false, "You are unauthorized to change this data.");
      }
      let s2 = dbScript(db_sql["Q41"], { var1: facebook, var2: instagram, var3: twitter, var4: youtube, var5: linkedin, var6: xiao_hong_shu, var7: tiktok, var8: we_chat, var9: line, var10: telegram, var11: weibo, var12: company_id, var13: official_website });
      let updateSocialMedia = await connection.query(s2);
      if (updateSocialMedia.rowCount > 0) {
        await connection.query("COMMIT")
        return handleResponse(res, 200, true, "Social Media Updated Successfully", updateSocialMedia.rows);
      } else {
        await connection.query("ROLLBACK");
        return handleSWRError(res);
      }
    } else {
      return handleResponse(res, 401, false, "Admin not found");
    }
  } catch (error) {
    await connection.query("ROLLBACK");
    return handleCatchErrors(res, error);
  }
}

module.exports.addCompanyAddress = async (req, res) => {
  try {
    let { id } = req.user;
    let { company_id, company_name, company_email, description, company_address, company_logo, company_website, location, latitude, longitude, company_contact_number, product_service, cover_pic } = req.body

    await connection.query("BEGIN");

    let s1 = dbScript(db_sql["Q16"], { var1: id });
    let findCompanyAdmin = await connection.query(s1);
    if (findCompanyAdmin.rowCount > 0) {
    } else {
      return handleResponse(res, 401, false, "Admin not found");
    }
  } catch (error) {
    await connection.query("ROLLBACK");
    return handleCatchErrors(res, error);
  }
}

//new feature
module.exports.addCompanyDetails = async (req, res) => {
  try {
    let { id } = req.user;
    let {
      company_name,
      company_email,
      description,
      company_address,
      company_logo,
      company_website,
      location,
      company_contact_number,
      product_service,
      cover_pic
    } = req.body;

    if (
      !company_name ||
      !company_email ||
      !company_contact_number
    ) {
      return handleResponse(res, 400, false, "Please provide all the fields.");
    }

    // let errors = await companyAdminValidation.editCompanyValidation(req, res);
    // if (!errors.isEmpty()) {
    //   const firstError = errors.array()[0].msg;
    //   return handleResponse(res, 400, false, firstError);
    // }

    await connection.query("BEGIN");
    let s0 = dbScript(db_sql["Q16"], { var1: id });
    let findCompanyAdmin = await connection.query(s0);
    if (findCompanyAdmin.rowCount > 0) {
      if (product_service && product_service.trim() !== '') {
        async function handleImage(product_service) {
          const imgRegex = /<img[^>]+src="([^">]+)"/g;
          let counter = 1;

          product_service = product_service.replace(
            imgRegex,
            (match, imagePath) => {
              if (imagePath.startsWith("https://midin.app/uploads/productServiceImage/")) {
                return match;
              } else if (imagePath.startsWith("uploads/productServiceImage/")) {
                return `<img src="https://midin.app/${imagePath}"`;
              } else if (imagePath.startsWith("../../uploads")) {
                const correctedPath = imagePath.replace("../..", "https://midin.app");
                return `<img src="${correctedPath}"`;
              } else if (imagePath.startsWith("data:image")) {
                const [, format, data] = imagePath.match(/^data:image\/(\w+);base64,(.+)$/);

                const filename = Date.now() + "-" + counter++ + "." + format;

                const filePath = path.join(__dirname, "..", "..", "uploads", "productServiceImage", filename);
                fs.writeFileSync(filePath, data, 'base64');

                return `<img src="${process.env.PRODUCT_SERVICE_IMAGE_PATH}/${filename}"`;
              } else {
                return match;
              }
            }
          );

          return product_service;
        }
        product_service = await handleImage(product_service);
      }
      product_service = JSON.stringify(product_service);
      console.log(product_service);

      let s1 = `
    INSERT INTO company (
      admin_id,
      company_name,
      company_email,
      description,
      company_address,
      company_logo,
      company_website,
      location,
      company_contact_number,
      product_service,
      cover_pic,
      max_cards,
      used_cards,
      contact_person_name,
      contact_person_designation,
      contact_person_email,
      contact_person_mobile,
      trial_start_date,
      trial_end_date
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`;

      let insertCompanyDetails = await connection.query(s1, [
        id,
        mysql_real_escape_string(company_name),
        mysql_real_escape_string(company_email.toLowerCase()),
        description,
        company_address,
        company_logo,
        company_website,
        location,
        company_contact_number,
        product_service,
        cover_pic,
        findCompanyAdmin?.rows[0]?.max_cards,
        findCompanyAdmin?.rows[0]?.used_cards,
        findCompanyAdmin?.rows[0]?.contact_person_name,
        findCompanyAdmin?.rows[0]?.contact_person_designation,
        findCompanyAdmin?.rows[0]?.contact_person_email,
        findCompanyAdmin?.rows[0]?.contact_person_mobile,
        findCompanyAdmin?.rows[0]?.trial_start_date,
        findCompanyAdmin?.rows[0]?.trial_end_date
      ]);

      if (insertCompanyDetails.rowCount > 0) {
        insertCompanyDetails.rows[0].product_service = unescape(insertCompanyDetails.rows[0].product_service);
        let s3 = dbScript(db_sql["Q18"], { var1: null, var2: null, var3: null, var4: null, var5: null, var6: null, var7: null, var8: null, var9: null, var10: null, var11: null, var12: null, var13: null, var14: null, var15: insertCompanyDetails.rows[0].id });
        let createSocialMedia = await connection.query(s3);
        if (createSocialMedia.rowCount > 0) {
          await connection.query("COMMIT");
          return handleResponse(res, 200, true, "Company Details Inserted Successfully.", insertCompanyDetails.rows);
        } else {
          await connection.query("ROLLBACK");
          return handleSWRError(res);
        }
      } else {
        await connection.query("ROLLBACK");
        return handleSWRError(res);
      }
    } else {
      return handleResponse(res, 401, false, "Admin not found");
    }
  } catch (error) {
    await connection.query("ROLLBACK");
    return handleCatchErrors(res, error);
  }
};

module.exports.getCompanyDetailsLists = async (req, res) => {
  try {
    let { id } = req.user;
    let s0 = dbScript(db_sql["Q16"], { var1: id });
    let findCompanyAdmin = await connection.query(s0);
    if (findCompanyAdmin.rowCount > 0) {
      let s1 = dbScript(db_sql["Q45"], { var1: id });
      let findCompanyDetails = await connection.query(s1);
      if (findCompanyDetails.rowCount > 0) {
        return handleResponse(res, 200, true, "Company Details Found.", findCompanyDetails.rows);
      } else {
        return handleResponse(res, 200, true, "Company Details Not Found.", findCompanyDetails.rows);
      }
    } else {
      return handleResponse(res, 401, false, "Admin not found");
    }
  } catch (error) {
    return handleCatchErrors(res, error);
  }
}

module.exports.setDefaultAddress = async (req, res) => {
  try {
    let { id } = req.user;
    const { company_id } = req.body
    let s0 = dbScript(db_sql["Q16"], { var1: id });
    let findCompanyAdmin = await connection.query(s0);
    if (findCompanyAdmin.rowCount > 0) {
      await connection.query("BEGIN");

      let s1 = dbScript(db_sql["Q46"], { var1: false, var2: id });
      let setRemainingToFalse = await connection.query(s1);
      if (setRemainingToFalse.rowCount > 0) {
        let s2 = dbScript(db_sql["Q47"], { var1: true, var2: company_id, var3: id });
        let setAddressTrue = await connection.query(s2);
        if (setAddressTrue.rowCount > 0) {
          await connection.query("COMMIT");
          return handleResponse(res, 200, true, "Default Address Set Successfully");
        } else {
          await connection.query("ROLLBACK");
          return handleSWRError(res);
        }
      } else {
        await connection.query("ROLLBACK");
        return handleSWRError(res);
      }

    } else {
      return handleResponse(res, 401, false, "Admin not found");
    }
  } catch (error) {
    await connection.query("ROLLBACK");
    return handleCatchErrors(res, error);
  }
}


/** ========card section===== */

module.exports.createCard = async (req, res) => {
  try {
    let { id } = req.user;
    let { first_name, last_name, user_email, designation, bio, cover_pic, profile_picture, contact_number, personal_whatsapp, associated_company
    } = req.body;
    await connection.query("BEGIN");

    let s1 = dbScript(db_sql["Q16"], { var1: id });
    let findCompanyAdmin = await connection.query(s1);
    if (findCompanyAdmin.rowCount > 0) {
      let s0 = dbScript(db_sql["Q34"], {
        var1: mysql_real_escape_string(user_email.toLowerCase()),
      });
      let checkEmailInDC = await connection.query(s0);
      if (checkEmailInDC.rowCount == 0) {
        let usedCards = findCompanyAdmin.rows[0].used_cards;
        let maxCards = findCompanyAdmin.rows[0].max_cards;
        if (usedCards >= maxCards) {
          return handleResponse(
            res,
            400,
            false,
            "Maximum cards limit reached for this company"
          );
        }

        let errors = await cardValidation.createCardVal(req, res);
        if (!errors.isEmpty()) {
          const firstError = errors.array()[0].msg;
          return handleResponse(res, 400, false, firstError);
        }

        let companyName = formatCompanyName(
          findCompanyAdmin.rows[0].company_name
        );
        companyName = companyName.toLowerCase();
        let company_ref = companyName;
        let card_ref = randomstring.generate({
          length: 5,
          charset: "alphanumeric",
        });
        card_ref = card_ref.toLowerCase();
        let qrCodeLink = `${process.env.LINK_INSIDE_QR_CODE}/${companyName}/${card_ref}`;
        let databaseLinkQR = `${process.env.DATABASE_LINK_FOR_QR}/${companyName}/${card_ref}.png`;
        let qrCodeDirectory = path.join(
          __dirname,
          "../../",
          "./uploads",
          "qrCode",
          companyName
        );
        let qrCodeFileName = `${card_ref}.png`;
        let card_link = `${process.env.LINK_OF_DIGITAL_CARD}/${companyName}/${card_ref}`;

        fs.mkdirSync(qrCodeDirectory, { recursive: true });

        // const qrCodeOptions = {
        //   width: 500, // Increase the width of the QR code
        //   height: 500, // Increase the height of the QR code
        //   margin: 2, // You can adjust the margin as needed
        //   color: {
        //     dark: "#000000", // QR code color
        //     light: "#ffffff", // Background color
        //   },
        // };

        // let qrSuccess = await generateQRCode(
        //   qrCodeLink,
        //   qrCodeDirectory,
        //   qrCodeFileName,
        //   qrCodeOptions
        // );

        const qrCodeImage = qrImage.imageSync(qrCodeLink, { type: "png", size: 256 });
        console.log(qrCodeImage.length, "qrsucesss");
        // Save QR code to file
        fs.writeFileSync(path.join(qrCodeDirectory, qrCodeFileName), qrCodeImage, "binary");
        if (qrCodeImage.length > 0) {
          cover_pic = cover_pic ? cover_pic : process.env.DEFAULT_CARD_COVER_PIC;
          profile_picture = profile_picture ? profile_picture : process.env.DEFAULT_USER_PROFILE_PIC;
          let created_by = findCompanyAdmin.rows[0].company_admin_data[0].company_admin_id;

          async function handleImage(bio) {
            const imgRegex = /<img[^>]+src="([^">]+)"/g;
            let counter = 1;
            bio = bio.replace(
              imgRegex,
              (match, imagePath) => {
                if (imagePath.startsWith("https://midin.app/uploads/bioImages")) {
                  return match;
                } else {
                  const [, format, data] = imagePath.match(/^data:image\/(\w+);base64,(.+)$/);

                  const filename = Date.now() + "-" + counter++ + "." + format;

                  const filePath = path.join(__dirname, "..", "..", "uploads", "bioImages", filename);
                  fs.writeFileSync(filePath, data, 'base64');

                  return `<img src="${process.env.BIO_IMAGE_PATH}/${filename}"`;
                }
              }
            );
            return bio;
          }
          if (bio !== undefined && bio !== null && bio !== "") {
            bio = await handleImage(bio);
            bio = JSON.stringify(bio)
          }
          let s2 = `
          INSERT INTO digital_cards 
            (company_id, created_by, card_reference, first_name, last_name, user_email, designation, bio, qr_url, user_type, cover_pic, profile_picture, card_url, vcf_card_url, company_ref, contact_number,personal_whatsapp,associated_company) 
          VALUES 
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,$18) 
          RETURNING *`;

          let insertData = await connection.query(s2, [findCompanyAdmin.rows[0].id, created_by, card_ref, first_name, last_name, user_email.toLowerCase(), designation, bio ? bio : null, databaseLinkQR, "user", cover_pic, profile_picture, card_link, null, company_ref, contact_number, personal_whatsapp, associated_company]);

          if (insertData.rowCount > 0) {
            let s4 = dbScript(db_sql["Q48"], {
              var1: Number(usedCards) + 1,
              var2: id,
            });
            let updateCardCount = await connection.query(s4);
            if (updateCardCount.rowCount > 0) {
              await connection.query("COMMIT");
              return handleResponse(res, 201, true, "Card Created Successfully", insertData.rows);
            } else {
              await connection.query("ROLLBACK");
              return handleSWRError(res);
            }
          } else {
            await connection.query("ROLLBACK");
            return handleSWRError(res);
          }
        } else {
          await connection.query("ROLLBACK");
          return handleSWRError(res);
        }
      } else {
        return handleResponse(res, 409, false, "Email Already Exists");
      }
    } else {
      return handleResponse(res, 401, false, "Admin not found");
    }
  } catch (error) {
    await connection.query("ROLLBACK");
    return handleCatchErrors(res, error);
  }
};

module.exports.cardLists = async (req, res) => {
  try {
    let { id } = req.user;
    let s1 = dbScript(db_sql["Q16"], { var1: id });
    let findCompanyAdmin = await connection.query(s1);
    if (findCompanyAdmin.rowCount > 0) {
      let s2 = dbScript(db_sql["Q23"], { var1: id });
      let cards = await connection.query(s2);
      if (cards.rowCount > 0) {
        return handleResponse(res, 200, true, "Cards Lists", cards.rows);
      } else {
        return handleResponse(res, 200, false, "Empty Cards Lists", []);
      }
    } else {
      return handleResponse(res, 401, false, "Admin not found");
    }
  } catch (error) {
    return handleCatchErrors(res, error);
  }
};
//card details for admin
// module.exports.cardDetailsForCA = async (req, res) => {
//   try {
//     let { id } = req.user;
//     let { card_id } = req.query;
//     if (!card_id) {
//       return handleResponse(res, 400, false, "Provide Valid Card Id ");
//     }
//     let s1 = dbScript(db_sql["Q16"], { var1: id });
//     let findCompanyAdmin = await connection.query(s1);
//     if (findCompanyAdmin.rowCount > 0) {
//       let s1 = dbScript(db_sql["Q31"], { var1: card_id, var2: false });
//       let findCardDetails = await connection.query(s1);
//       if (findCardDetails.rowCount > 0) {
//         if (findCardDetails.rows[0].bio) {
//           findCardDetails.rows[0].bio = (JSON.parse(findCardDetails.rows[0].bio))

//         }
//         if (findCardDetails.rows[0].is_active_for_qr) {
//           return handleResponse(
//             res,
//             200,
//             true,
//             "Card Details",
//             findCardDetails.rows[0]
//           );
//         } else {
//           delete findCardDetails.rows[0].qr_url;
//           return handleResponse(
//             res,
//             200,
//             true,
//             "Card Details",
//             findCardDetails.rows[0]
//           );
//         }
//       } else {
//         return handleResponse(res, 404, false, "No cards Found");
//       }
//     } else {
//       return handleResponse(res, 401, false, "Admin not found");
//     }
//   } catch (error) {
//     return handleCatchErrors(res, error);
//   }
// };

module.exports.cardDetailsForCA = async (req, res) => {
  try {
    let { id } = req.user;
    let { card_id } = req.query;
    if (!card_id) {
      return handleResponse(res, 400, false, "Provide Valid Card Id ");
    }
    let s1 = dbScript(db_sql["Q16"], { var1: id });
    let findCompanyAdmin = await connection.query(s1);
    if (findCompanyAdmin.rowCount > 0) {
      let s1 = dbScript(db_sql["Q31"], { var1: card_id, var2: false });
      let findCardDetails = await connection.query(s1);
      if (findCardDetails.rowCount > 0) {
        if (findCardDetails.rows[0].bio) {
          // Add https://midin.app/ to image URLs starting with '/uploads/bioImages' or '../../uploads/bioImages' only if not already starting with 'https://midin.app/'
          findCardDetails.rows[0].bio = findCardDetails.rows[0].bio.replace(/(?<!https:\/\/midin\.app\/)(?:\.\.\/)*uploads\/bioImages\/[^"]+/g, 'https://midin.app/$&');
          // Decode HTML entities
          findCardDetails.rows[0].bio = (JSON.parse(findCardDetails.rows[0].bio));
        }
        if (findCardDetails.rows[0].is_active_for_qr) {
          return handleResponse(
            res,
            200,
            true,
            "Card Details",
            findCardDetails.rows[0]
          );
        } else {
          delete findCardDetails.rows[0].qr_url;
          return handleResponse(
            res,
            200,
            true,
            "Card Details",
            findCardDetails.rows[0]
          );
        }
      } else {
        return handleResponse(res, 404, false, "No cards Found");
      }
    } else {
      return handleResponse(res, 401, false, "Admin not found");
    }
  } catch (error) {
    return handleCatchErrors(res, error);
  }
};

module.exports.activateSingleCardForQr = async (req, res) => {
  try {
    let { id } = req.user;
    let { card_id } = req.query;
    if (!card_id) {
      return handleResponse(res, 400, false, "Provide Valid Card Id");
    }
    await connection.query("BEGIN");
    let s1 = dbScript(db_sql["Q16"], { var1: id });
    let findCompanyAdmin = await connection.query(s1);
    if (findCompanyAdmin.rowCount > 0) {
      let s2 = dbScript(db_sql["Q21"], { var1: true, var2: card_id });
      let activate = await connection.query(s2);
      if (activate.rowCount > 0) {
        await connection.query("COMMIT");
        return handleResponse(res, 200, true, "Card Activated Successfully");
      } else {
        await connection.query("ROLLBACK");
        return handleSWRError(res);
      }
    } else {
      return handleResponse(res, 401, false, "Admin not found");
    }
  } catch (error) {
    await connection.query("ROLLBACK");
    return handleCatchErrors(res, error);
  }
};

module.exports.activateMultipleCardsForQR = async (req, res) => {
  try {
    let { id } = req.user;
    let { card_ids } = req.body;

    if (card_ids.length === 0) {
      return handleResponse(res, 400, false, "Provide Card Ids");
    }

    await connection.query("BEGIN");

    let s1 = dbScript(db_sql["Q16"], { var1: id });
    let findCompanyAdmin = await connection.query(s1);

    if (findCompanyAdmin.rowCount > 0) {
      let formattedCardIds = card_ids.join("','");

      let s2 = dbScript(db_sql["Q24"], { var1: true, var2: formattedCardIds });
      let activateMultiple = await connection.query(s2);
      if (activateMultiple.rowCount > 0) {
        await connection.query("COMMIT");
        return handleResponse(res, 200, true, "Cards Activated Successfully.");
      } else {
        await connection.query("ROLLBACK");
        return handleSWRError(res);
      }
    } else {
      return handleResponse(res, 401, false, "Admin not found");
    }
  } catch (error) {
    await connection.query("ROLLBACK");
    return handleCatchErrors(res, error);
  }
};
//when deactivating,the card can be used for new user
module.exports.deactivateCard = async (req, res) => {
  try {
    let { id } = req.user;
    let { card_id, status } = req.query;
    if (!card_id) {
      return handleResponse(res, 400, false, "Provide Valid Card Id");
    }
    if (status == 'activate' || status == 'deactivate') {
      await connection.query("BEGIN");
      let s0 = dbScript(db_sql["Q16"], { var1: id });
      let findCompanyAdmin = await connection.query(s0);
      if (findCompanyAdmin.rowCount > 0) {
        let s1 = dbScript(db_sql["Q25"], { var1: card_id });
        let findCard = await connection.query(s1);
        if (findCard.rowCount > 0) {
          if (findCard.rows[0].is_deactivated == true && status == 'deactivate' || findCard.rows[0].is_deactivated == false && status == 'activate') {
            return handleResponse(res, 400, false, `Card is Already ${status}d`);
          }
          let s2 = dbScript(db_sql["Q22"], { var1: status == 'deactivate' ? true : false, var2: card_id });
          let deactivateCard = await connection.query(s2);
          if (deactivateCard.rowCount > 0) {
            let s3 = dbScript(db_sql["Q20"], {
              var1: status == 'deactivate' ? findCompanyAdmin.rows[0].used_cards - 1 : findCompanyAdmin.rows[0].used_cards + 1,
              var2: findCompanyAdmin.rows[0].id,
            });
            let reduceUsedCardCount = await connection.query(s3);
            if (reduceUsedCardCount.rowCount > 0) {
              await connection.query("COMMIT");
              return handleResponse(res, 200, true, `Card ${status}d Successfully.`, deactivateCard.rows);
            } else {
              await connection.query("ROLLBACK");
              return handleSWRError(res);
            }
          } else {
            await connection.query("ROLLBACK");
            return handleSWRError(res);
          }
        } else {
          return handleResponse(res, 400, false, "Card not found");
        }
      } else {
        return handleResponse(res, 401, false, "Admin not found");
      }
    } else {
      return handleResponse(res, 400, false, "Invalid status");
    }

  } catch (error) {
    await connection.query("ROLLBACK");
    return handleCatchErrors(res, error);
  }
};
//cards details using companyName and card ids
module.exports.card = async (req, res) => {
  try {
    let { comp_name, card_ref } = req.query;
    if (!card_ref || !comp_name) {
      return handleResponse(
        res,
        400,
        false,
        "Provide Valid Card and Company Input"
      );
    }

    let s1 = dbScript(db_sql["Q19"], {
      var1: mysql_real_escape_string(comp_name),
      var2: mysql_real_escape_string(card_ref),
      var3: false,
    });
    let findCardDetails = await connection.query(s1);
    if (findCardDetails.rowCount > 0) {
      if (findCardDetails.rows[0].trial_end_date > new Date().toISOString()) {


        if (findCardDetails.rows[0].product_service) {
          findCardDetails.rows[0].product_service = unescape(JSON.parse(findCardDetails.rows[0].product_service))
        }
        if (findCardDetails.rows[0].bio) {
          findCardDetails.rows[0].bio = unescape(JSON.parse(findCardDetails.rows[0].bio))
        }
        findCardDetails.rows[0].cover_pic = findCardDetails.rows[0].cover_pic || process.env.DEFAULT_CARD_COVER_PIC;

        return handleResponse(
          res,
          200,
          true,
          "Card Details",
          findCardDetails.rows[0]
        );
      } else {
        return handleResponse(res, 402, false, "Subscription Expired", {});
      }
    } else {
      return handleResponse(res, 404, false, "No cards Found", {});
    }
  } catch (error) {
    return handleCatchErrors(res, error);
  }
};

module.exports.editCard = async (req, res) => {
  try {
    let { id } = req.user;
    let {
      card_id,
      first_name,
      last_name,
      user_email,
      designation,
      bio,
      cover_pic,
      profile_picture,
      contact_number,
      personal_whatsapp

    } = req.body;

    await connection.query("BEGIN");
    let s1 = dbScript(db_sql["Q16"], { var1: id });
    let findCompanyAdmin = await connection.query(s1);
    if (findCompanyAdmin.rowCount > 0) {
      let errors = await cardValidation.createCardVal(req, res);
      if (!errors.isEmpty()) {
        const firstError = errors.array()[0].msg;
        return handleResponse(res, 400, false, firstError);
      }

      let s2 = dbScript(db_sql["Q25"], { var1: card_id });
      let findCard = await connection.query(s2);
      if (findCard.rowCount > 0) {
        // async function handleImage(bio) {
        //   const imgRegex = /<img[^>]+src="([^">]+)"/g;
        //   let counter = 1;
        //   bio = bio.replace(
        //     imgRegex,
        //     (match, imagePath) => {
        //       if (imagePath.startsWith("https://midin.app/uploads/bioImages") || imagePath.startsWith("uploads/bioImages/") || imagePath.startsWith("../../uploads/bioImages")) {
        //         // Image path is already in correct format, no need to replace
        //         return match;
        //       } else {
        //         // Extract image data
        //         const [, format, data] = imagePath.match(/^data:image\/(\w+);base64,(.+)$/);

        //         // Generate filename
        //         const filename = Date.now() + "-" + counter++ + "." + format;

        //         // Decode and save image
        //         const filePath = path.join(__dirname, "..", "..", "uploads", "bioImages", filename);
        //         fs.writeFileSync(filePath, data, 'base64');

        //         return `<img src="${process.env.BIO_IMAGE_PATH}/${filename}"`;
        //       }
        //     }
        //   );
        //   return bio;
        // }

        async function handleImage(bio) {
          const imgRegex = /<img[^>]+src="([^">]+)"/g;
          let counter = 1;
          bio = bio.replace(
            imgRegex,
            (match, imagePath) => {
              if (imagePath.startsWith("https://midin.app/uploads/bioImages")) {
                // Image path is already in correct format, no need to replace
                return match;
              } else if (imagePath.startsWith("uploads/bioImages/")) {
                // Add https://midin.app before uploads/bioImages
                return `<img src="https://midin.app/${imagePath}"`;
              } else if (imagePath.startsWith("../../uploads")) {
                // Remove ../../ and then add https://midin.app before uploads
                const correctedPath = imagePath.replace("../..", "https://midin.app");
                return `<img src="${correctedPath}"`;
              } else if (imagePath.startsWith("data:image")) {
                // Extract image data
                const [, format, data] = imagePath.match(/^data:image\/(\w+);base64,(.+)$/);

                // Generate filename
                const filename = Date.now() + "-" + counter++ + "." + format;

                // Decode and save image
                const filePath = path.join(__dirname, "..", "..", "uploads", "bioImages", filename);
                fs.writeFileSync(filePath, data, 'base64');

                return `<img src="${process.env.BIO_IMAGE_PATH}/${filename}"`;
              } else {
                // For any other case, return the original match
                return match;
              }
            }
          );
          return bio;
        }
        if (bio !== undefined && bio !== null && bio !== "") {
          bio = await handleImage(bio);
          bio = JSON.stringify(bio)
        }

        let s3 = `
  UPDATE digital_cards
  SET 
    first_name = $1,
    last_name = $2,
    user_email = $3,
    designation = $4,
    profile_picture = $5,
    bio = $6,
    cover_pic = $7,
    contact_number = $8,
    personal_whatsapp = $9
  WHERE
    id = $10
    AND deleted_at IS NULL
  RETURNING *`;

        let editCardDetails = await connection.query(s3, [
          (first_name),
          (last_name),
          (user_email.toLowerCase()),
          (designation),
          profile_picture,
          bio ? bio : null,
          cover_pic,
          contact_number,
          personal_whatsapp,
          card_id
        ]);

        if (editCardDetails.rowCount > 0) {
          await connection.query("COMMIT");
          return handleResponse(
            res,
            200,
            true,
            "Card Updated Successfully",
            editCardDetails.rows[0]
          );
        } else {
          await connection.query("ROLLBACK");
          return handleSWRError(res);
        }
      } else {
        return handleResponse(res, 404, false, "Card not found");
      }
    } else {
      return handleResponse(res, 401, false, "Admin not found");
    }
  } catch (error) {
    await connection.query("ROLLBACK");
    return handleCatchErrors(res, error);
  }
};

//file upload for card section

module.exports.uploadCardProfilePicture = async (req, res) => {
  try {
    let file = req.file;
    const validExtensions = ["jpg", "jpeg", "png"];
    const fileExtension = file.originalname.split(".").pop().toLowerCase();
    if (!validExtensions.includes(fileExtension)) {
      fs.unlinkSync(file.path);
      return res.status(400).json({
        success: false,
        message: "Only JPG, JPEG, and PNG files are allowed.",
      });
    }
    let path = `${process.env.CARD_PROFILE_PIC_LINK}/${file.filename}`;
    return handleResponse(
      res,
      201,
      true,
      "Card Profile Pic uploaded successfully.",
      path
    );
  } catch (error) {
    res.json({
      success: false,
      status: 400,
      message: error.message,
    });
  }
};

module.exports.uploadCardCoverPicture = async (req, res) => {
  try {
    let file = req.file;
    const validExtensions = ["jpg", "jpeg", "png"];
    const fileExtension = file.originalname.split(".").pop().toLowerCase();
    if (!validExtensions.includes(fileExtension)) {
      fs.unlinkSync(file.path);
      return res.status(400).json({
        success: false,
        message: "Only JPG, JPEG, and PNG files are allowed.",
      });
    }
    let path = `${process.env.CARD_COVER_PIC_LINK}/${file.filename}`;
    return handleResponse(
      res,
      201,
      true,
      "Card Cover Pic uploaded successfully.",
      path
    );
  } catch (error) {
    res.json({
      success: false,
      status: 400,
      message: error.message,
    });
  }
};

// Your endpoint handler
module.exports.vcf = async (req, res) => {
  try {
    let { card_id } = req.query;
    let s2 = dbScript(db_sql["Q31"], { var1: card_id, var2: false });
    let findCardDetails = await connection.query(s2);
    if (findCardDetails.rowCount > 0) {
      let vCardString = generateVCard(findCardDetails.rows[0]);
      res.set("Content-Type", "text/vcard");
      res.set(
        "Content-Disposition",
        `attachment; filename=${findCardDetails.rows[0].first_name}_${findCardDetails.rows[0].last_name}.vcf`
      );
      res.send(vCardString);
    } else {
      return handleResponse(res, 404, false, "No cards Found");
    }
  } catch (error) {
    return handleCatchErrors(res, error);
  }
};

module.exports.deleteCard = async (req, res) => {
  try {
    let { id } = req.user;
    let { card_id } = req.query;
    await connection.query("BEGIN");
    let s1 = dbScript(db_sql["Q16"], { var1: id });
    let findCompanyAdmin = await connection.query(s1);
    if (findCompanyAdmin.rowCount > 0) {
      let _dt = new Date().toISOString();
      let s2 = dbScript(db_sql["Q33"], { var1: _dt, var2: card_id, var3: id });
      let deleteCard = await connection.query(s2);
      if (deleteCard.rowCount > 0) {
        let usedCards = findCompanyAdmin.rows[0].used_cards;
        let s3 = dbScript(db_sql["Q20"], {
          var1: Number(usedCards) - 1,
          var2: findCompanyAdmin.rows[0].id,
        });
        let updateCardCount = await connection.query(s3);
        if (updateCardCount.rowCount > 0) {
          await connection.query("COMMIT");
          return handleResponse(
            res,
            200,
            true,
            "Card Deleted Sucessfully.",
            deleteCard.rows
          );
        } else {
          await connection.query("ROLLBACK");
          return handleSWRError(res);
        }
      } else {
        await connection.query("ROLLBACK");
        return handleSWRError(res);
      }
    } else {
      return handleResponse(res, 401, false, "Admin not found");
    }
  } catch (error) {
    await connection.query("ROLLBACK");
    return handleCatchErrors(res, error);
  }
};

module.exports.qrCodeList = async (req, res) => {
  try {
    let { id } = req.user;
    let s1 = dbScript(db_sql["Q16"], { var1: id });
    let findCompanyAdmin = await connection.query(s1);
    if (findCompanyAdmin.rowCount > 0) {
      let s2 = dbScript(db_sql["Q35"], { var1: id, var2: false });
      let urlLists = await connection.query(s2);
      if (urlLists.rowCount > 0) {
        return handleResponse(
          res,
          200,
          true,
          "QR code URL lists",
          urlLists.rows
        );
      } else {
        return handleResponse(res, 200, false, "QR code URL lists", []);
      }
    } else {
      return handleResponse(res, 401, false, "Admin not found");
    }
  } catch (error) {
    return handleCatchErrors(res, error);
  }
};

//File Upload and Download

// module.exports.uploadCreateCardFile = async (req, res) => {
//   try {
//     let { id } = req.user;
//     await connection.query("BEGIN");

//     let s1 = dbScript(db_sql["Q16"], { var1: id });
//     let findCompanyAdmin = await connection.query(s1);

//     if (findCompanyAdmin.rowCount > 0) {
//       if (!req.file) {
//         return res.status(400).json({ success: false, message: 'No file uploaded' });
//       }

//       let { path } = req.file;
//       const workbook = new ExcelJS.Workbook();
//       await workbook.xlsx.readFile(path);
//       const worksheet = workbook.getWorksheet(1);

//       let hasData = false;
//       let createdCards = [];
//       let existingEmails = [];

//       // Count the total number of cards being inserted
//       let totalNewCards = 0;

//       for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber++) {
//         const row = worksheet.getRow(rowNumber);
//         if (rowNumber !== 1) {
//           hasData = true;
//           let [, first_name, last_name, user_email, designation, contact_number] = row.values;
//           console.log(user_email, "user email");
//           function isValidEmail(email) {
//             const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//             return emailRegex.test(email);
//           }

//           let isValid = isValidEmail(user_email)
//           if (!isValid) {
//             handleResponse(res, 400, false, "Invalid Email address");
//             break;
//           }

//           let s0 = dbScript(db_sql["Q34"], { var1: mysql_real_escape_string(user_email.toLowerCase()), });
//           let checkEmailInDC = await connection.query(s0);
//           if (checkEmailInDC.rowCount === 0) {
//             totalNewCards++;
//             if (totalNewCards > findCompanyAdmin.rows[0].max_cards - findCompanyAdmin.rows[0].used_cards) {
//               return handleResponse(res, 400, false, "Maximum cards limit reached for this company");
//             }

//             let usedCards = findCompanyAdmin.rows[0].used_cards;
//             let maxCards = findCompanyAdmin.rows[0].max_cards;
//             path = require("path");
//             let companyName = formatCompanyName(findCompanyAdmin.rows[0].company_name).toLowerCase();
//             let company_ref = companyName;
//             let card_ref = randomstring.generate({ length: 5, charset: "alphanumeric" }).toLowerCase();
//             let qrCodeLink = `${process.env.LINK_INSIDE_QR_CODE}/${companyName}/${card_ref}`;
//             let databaseLinkQR = `${process.env.DATABASE_LINK_FOR_QR}/${companyName}/${card_ref}.png`;
//             let qrCodeDirectory = path.join(__dirname, "../../", "./uploads", "qrCode", companyName);
//             let qrCodeFileName = `${card_ref}.png`;
//             let card_link = `${process.env.LINK_OF_DIGITAL_CARD}/${companyName}/${card_ref}`;
//             let profile_picture = process.env.DEFAULT_USER_PROFILE_PIC;
//             let created_by = findCompanyAdmin.rows[0].company_admin_data[0].company_admin_id;

//             fs.mkdirSync(qrCodeDirectory, { recursive: true });

//             let qrSuccess = await generateQRCode(qrCodeLink, qrCodeDirectory, qrCodeFileName);
//             if (qrSuccess) {
//               let s2 = `
//                 INSERT INTO digital_cards
//                   (company_id, created_by, card_reference, first_name, last_name, user_email, designation, qr_url, user_type,  card_url, vcf_card_url, company_ref, contact_number,profile_picture)
//                 VALUES
//                   ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,$14)
//                 RETURNING *`;
//               let insertData = await connection.query(s2, [findCompanyAdmin.rows[0].id, created_by, card_ref, mysql_real_escape_string(first_name), mysql_real_escape_string(last_name), mysql_real_escape_string(user_email.toLowerCase()), mysql_real_escape_string(designation), databaseLinkQR, "user", card_link, null, mysql_real_escape_string(company_ref), contact_number, profile_picture]);

//               if (insertData.rowCount > 0) {
//                 let s4 = dbScript(db_sql["Q20"], { var1: Number(usedCards) + 1, var2: findCompanyAdmin.rows[0].id, });
//                 let updateCardCount = await connection.query(s4);
//                 if (updateCardCount.rowCount > 0) {
//                   createdCards.push(...insertData.rows);
//                 } else {
//                   await connection.query("ROLLBACK");
//                   return handleSWRError(res);
//                 }
//               } else {
//                 await connection.query("ROLLBACK");
//                 return handleSWRError(res);
//               }
//             } else {
//               await connection.query("ROLLBACK");
//               return handleSWRError(res);
//             }
//           } else {
//             existingEmails.push(user_email);
//           }
//         }
//       }

//       if (!hasData) {
//         return res.status(400).json({ success: false, message: 'Uploaded file is empty' });
//       }

//       if (existingEmails.length > 0) {
//         await connection.query('ROLLBACK')
//         return handleResponse(res, 400, false, `Card Creation Failed as these emails already exist in the database: ${existingEmails.join(', ')}`);
//       }

//       // await connection.query("COMMIT");
//       return handleResponse(res, 201, true, "Cards Created Successfully", createdCards);
//     } else {
//       return handleResponse(res, 401, false, "Admin not found");
//     }
//   } catch (error) {
//     await connection.query("ROLLBACK");
//     return handleCatchErrors(res, error);
//   }
// }

module.exports.uploadCreateCardFile = async (req, res) => {
  try {
    let { id } = req.user;

    let s1 = dbScript(db_sql["Q16"], { var1: id });
    let findCompanyAdmin = await connection.query(s1);

    if (findCompanyAdmin.rowCount > 0) {
      await connection.query("BEGIN");
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      let { path } = req.file;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(path);
      const worksheet = workbook.getWorksheet(1);

      let hasData = false;
      let createdCards = [];
      let existingEmails = [];

      // Count the total number of cards being inserted
      let totalNewCards = 0;

      for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        if (rowNumber !== 1) {
          hasData = true;
          let [, first_name, last_name, user_email, designation, contact_number, whatsapp] = row.values;
          // console.log(first_name, last_name, user_email, designation, contact_number, "111111111111111111");
          if (!user_email || !first_name || !last_name || !designation || !contact_number) {
            // Skip processing if any required field is empty
            continue;
          }
          function isValidEmail(email) {
            console.log(email, "email");
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
          }

          let isValid = isValidEmail(user_email)
          if (!isValid) {
            handleResponse(res, 400, false, "Invalid Email address");
            break;
          }

          let s0 = dbScript(db_sql["Q34"], { var1: mysql_real_escape_string(user_email.toLowerCase()), });
          let checkEmailInDC = await connection.query(s0);
          if (checkEmailInDC.rowCount === 0) {
            totalNewCards++;
            let usedCards = findCompanyAdmin.rows[0].used_cards;
            let maxCards = findCompanyAdmin.rows[0].max_cards;

            if (totalNewCards > maxCards - usedCards) {
              return handleResponse(res, 400, false, "Maximum cards limit reached for this company");
            }

            let path = require("path");
            let companyName = formatCompanyName(findCompanyAdmin.rows[0].company_name).toLowerCase();
            let company_ref = companyName;
            let card_ref = randomstring.generate({ length: 5, charset: "alphanumeric" }).toLowerCase();
            let qrCodeLink = `${process.env.LINK_INSIDE_QR_CODE}/${companyName}/${card_ref}`;
            let databaseLinkQR = `${process.env.DATABASE_LINK_FOR_QR}/${companyName}/${card_ref}.png`;
            let qrCodeDirectory = path.join(__dirname, "../../", "./uploads", "qrCode", companyName);
            let qrCodeFileName = `${card_ref}.png`;
            let card_link = `${process.env.LINK_OF_DIGITAL_CARD}/${companyName}/${card_ref}`;
            let profile_picture = process.env.DEFAULT_USER_PROFILE_PIC;
            let created_by = findCompanyAdmin.rows[0].company_admin_data[0].company_admin_id;
            let qrCodeSize = 256

            fs.mkdirSync(qrCodeDirectory, { recursive: true });

            // let qrSuccess = await generateQRCode(qrCodeLink, qrCodeDirectory, qrCodeFileName, qrCodeSize);
            // console.log(qrSuccess, "qrsucesss");

            const qrCodeImage = qrImage.imageSync(qrCodeLink, { type: "png", size: 256 });
            console.log(qrCodeImage.length, "qrsucesss");
            // Save QR code to file
            fs.writeFileSync(path.join(qrCodeDirectory, qrCodeFileName), qrCodeImage, "binary");
            if (qrCodeImage.length > 0) {
              let s2 = `
                INSERT INTO digital_cards
                  (company_id, created_by, card_reference, first_name, last_name, user_email, designation, qr_url, user_type,  card_url, vcf_card_url, company_ref, contact_number,profile_picture,personal_whatsapp)
                VALUES
                  ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,$14,$15)
                RETURNING *`;
              console.log(s2, "s22222");
              let insertData = await connection.query(s2, [findCompanyAdmin.rows[0].id, created_by, card_ref, mysql_real_escape_string(first_name), mysql_real_escape_string(last_name), mysql_real_escape_string(user_email.toLowerCase()), mysql_real_escape_string(designation), databaseLinkQR, "user", card_link, null, mysql_real_escape_string(company_ref), contact_number, profile_picture, whatsapp]);

              if (insertData.rowCount > 0) {
                createdCards.push(...insertData.rows);
              } else {
                await connection.query("ROLLBACK");
                return handleSWRError(res);
              }
            } else {
              await connection.query("ROLLBACK");
              return handleSWRError(res);
            }
          } else {
            existingEmails.push(user_email);
          }
        }
      }

      if (!hasData) {
        return res.status(400).json({ success: false, message: 'Uploaded file is empty' });
      }

      if (existingEmails.length > 0) {
        await connection.query('ROLLBACK')
        return handleResponse(res, 400, false, `Card Creation Failed as these emails already exist in the database: ${existingEmails.join(', ')}`);
      }

      // Update used_cards count in the database
      let usedCards = findCompanyAdmin.rows[0].used_cards;
      usedCards += totalNewCards;
      let s4 = dbScript(db_sql["Q20"], { var1: usedCards, var2: findCompanyAdmin.rows[0].id });
      let updateCardCount = await connection.query(s4);

      // Commit the transaction
      await connection.query("COMMIT");

      return handleResponse(res, 201, true, "Cards Created Successfully", createdCards);
    } else {
      return handleResponse(res, 401, false, "Admin not found");
    }
  } catch (error) {
    await connection.query("ROLLBACK");
    return handleCatchErrors(res, error);
  }
}

module.exports.exportCardDetail = async (req, res) => {
  try {
    let { id } = req.user;
    await connection.query("BEGIN");

    let s1 = dbScript(db_sql["Q16"], { var1: id });
    let findCompanyAdmin = await connection.query(s1);

    if (findCompanyAdmin.rowCount > 0) {
      let s2 = dbScript(db_sql["Q42"], { var1: id });
      let exportDetails = await connection.query(s2);

      if (exportDetails.rowCount > 0) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Card Details');
        worksheet.columns = [
          { header: 'First Name', key: 'first_name', width: 15 },
          { header: 'Last Name', key: 'last_name', width: 15 },
          { header: 'Email', key: 'user_email', width: 30 },
          { header: 'Designation', key: 'designation', width: 15 },
          { header: 'Profile Picture', key: 'profile_picture', width: 50 },
          { header: 'Card URL', key: 'card_url', width: 50 },
          { header: 'QR URL', key: 'qr_url', width: 50 },
        ];

        exportDetails.rows.forEach(row => {
          worksheet.addRow(row);
        });

        // const fileName = 'card_details.xlsx';
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const fileName = `card_details_${timestamp}.xlsx`;
        const filePath = path.join(__dirname, '../../uploads/cardDetails', fileName);
        await workbook.xlsx.writeFile(filePath);

        const baseUrl = "https://midin.app";
        const fileUrl = `${baseUrl}/uploads/cardDetails/${fileName}`;

        // const fileUrl = `${baseUrl}/cardDetails/${fileName}`;

        res.status(200).json({ fileUrl });
      } else {
        return handleResponse(res, 200, false, "No cards Found", []);
      }
    } else {
      return handleResponse(res, 401, false, "Admin not found");
    }
  } catch (error) {
    return handleCatchErrors(res, error);
  }
}

module.exports.addAddress = async (req, res) => {
  try {
    let { id } = req.user;
    let { company_address, company_id } = req.body
    await connection.query("BEGIN");

    let s1 = dbScript(db_sql["Q16"], { var1: id });
    let findCompanyAdmin = await connection.query(s1);

    if (findCompanyAdmin?.rowCount == 0) {
      return handleResponse(res, 401, false, "Admin not found");
    }

    if (findCompanyAdmin.rows[0].id !== company_id) {
      return handleResponse(res, 401, false, "Not Authorized to Change Address");
    }

    // let s2 = 
  } catch (error) {
    await connection.query("ROLLBACK")
    return handleCatchErrors(res, error);
  }
}



