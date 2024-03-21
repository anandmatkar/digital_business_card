const connection = require("../config/database");
const { issueJWT, verifyPassResTokenCA, verifyPassResTokenSA } = require("../middleware/authMiddleware");
const { superAdminValidation, trimValue } = require("../middleware/validation");
const { dbScript, db_sql } = require("../utils/dbscript");
const { mysql_real_escape_string, isValidUUID } = require("../utils/helpers");
const {
  handleCatchErrors,
  handleSWRError,
  handleResponse,
} = require("../utils/response");
const bcrypt = require("bcrypt");
const { card } = require("./companyAdminController");
const { forgetPassword } = require("../utils/sendMail");

/*   Auth section  */

/* check whether superadmin is already registered */
module.exports.isSupReg = async (req, res) => {
  try {
    let s1 = dbScript(db_sql["Q0"], {});
    let isSuperAdminRegistered = await connection.query(s1);
    if (isSuperAdminRegistered.rowCount > 0) {
      return res.status(200).json({
        success: true,
        messages: "SuperAdmin Already Registered",
        isRegistered: true,
      });
    } else {
      return res.status(200).json({
        success: true,
        messages: "SuperAdmin Not Registered",
        isRegistered: false,
      });
    }
  } catch (error) {
    return handleCatchErrors(res, error);
  }
};

module.exports.registerSuperAdmin = async (req, res) => {
  try {
    let { name, email, password, avatar } = req.body;
    let s1 = dbScript(db_sql["Q0"], {});
    let isSuperAdminRegistered = await connection.query(s1);
    if (isSuperAdminRegistered.rowCount > 0) {
      return handleResponse(res, 409, false, "Super Admin already Registered");
    } else {
      let errors = await superAdminValidation.createSupAdmin(req, res);
      if (!errors.isEmpty()) {
        const firstError = errors.array()[0].msg;
        return handleResponse(res, 400, false, firstError);
      }
      await connection.query("BEGIN");
      let s2 = dbScript(db_sql["Q1"], {
        var1: mysql_real_escape_string(email.toLowerCase()),
      });
      let isAlreadyRegistered = await connection.query(s2);
      if (isAlreadyRegistered.rowCount == 0) {
        avatar = avatar ? avatar : process.env.DEFAULT_SUP_ADMIN_AVATAR;
        const encryptedPassword = await bcrypt.hash(password, 10);
        let s3 = dbScript(db_sql["Q2"], {
          var1: mysql_real_escape_string(name),
          var2: mysql_real_escape_string(email.toLowerCase()),
          var3: encryptedPassword,
          var4: mysql_real_escape_string(avatar),
        });
        let registerSuperAdmin = await connection.query(s3);
        if (registerSuperAdmin.rowCount > 0) {
          await connection.query("COMMIT");
          return handleResponse(
            res,
            201,
            true,
            "Super Admin registration successful"
          );
        } else {
          await connection.query("ROLLBACK");
          return handleSWRError(res);
        }
      } else {
        return handleResponse(
          res,
          409,
          false,
          "Super Admin already Registered"
        );
      }
    }
  } catch (error) {
    await connection.query("ROLLBACK");
    return handleCatchErrors(res, error);
  }
};

module.exports.loginSuperAdmin = async (req, res) => {
  try {
    let { email, password } = req.body;
    if (!email || !password) {
      return handleResponse(res, 404, false, "Email or Password are required.");
    }

    let errors = await superAdminValidation.loginSuperAdminValidation(req, res);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0].msg;
      return handleResponse(res, 400, false, firstError);
    }

    let s1 = dbScript(db_sql["Q1"], {
      var1: mysql_real_escape_string(email.toLowerCase()),
    });
    let findSuperAdmin = await connection.query(s1);
    if (findSuperAdmin.rowCount > 0) {
      let matchPassword = await bcrypt.compare(
        password,
        findSuperAdmin.rows[0].password
      );
      if (matchPassword) {
        let user = {
          id: findSuperAdmin.rows[0].id,
          email: findSuperAdmin.rows[0].email,
          role: "superadmin",
        };
        let token = await issueJWT(user);
        findSuperAdmin.rows[0].token = token;
        delete findSuperAdmin.rows[0].password;
        return handleResponse(
          res,
          200,
          true,
          "Logged In Successfully",
          findSuperAdmin.rows[0]
        );
      } else {
        return handleResponse(res, 403, false, "Invalid Credentials");
      }
    } else {
      return handleResponse(res, 403, false, "Invalid Credentials");
    }
  } catch (error) {
    return handleCatchErrors(res, error);
  }
};

module.exports.showSAProfile = async (req, res) => {
  try {
    let { id } = req.user;
    let s1 = dbScript(db_sql["Q3"], { var1: id });
    let findSuperAdmin = await connection.query(s1);
    if (findSuperAdmin.rowCount > 0) {
      return handleResponse(
        res,
        200,
        true,
        "SuperAdmin Profile Details",
        findSuperAdmin.rows[0]
      );
    } else {
      return handleResponse(res, 404, false, "Super Admin Not Found");
    }
  } catch (error) {
    return handleCatchErrors(res, error);
  }
};

module.exports.changePassword = async (req, res) => {
  try {
    let { id, email } = req.user;
    let { oldPassword, newPassword } = req.body;
    // Trim the passwords
    oldPassword = oldPassword.trim();
    newPassword = newPassword.trim();
    if (!oldPassword || !newPassword) {
      return handleResponse(res, 400, false, "Please provide all the Fields.");
    }
    if (oldPassword === newPassword) {
      return handleResponse(
        res,
        409,
        false,
        "New Password cannot be the same as Old Password"
      );
    }
    let errors = await superAdminValidation.changePasswordValidation(req, res);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0].msg;
      return handleResponse(res, 422, false, firstError);
    }
    await connection.query("BEGIN");
    let s1 = dbScript(db_sql["Q1"], { var1: email });
    let findSuperAdmin = await connection.query(s1);
    if (findSuperAdmin.rowCount > 0) {
      let matchOldPassword = await bcrypt.compare(
        oldPassword,
        findSuperAdmin.rows[0].password
      );
      if (matchOldPassword) {
        const encryptedPassword = await bcrypt.hash(newPassword, 10);
        let _dt = new Date().toISOString();
        let s2 = dbScript(db_sql["Q4"], {
          var1: encryptedPassword,
          var2: _dt,
          var3: id,
        });
        let updatePassword = await connection.query(s2);
        if (updatePassword.rowCount > 0) {
          await connection.query("COMMIT");
          return handleResponse(
            res,
            200,
            true,
            "Password Changed Successfully"
          );
        } else {
          await connection.query("ROLLBACK");
          return handleSWRError(res);
        }
      } else {
        return handleResponse(res, 401, false, "Invalid Old Password");
      }
    } else {
      return handleResponse(res, 401, false, "Super Admin Not Found");
    }
  } catch (error) {
    await connection.query("ROLLBACK");
    return handleCatchErrors(res, error);
  }
};

module.exports.forgetPassword = async (req, res) => {
  try {
    let { email } = req.body;

    if (!email) {
      return handleResponse(res, 400, false, "Email is required.");
    }

    let errors = await superAdminValidation.forgetPasswordSAValidation(
      req,
      res
    );

    if (!errors.isEmpty()) {
      const firstError = errors.array()[0].msg;
      return handleResponse(res, 400, false, firstError);
    }

    // Check if the email exists in your system
    const s1 = dbScript(db_sql["Q36"], {
      var1: mysql_real_escape_string(email.toLowerCase()),
    });
    const findSuperAdmin = await connection.query(s1);
    if (findSuperAdmin.rowCount > 0) {
      let superAdmin = findSuperAdmin.rows[0];
      let user = {
        id: superAdmin.id,
        email: superAdmin.email,
        role: "superadmin",
      };
      const resetToken = await issueJWT(user);
      const link = `${process.env.FORGET_PASSWORD_LINK}/${resetToken}`;
      forgetPassword(email.toLowerCase(), link, superAdmin.first_name);

      return handleResponse(
        res,
        200,
        true,
        "Reset Password Link has been sent to the email."
      );
    } else {
      return handleResponse(res, 404, false, "Super Admin Not Found.");
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

    let superAdmin = await verifyPassResTokenSA(req);

    if (!superAdmin || superAdmin.role !== "superadmin") {
      return handleResponse(res, 401, false, "Invalid or Unauthorized Token");
    }

    if (superAdmin) {
      let errors = await superAdminValidation.resetPasswordSAValidation(
        req,
        res
      );

      if (!errors.isEmpty()) {
        const firstError = errors.array()[0].msg;
        return handleResponse(res, 400, false, firstError);
      }
      await connection.query("BEGIN");
      let s1 = dbScript(db_sql["Q37"], { var1: superAdmin.id });
      let findSuperAdmin = await connection.query(s1);
      if (findSuperAdmin.rows[0]) {
        let hashedPassword = await bcrypt.hash(password, 10);
        let s2 = dbScript(db_sql["Q38"], {
          var1: superAdmin.id,
          var2: hashedPassword,
        });
        let resetPasswordSA = await connection.query(s2);
        if (resetPasswordSA.rowCount > 0) {
          await connection.query("COMMIT");
          handleResponse(
            res,
            200,
            true,
            "Password Reset Successfully",
            resetPasswordSA.rows
          );
        } else {
          await connection.query("ROLLBACK");
          handleSWRError(res);
        }
      } else {
        handleResponse(res, 404, false, "Super Admin Not Found");
      }
    } else {
      handleResponse(res, 404, false, "Reset Password Token is Invalid");
    }
  } catch (error) {
    await connection.query("ROLLBACK");
    return handleCatchErrors(res, error);
  }
};

module.exports.editSAProfile = async (req, res) => {
  try {
    let { id } = req.user;
    let { name, email, avatar } = req.body;
    name = name.toString().trim();
    console.log(name);
    if (!name || !email) {
      return handleResponse(res, 400, false, "Name and Email are required.");
    }

    let errors = await superAdminValidation.editProfile(req, res);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0].msg;
      return handleResponse(res, 400, false, firstError);
    }
    await connection.query("BEGIN");
    let s1 = dbScript(db_sql["Q3"], { var1: id });
    let findSuperAdmin = await connection.query(s1);
    if (findSuperAdmin.rowCount > 0) {
      let s2 = dbScript(db_sql["Q30"], {
        var1: mysql_real_escape_string(name),
        var2: mysql_real_escape_string(email.toLowerCase()),
        var3: avatar ? mysql_real_escape_string(avatar) : null,
        var4: id,
      });
      let updateProfile = await connection.query(s2);
      if (updateProfile.rowCount > 0) {
        await connection.query("COMMIT");
        return handleResponse(
          res,
          200,
          true,
          "Profile Updated Successfully",
          updateProfile.rows
        );
      } else {
        await connection.query("ROLLBACK");
        return handleSWRError(res);
      }
    } else {
      return handleResponse(res, 401, false, "Super Admin Not Found");
    }
  } catch (error) {
    await connection.query("ROLLBACK");
    return handleCatchErrors(res, error);
  }
};

module.exports.uploadSAProfile = async (req, res) => {
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
    let path = `${process.env.SUP_ADMIN_AVATAR_LINK}/${file.filename}`;
    return handleResponse(
      res,
      201,
      true,
      "Profile Pic uploaded successfully.",
      path
    );
  } catch (error) {
    await connection.query("ROLLBACK");
    return handleCatchErrors(res, error);
  }
};
/*   Company & Company Admin Section  */
module.exports.createCompany = async (req, res) => {
  try {
    let { id } = req.user;
    let {
      company_name,
      company_email,
      company_contact_number,
      max_cards,
      contact_person_name,
      contact_person_email,
    } = req.body;
    if (
      !company_name ||
      !company_email ||
      !company_contact_number ||
      !max_cards ||
      !contact_person_name ||
      !contact_person_email
    ) {
      return handleResponse(res, 400, false, "Please provide all the Fields.");
    }

    let errors = await superAdminValidation.createCompanyValidation(req, res);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0].msg;
      return handleResponse(res, 400, false, firstError);
    }
    await connection.query("BEGIN");
    let s1 = dbScript(db_sql["Q3"], { var1: id });
    let findSuperAdmin = await connection.query(s1);
    if (findSuperAdmin.rowCount > 0) {
      let s2 = dbScript(db_sql["Q5"], {
        var1: mysql_real_escape_string(company_name),
        var2: mysql_real_escape_string(company_email),
      });
      let checkCompanyAlreadyExists = await connection.query(s2);
      if (checkCompanyAlreadyExists.rowCount == 0) {
        let company_logo = process.env.DEFAULT_COMPANY_LOGO;
        let cover_pic = process.env.DEFAULT_CARD_COVER_PIC;
        let s3 = dbScript(db_sql["Q6"], { var1: mysql_real_escape_string(company_name), var2: mysql_real_escape_string(company_email.toLowerCase()), var3: mysql_real_escape_string(company_contact_number), var4: max_cards, var5: mysql_real_escape_string(contact_person_name), var6: mysql_real_escape_string(contact_person_email.toLowerCase()), var7: company_logo, var8: cover_pic });
        let createCompany = await connection.query(s3);

        if (createCompany.rowCount) {
          let s3 = dbScript(db_sql["Q18"], { var1: null, var2: null, var3: null, var4: null, var5: null, var6: null, var7: null, var8: null, var9: null, var10: null, var11: null, var12: null, var13: null, var14: null, var15: createCompany.rows[0].id });
          let createSocialMedia = await connection.query(s3);
          if (createSocialMedia.rowCount > 0) {
            await connection.query("COMMIT");
            return handleResponse(res, 201, true, "Company Created Successfully", createCompany.rows);
          } else {
            await connection.query("ROLLBACK");
            return handleSWRError(res);
          }
        } else {
          await connection.query("ROLLBACK");
          return handleSWRError(res);
        }
      } else {
        return handleResponse(res, 409, false, "Company Already Exists");
      }
    } else {
      return handleResponse(res, 401, false, "Super Admin Not Found");
    }
  } catch (error) {
    await connection.query("ROLLBACK");
    return handleCatchErrors(res, error);
  }
};

module.exports.companyList = async (req, res) => {
  try {
    let { id } = req.user;
    let { status } = req.query;
    if (status !== "activated" && status !== "deactivated") {
      return handleResponse(res, 400, false, "Invalid Status");
    }

    let s1 = dbScript(db_sql["Q3"], { var1: id });
    let findSuperAdmin = await connection.query(s1);
    if (findSuperAdmin.rowCount > 0) {
      let s2 = dbScript(db_sql["Q7"], { var1: status });
      let getCompanyList = await connection.query(s2);
      if (getCompanyList.rowCount > 0) {
        return handleResponse(
          res,
          200,
          true,
          "Company Lists",
          getCompanyList.rows
        );
      } else {
        return handleResponse(res, 200, false, "Empty Company Lists", []);
      }
    } else {
      return handleResponse(res, 401, false, "Super Admin Not Found");
    }
  } catch (error) {
    return handleCatchErrors(res, error);
  }
};
//company with company admin details
module.exports.companyDetails = async (req, res) => {
  try {
    let { id } = req.user;
    let { company_id } = req.query;

    let isValidCId = isValidUUID(company_id);
    if (!isValidCId) {
      return handleResponse(res, 400, false, "Invalid Company Id");
    }

    let s1 = dbScript(db_sql["Q3"], { var1: id });
    let findSuperAdmin = await connection.query(s1);
    if (findSuperAdmin.rowCount > 0) {
      let s2 = dbScript(db_sql["Q11"], { var1: company_id });
      let getCompanyDetails = await connection.query(s2);
      if (getCompanyDetails.rowCount > 0) {
        return handleResponse(
          res,
          200,
          true,
          "Company Details",
          getCompanyDetails.rows
        );
      } else {
        return handleResponse(res, 200, false, "Empty Company Details", []);
      }
    } else {
      return handleResponse(res, 401, false, "Super Admin Not Found");
    }
  } catch (error) {
    return handleCatchErrors(res, error);
  }
};

module.exports.createCompanyAdmin = async (req, res) => {
  try {
    let { id } = req.user;
    let { first_name, last_name, email, password, mobile_number, company_id } =
      req.body;

    let isValidCId = isValidUUID(company_id);
    if (!isValidCId) {
      return handleResponse(res, 400, false, "Invalid Company Id");
    }

    let errors = await superAdminValidation.createCompanyAdminValidation(
      req,
      res
    );
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0].msg;
      return handleResponse(res, 400, false, firstError);
    }

    await connection.query("BEGIN");
    let s1 = dbScript(db_sql["Q3"], { var1: id });
    let findSuperAdmin = await connection.query(s1);
    if (findSuperAdmin.rowCount > 0) {
      let s2 = dbScript(db_sql["Q8"], { var1: company_id });
      let findCompany = await connection.query(s2);
      if (findCompany.rowCount > 0) {
        if (findCompany.rows[0].status !== "deactivated") {
          const encryptedPassword = await bcrypt.hash(password, 10);
          let avatar = process.env.DEFAULT_ADMIN_AVATAR;
          let s3 = dbScript(db_sql["Q10"], { var1: company_id });
          let isAdminAlreadyReg = await connection.query(s3);
          if (isAdminAlreadyReg.rowCount == 0) {
            let s4 = dbScript(db_sql["Q9"], {
              var1: mysql_real_escape_string(first_name),
              var2: mysql_real_escape_string(last_name),
              var3: mysql_real_escape_string(email.toLowerCase()),
              var4: encryptedPassword,
              var5: mobile_number,
              var6: company_id,
              var7: findSuperAdmin.rows[0].id,
              var8: "Admin",
              var9: avatar,
              var10: findCompany.rows[0].company_name,
            });
            let insertAdmin = await connection.query(s4);
            delete insertAdmin.rows[0].password;
            if (insertAdmin.rowCount > 0) {
              let s4 = dbScript(db_sql["Q14"], {
                var1: insertAdmin.rows[0].id,
                var2: company_id,
              });
              let updateAdminIdInCompany = await connection.query(s4);
              await connection.query("COMMIT");
              return handleResponse(
                res,
                201,
                true,
                "Company Admin Created Successfully",
                insertAdmin.rows
              );
            } else {
              await connection.query("ROLLBACK");
              return handleSWRError(res);
            }
          } else {
            return handleResponse(res, 409, false, "Admin already exists");
          }
        } else {
          return handleResponse(
            res,
            400,
            false,
            "Company Account is Deactivated"
          );
        }
      } else {
        return handleResponse(res, 404, false, "Company Not Found");
      }
    } else {
      return handleResponse(res, 401, false, "Super Admin Not Found");
    }
  } catch (error) {
    await connection.query("ROLLBACK");
    return handleCatchErrors(res, error);
  }
};

module.exports.editCompanyDetails = async (req, res) => {
  try {
    let { id } = req.user;
    let {
      company_id,
      company_name,
      company_email,
      company_contact_number,
      max_cards,
      contact_person_name,
      contact_person_email,
      description,
      company_address,
      company_logo,
      company_website,
      contact_person_designation,
      contact_person_mobile,
      latitude,
      longitude,
    } = req.body;

    let isValidCId = isValidUUID(company_id);
    if (!isValidCId) {
      return handleResponse(res, 400, false, "Invalid Company Id");
    }

    // Trimming the values
    description = trimValue(description) || null;
    company_address = trimValue(company_address) || null;
    company_logo = trimValue(company_logo) || null;
    company_website = trimValue(company_website) || null;
    contact_person_designation = trimValue(contact_person_designation) || null;
    contact_person_mobile = trimValue(contact_person_mobile) || null;
    latitude = trimValue(latitude) || null;
    longitude = trimValue(longitude) || null;

    let errors = await superAdminValidation.editCompanyDetailsValidation(
      req,
      res
    );
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0].msg;
      return handleResponse(res, 400, false, firstError);
    }

    await connection.query("BEGIN");
    let s1 = dbScript(db_sql["Q3"], { var1: id });
    let findSuperAdmin = await connection.query(s1);
    if (findSuperAdmin.rowCount > 0) {
      let s2 = dbScript(db_sql["Q8"], { var1: company_id });
      let findCompany = await connection.query(s2);
      if (findCompany.rowCount > 0) {
        if (findCompany.rows[0].used_cards > max_cards) {
          return handleResponse(
            res,
            400,
            false,
            "Maximum number of cards can not be less than used cards"
          );
        }
        let s3 = dbScript(db_sql["Q12"], {
          var1: mysql_real_escape_string(company_name),
          var2: company_email.toLowerCase(),
          var3: company_contact_number,
          var4: max_cards,
          var5: mysql_real_escape_string(contact_person_name),
          var6: contact_person_email.toLowerCase(),
          var7: description,
          var8: company_address,
          var9: company_logo,
          var10: company_website,
          var11: contact_person_designation,
          var12: contact_person_mobile,
          var13: latitude,
          var14: longitude,
          var15: company_id,
        });
        let editCompanyData = await connection.query(s3);

        if (editCompanyData.rowCount > 0) {
          await connection.query("COMMIT");
          return handleResponse(
            res,
            200,
            true,
            "Company details Updated successfully"
          );
        } else {
          await connection.query("ROLLBACK");
          return handleSWRError(res);
        }
      } else {
        return handleResponse(res, 404, false, "Company Not Found");
      }
    } else {
      return handleResponse(res, 401, false, "Super Admin Not Found");
    }
  } catch (error) {
    await connection.query("ROLLBACK");
    return handleCatchErrors(res, error);
  }
};

module.exports.deactivateCompanyAndCompanyAdmin = async (req, res) => {
  try {
    let { id } = req.user;
    let { status, company_id } = req.body;
    if (status !== "activated" && status !== "deactivated") {
      return handleResponse(res, 400, false, "Invalid Status");
    }

    let isValidCId = isValidUUID(company_id);
    if (!isValidCId) {
      return handleResponse(res, 400, false, "Invalid Company Id");
    }
    await connection.query("BEGIN");
    let s1 = dbScript(db_sql["Q3"], { var1: id });
    let findSuperAdmin = await connection.query(s1);
    if (findSuperAdmin.rowCount > 0) {
      let s2 = dbScript(db_sql["Q13"], { var1: status, var2: company_id });
      let deactivateCompany = await connection.query(s2);

      let s3 = dbScript(db_sql["Q15"], {
        var1: status == "deactivated" ? false : true,
        var2: company_id,
      });
      let deactivateCompanyAdmin = await connection.query(s3);
      if (deactivateCompany.rowCount > 0) {
        await connection.query("COMMIT");
        return handleResponse(res, 200, true, `Company ${status} successfully`);
      } else {
        await connection.query("ROLLBACK");
        return handleSWRError(res);
      }
    } else {
      return handleResponse(res, 401, false, "Super Admin Not Found");
    }
  } catch (error) {
    await connection.query("ROLLBACK");
    return handleCatchErrors(res, error);
  }
};

module.exports.editCompanyAdmin = async (req, res) => {
  try {
    let { id } = req.user;
    let { admin_id, first_name, last_name, email, phone_number } = req.body;

    let isValidCId = isValidUUID(admin_id);
    if (!isValidCId) {
      return handleResponse(res, 400, false, "Invalid Admin Id");
    }

    let errors = await superAdminValidation.editCompanyAdminValidation(
      req,
      res
    );
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0].msg;
      return handleResponse(res, 400, false, firstError);
    }

    await connection.query("BEGIN");
    let s1 = dbScript(db_sql["Q3"], { var1: id });
    let findSuperAdmin = await connection.query(s1);
    if (findSuperAdmin.rowCount > 0) {
      let s2 = dbScript(db_sql["Q28"], {
        var1: mysql_real_escape_string(first_name),
        var2: mysql_real_escape_string(last_name),
        var3: email.toLowerCase(),
        var4: phone_number,
        var5: admin_id,
      });
      let updateDetails = await connection.query(s2);
      if (updateDetails.rowCount > 0) {
        await connection.query("COMMIT");
        return handleResponse(res, 200, true, "Details Updated successfully");
      } else {
        await connection.query("ROLLBACK");
        return handleSWRError(res);
      }
    } else {
      return handleResponse(res, 401, false, "Super Admin Not Found");
    }
  } catch (error) {
    await connection.query("ROLLBACK");
    return handleCatchErrors(res, error);
  }
};

module.exports.uploadCompanyLogoForSA = async (req, res) => {
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
//cards list for particular company
module.exports.cardListsForSA = async (req, res) => {
  try {
    let { id } = req.user;
    let { company_id } = req.query;
    let isValidCId = isValidUUID(company_id);
    if (!isValidCId) {
      return handleResponse(res, 400, false, "Invalid Company Id");
    }
    let s1 = dbScript(db_sql["Q3"], { var1: id });
    let findCompanyAdmin = await connection.query(s1);
    if (findCompanyAdmin.rowCount > 0) {
      let s2 = dbScript(db_sql["Q29"], { var1: company_id });
      let cards = await connection.query(s2);
      if (cards.rowCount > 0) {
        return handleResponse(res, 200, true, "Cards Lists", cards.rows);
      } else {
        return handleResponse(res, 200, false, "Empty Cards Lists", []);
      }
    } else {
      return handleResponse(res, 401, false, "Super Admin not found");
    }
  } catch (error) {
    return handleCatchErrors(res, error);
  }
};

//card details for admin
module.exports.cardDetailsForSA = async (req, res) => {
  try {
    let { id } = req.user;
    let { card_id } = req.query;
    if (!card_id) {
      return handleResponse(res, 400, false, "Provide Valid Card Id");
    }
    let s1 = dbScript(db_sql["Q3"], { var1: id });
    let findCompanyAdmin = await connection.query(s1);
    if (findCompanyAdmin.rowCount > 0) {
      let s1 = dbScript(db_sql["Q31"], { var1: card_id, var2: false });
      let findCardDetails = await connection.query(s1);
      if (findCardDetails.rowCount > 0) {
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
      return handleResponse(res, 401, false, "Super Admin not found");
    }
  } catch (error) {
    return handleCatchErrors(res, error);
  }
};
