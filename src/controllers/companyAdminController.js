const connection = require("../config/database");
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
const path = require("path");
const { forgetPassword } = require("../utils/sendMail");
const { json } = require("express");
const multer = require("multer");

const cheerio = require("cheerio"); // For parsing HTML content
const { unescape, escape } = require("querystring");

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

// module.exports.editCompanyDetails = async (req, res) => {
//   try {
//     let { id } = req.user;
//     let {
//       company_id,
//       company_name,
//       company_email,
//       description,
//       company_address,
//       company_logo,
//       company_website,
//       location,
//       latitude,
//       longitude,
//       company_contact_number,
//       product_service,
//     } = req.body;

//     if (
//       !company_id ||
//       !company_name ||
//       !company_email ||
//       !company_contact_number
//     ) {
//       return handleResponse(res, 400, false, "Please provide all the fields.");
//     }

//     let isValidCId = isValidUUID(company_id);
//     if (!isValidCId) {
//       return handleResponse(res, 400, false, "Invalid Company Id");
//     }

//     let errors = await companyAdminValidation.editCompanyValidation(req, res);
//     if (!errors.isEmpty()) {
//       const firstError = errors.array()[0].msg;
//       return handleResponse(res, 400, false, firstError);
//     }

//     await connection.query("BEGIN");

//     let s1 = dbScript(db_sql["Q16"], { var1: id });
//     let findCompanyAdmin = await connection.query(s1);
//     if (findCompanyAdmin.rowCount > 0) {
//       if (findCompanyAdmin.rows[0].id !== company_id) {
//         return handleResponse(res, 400, false, "Provide Valid Company Id");
//       }

//       // async function handleImage(product_service) {
//       //   const imgRegex = /<img[^>]+src="([^">]+)"/g;
//       //   let counter = 1;
//       //   product_service = product_service.replace(
//       //     imgRegex,
//       //     (match, imageData) => {
//       //       const base64Data = imageData.replace(
//       //         /^data:image\/jpeg;base64,/,
//       //         ""
//       //       );
//       //       const filename = Date.now() + "-" + counter++ + ".jpg";
//       //       fs.writeFileSync(
//       //         path.join(
//       //           __dirname,
//       //           "..",
//       //           "..",
//       //           "uploads",
//       //           "productServiceImage",
//       //           filename
//       //         ),
//       //         base64Data,
//       //         "base64"
//       //       );
//       //       console.log(`<img src="${process.env.PRODUCT_SERVICE_IMAGE_PATH}/${filename}"`, "image path");
//       //       return `<img src="${process.env.PRODUCT_SERVICE_IMAGE_PATH}/${filename}"`;
//       //     }
//       //   );
//       //   return product_service;
//       // }

//       // async function handleImage(product_service) {
//       //   const imgRegex = /<img[^>]+src="([^">]+)"/g;
//       //   let counter = 1;

//       //   product_service = product_service.replace(
//       //     imgRegex,
//       //     (match, imageData) => {
//       //       if (imageData.startsWith(process.env.PRODUCT_SERVICE_IMAGE_PATH)) {
//       //         // Image path is already in correct format, no need to replace
//       //         return match;
//       //       } else {
//       //         // Extract image data
//       //         const [, format, data] = imageData.match(/^data:image\/(\w+);base64,(.+)$/);

//       //         // Generate filename
//       //         const filename = Date.now() + "-" + counter++ + "." + format;

//       //         // Decode and save image
//       //         const imagePath = path.join(__dirname, "..", "..", "uploads", "productServiceImage", filename);
//       //         fs.writeFileSync(imagePath, data, 'base64');

//       //         console.log(`<img src="${process.env.PRODUCT_SERVICE_IMAGE_PATH}/${filename}"`, "image path");
//       //         return `<img src="${process.env.PRODUCT_SERVICE_IMAGE_PATH}/${filename}"`;
//       //       }
//       //     }
//       //   );

//       //   return product_service;
//       // }

//       // async function handleImage(product_service) {
//       //   const imgRegex = /<img[^>]+src="([^">]+)"/g;
//       //   let counter = 1;

//       //   product_service = product_service.replace(
//       //     imgRegex,
//       //     (match, imagePath) => {
//       //       if (imagePath.startsWith("uploads/productServiceImage/")) {
//       //         // Image path is already in correct format, no need to replace
//       //         return match;
//       //       } else {
//       //         // Extract image data
//       //         const [, format, data] = imagePath.match(/^data:image\/(\w+);base64,(.+)$/);

//       //         // Generate filename
//       //         const filename = Date.now() + "-" + counter++ + "." + format;

//       //         // Decode and save image
//       //         const filePath = path.join(__dirname, "..", "..", "uploads", "productServiceImage", filename);
//       //         fs.writeFileSync(filePath, data, 'base64');

//       //         console.log(`<img src="${process.env.PRODUCT_SERVICE_IMAGE_PATH}/${filename}"`, "image path");
//       //         return `<img src="${process.env.PRODUCT_SERVICE_IMAGE_PATH}/${filename}"`;
//       //       }
//       //     }
//       //   );

//       //   return product_service;
//       // }

//       async function handleImage(product_service) {
//         const imgRegex = /<img[^>]+src="([^">]+)"/g;
//         let counter = 1;

//         product_service = product_service.replace(
//           imgRegex,
//           (match, imagePath) => {
//             if (imagePath.startsWith("uploads/productServiceImage/") || imagePath.startsWith("https://midin.app/uploads/productServiceImage/") || imagePath.startsWith("http://localhost:3007/productServiceImage/")) {
//               // Image path is already in correct format, no need to replace
//               return match;
//             } else {
//               // Extract image data
//               const [, format, data] = imagePath.match(/^data:image\/(\w+);base64,(.+)$/);

//               // Generate filename
//               const filename = Date.now() + "-" + counter++ + "." + format;

//               // Decode and save image
//               const filePath = path.join(__dirname, "..", "..", "uploads", "productServiceImage", filename);
//               fs.writeFileSync(filePath, data, 'base64');

//               console.log(`<img src="${process.env.PRODUCT_SERVICE_IMAGE_PATH}/${filename}"`, "image path");
//               return `<img src="${process.env.PRODUCT_SERVICE_IMAGE_PATH}/${filename}"`;
//             }
//           }
//         );

//         // Escape text content to prevent SQL injection
//         product_service = mysql_real_escape_string(product_service);
//         console.log(product_service, "encodedddddddd");

//         return product_service;
//       }

//       product_service = await handleImage(product_service);
//       product_service = JSON.stringify(product_service)
//       let s2 = dbScript(db_sql["Q27"], {
//         var1: mysql_real_escape_string(company_name),
//         var2: mysql_real_escape_string(company_email.toLowerCase()),
//         var3: description ? mysql_real_escape_string(description) : null,
//         var4: mysql_real_escape_string(company_address),
//         var5: company_logo,
//         var6: company_website
//           ? mysql_real_escape_string(company_website)
//           : null,
//         var7: location,
//         var8: latitude ? latitude : null,
//         var9: longitude ? longitude : null,
//         var10: company_contact_number,
//         var11: (product_service),
//         var12: id,
//         var13: company_id,
//       });
//       let updateCompanyDetails = await connection.query(s2);
//       await connection.query("COMMIT");
//       updateCompanyDetails.rows[0].product_service = unescape(updateCompanyDetails.rows[0].product_service)
//       return handleResponse(
//         res,
//         200,
//         true,
//         "Company Details Updated Successfully.",
//         updateCompanyDetails.rows
//       );
//     } else {
//       return handleResponse(res, 401, false, "Admin not found");
//     }
//   } catch (error) {
//     await connection.query("ROLLBACK");
//     console.error(error);
//     return res.status(500).json({ error: error.stack });
//   }
// };


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

      async function handleImage(product_service) {
        const imgRegex = /<img[^>]+src="([^">]+)"/g;
        let counter = 1;

        product_service = product_service.replace(
          imgRegex,
          (match, imagePath) => {
            if (imagePath.startsWith("uploads/productServiceImage/") || imagePath.startsWith("https://midin.app/uploads/productServiceImage/") || imagePath.startsWith("http://localhost:3007/productServiceImage/")) {
              return match;
            } else {
              const [, format, data] = imagePath.match(/^data:image\/(\w+);base64,(.+)$/);

              const filename = Date.now() + "-" + counter++ + "." + format;

              const filePath = path.join(__dirname, "..", "..", "uploads", "productServiceImage", filename);
              fs.writeFileSync(filePath, data, 'base64');

              return `<img src="${process.env.PRODUCT_SERVICE_IMAGE_PATH}/${filename}"`;
            }
          }
        );

        return product_service;
      }

      product_service = await handleImage(product_service);
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
    product_service = $11
  WHERE 
    admin_id = $12 
    AND id = $13 
    AND deleted_at IS NULL 
  RETURNING *`;

      let updateCompanyDetails = await connection.query(s2, [
        company_name,
        company_email.toLowerCase(),
        description,
        company_address,
        company_logo,
        company_website,
        location,
        latitude,
        longitude,
        company_contact_number,
        product_service,
        id,
        company_id
      ]);

      await connection.query("COMMIT");
      updateCompanyDetails.rows[0].product_service = unescape(updateCompanyDetails.rows[0].product_service);
      return handleResponse(
        res,
        200,
        true,
        "Company Details Updated Successfully.",
        updateCompanyDetails.rows
      );
    } else {
      return handleResponse(res, 401, false, "Admin not found");
    }
  } catch (error) {
    await connection.query("ROLLBACK");
    console.error(error);
    return res.status(500).json({ error: error.stack });
  }
};


module.exports.companyDetails = async (req, res) => {
  try {
    let { id } = req.user;
    let s1 = dbScript(db_sql["Q16"], { var1: id });
    let findCompanyAdmin = await connection.query(s1);
    if (findCompanyAdmin.rowCount > 0) {
      findCompanyAdmin.rows[0].product_service = unescape(JSON.parse(findCompanyAdmin.rows[0].product_service));
      return handleResponse(res, 200, true, "Company Details", findCompanyAdmin.rows);
    } else {
      return handleResponse(res, 401, false, "Admin not found");
    }
  } catch (error) {
    return handleCatchErrors(res, error);
  }
};

/** ========card section===== */

module.exports.createCard = async (req, res) => {
  try {
    let { id } = req.user;
    let { first_name, last_name, user_email, designation, bio, cover_pic, profile_picture, contact_number,
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
        let company_ref = companyName;
        const card_ref = randomstring.generate({
          length: 5,
          charset: "alphanumeric",
        });
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

        let qrSuccess = await generateQRCode(
          qrCodeLink,
          qrCodeDirectory,
          qrCodeFileName
        );
        if (qrSuccess) {
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
          bio = await handleImage(bio);
          bio = JSON.stringify(bio)

          let s2 = `
          INSERT INTO digital_cards 
            (company_id, created_by, card_reference, first_name, last_name, user_email, designation, bio, qr_url, user_type, cover_pic, profile_picture, card_url, vcf_card_url, company_ref, contact_number) 
          VALUES 
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
          RETURNING *`;

          let insertData = await connection.query(s2, [findCompanyAdmin.rows[0].id, created_by, card_ref, first_name, last_name, user_email.toLowerCase(), designation, bio ? bio : null, databaseLinkQR, "user", cover_pic, profile_picture, card_link, null, company_ref, contact_number]);

          if (insertData.rowCount > 0) {
            let s4 = dbScript(db_sql["Q20"], {
              var1: Number(usedCards) + 1,
              var2: findCompanyAdmin.rows[0].id,
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
//           findCardDetails.rows[0].bio = unescape(JSON.parse(findCardDetails.rows[0].bio))

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
          // Add https://midin.app/ to image URLs starting with '/uploads/bioImages' or '../../uploads/bioImages'
          findCardDetails.rows[0].bio = findCardDetails.rows[0].bio.replace(/(?:\.\.\/)*uploads\/bioImages\/[^"]+/g, 'https://midin.app/$&');
          // Decode HTML entities
          findCardDetails.rows[0].bio = unescape(JSON.parse(findCardDetails.rows[0].bio));
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
//when deactivating the the card can be used for new user
module.exports.deactivateCard = async (req, res) => {
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
      let s2 = dbScript(db_sql["Q22"], { var1: true, var2: card_id });
      let deactivateCard = await connection.query(s2);
      if (deactivateCard.rowCount > 0) {
        let s3 = dbScript(db_sql["Q20"], {
          var1: findCompanyAdmin.rows[0].used_cards - 1,
          var2: findCompanyAdmin.rows[0].id,
        });
        let reduceUsedCardCount = await connection.query(s3);
        if (reduceUsedCardCount.rowCount > 0) {
          await connection.query("COMMIT");
          return handleResponse(
            res,
            200,
            true,
            "Card Deactivated Successfully."
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
      if (findCardDetails.rows[0].product_service) {
        findCardDetails.rows[0].product_service = unescape(JSON.parse(findCardDetails.rows[0].product_service))
      }
      if (findCardDetails.rows[0].bio) {
        findCardDetails.rows[0].bio = unescape(JSON.parse(findCardDetails.rows[0].bio))
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
        async function handleImage(bio) {
          const imgRegex = /<img[^>]+src="([^">]+)"/g;
          let counter = 1;
          bio = unescape(bio);
          bio = bio.replace(
            imgRegex,
            (match, imagePath) => {
              if (imagePath.startsWith("https://midin.app/uploads/bioImages") || imagePath.startsWith("uploads/bioImages/")) {
                // Image path is already in correct format, no need to replace
                return match;
              } else {
                // Extract image data
                const [, format, data] = imagePath.match(/^data:image\/(\w+);base64,(.+)$/);

                // Generate filename
                const filename = Date.now() + "-" + counter++ + "." + format;

                // Decode and save image
                const filePath = path.join(__dirname, "..", "..", "uploads", "bioImages", filename);
                fs.writeFileSync(filePath, data, 'base64');

                return `<img src="${process.env.BIO_IMAGE_PATH}/${filename}"`;
              }
            }
          );
          return bio;
        }
        bio = await handleImage(bio);
        bio = JSON.stringify(bio)

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
    contact_number = $8
  WHERE
    id = $9
    AND deleted_at IS NULL
  RETURNING *`;

        let editCardDetails = await connection.query(s3, [
          mysql_real_escape_string(first_name),
          mysql_real_escape_string(last_name),
          mysql_real_escape_string(user_email.toLowerCase()),
          mysql_real_escape_string(designation),
          profile_picture,
          bio ? bio : null,
          cover_pic,
          contact_number,
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
