const connection = require("../config/database");
const { issueJWT, verifyPassResTokenCA } = require("../middleware/authMiddleware");
const { generateQRCode, isValidUUID, formatCompanyName, generateVCard } = require("../utils/helpers");
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
                    return handleResponse(res, 200, true, "Logged In Successfully", findCompanyAdmin.rows[0]
                    );
                } else {
                    return handleResponse(res, 403, false, "Invalid Credentials");
                }
            } else {
                return handleResponse(res, 400, false, "Account Deactivated Please Contact Administrator"
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
        let s1 = dbScript(db_sql_ca["Q2"], { var1: (id) });
        let findCompanyAdmin = await connection.query(s1);
        if (findCompanyAdmin.rowCount > 0) {
            return handleResponse(res, 200, true, "CompanyAdmin Profile Details", findCompanyAdmin.rows[0]
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

        let errors = await companyAdminValidation.forgetPasswordCAValidation(req, res);

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
                const link = `${process.env.FORGET_PASSWORD_LINK}/${resetToken}`
                forgetPassword(email.toLowerCase(), link, findCompanyAdmin.rows[0].first_name)

                return handleResponse(res, 200, true, "Reset Password Link has been sent to the email.");
            } else {
                return handleResponse(res, 401, false, "Account is Deactivated, Please Contact your administrator");
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
            return handleResponse(res, 400, false, "Password Reset Token is required.");
        }

        let companyAdmin = await verifyPassResTokenCA(req);

        if (!companyAdmin || companyAdmin.role !== "Admin") {
            return handleResponse(res, 401, false, "Invalid or Unauthorized Token");
        }
        if (companyAdmin) {

            let errors = await companyAdminValidation.resetPasswordCAValidation(req, res);

            if (!errors.isEmpty()) {
                const firstError = errors.array()[0].msg;
                return handleResponse(res, 400, false, firstError);
            }
            await connection.query("BEGIN");
            let s1 = dbScript(db_sql_ca["Q3"], { var1: companyAdmin.id });
            let findCompanyAdmin = await connection.query(s1);
            if (findCompanyAdmin.rows[0]) {
                let hashedPassword = await bcrypt.hash(password, 10);
                let s2 = dbScript(db_sql_ca["Q4"], { var1: companyAdmin.id, var2: hashedPassword, });
                let resetPasswordCA = await connection.query(s2);
                if (resetPasswordCA.rowCount > 0) {
                    await connection.query("COMMIT");
                    handleResponse(res, 200, true, "Password Reset Successfully", resetPasswordCA.rows);
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

        let errors = await companyAdminValidation.changePasswordCAValidation(req, res);

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

                let s2 = dbScript(db_sql_ca["Q4"], { var1: id, var2: hashedPassword, });
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
            return handleResponse(res, 400, false, "Please Provide First Name and Last Name and Email");
        }
        // Trimming the values
        first_name = trimValue(first_name);
        last_name = trimValue(last_name);
        email = trimValue(email);

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
        const validExtensions = ['jpg', 'jpeg', 'png'];
        const fileExtension = file.originalname.split('.').pop().toLowerCase();
        if (!validExtensions.includes(fileExtension)) {
            fs.unlinkSync(file.path);
            return res.status(400).json({
                success: false,
                message: "Only JPG, JPEG, and PNG files are allowed."
            });
        }

        let path = `${process.env.COMPANY_ADMIN_AVATAR}/${file.filename}`;
        return handleResponse(res, 201, true, "Avatar uploaded successfully.", path);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

/** ==== Company ===== */

module.exports.uploadCompanyLogo = async (req, res) => {
    try {
        let file = req.file;
        const validExtensions = ['jpg', 'jpeg', 'png'];
        const fileExtension = file.originalname.split('.').pop().toLowerCase();
        if (!validExtensions.includes(fileExtension)) {
            fs.unlinkSync(file.path);
            return res.status(400).json({
                success: false,
                message: "Only JPG, JPEG, and PNG files are allowed."
            });
        }

        let path = `${process.env.COMPANY_LOGO_LINK}/${file.filename}`;
        return handleResponse(res, 201, true, "Company Logo uploaded successfully.", path);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

//edit company details

module.exports.editCompanyDetails = async (req, res) => {
    try {
        let { id } = req.user;
        let { company_id, company_name, company_email, description, company_address, company_logo, company_website, location, latitude, longitude, company_contact_number } = req.body
        if (!company_id || !company_name || !company_email || !company_contact_number || !company_address || !company_logo || !location) {
            return handleResponse(res, 400, false, "Please provide all the Fields.")
        }

        let isValidCId = isValidUUID(company_id)
        if (!isValidCId) {
            return handleResponse(res, 400, false, "Invalid Company Id")
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
            let s1 = dbScript(db_sql["Q27"], { var1: mysql_real_escape_string(company_name), var2: mysql_real_escape_string(company_email.toLowerCase()), var3: description ? mysql_real_escape_string(description) : null, var4: mysql_real_escape_string(company_address), var5: company_logo, var6: company_website ? mysql_real_escape_string(company_website) : null, var7: location, var8: latitude ? latitude : null, var9: longitude ? longitude : null, var10: company_contact_number, var11: id, var12: company_id });
            let updateCompanyDetails = await connection.query(s1);
            if (updateCompanyDetails.rowCount > 0) {
                await connection.query("COMMIT")
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
        return handleCatchErrors(res, error);
    }
}

module.exports.companyDetails = async (req, res) => {
    try {
        let { id } = req.user;
        let s1 = dbScript(db_sql["Q16"], { var1: id });
        let findCompanyAdmin = await connection.query(s1);
        if (findCompanyAdmin.rowCount > 0) {
            return handleResponse(res, 200, true, "Company Details", findCompanyAdmin.rows);
        } else {
            return handleResponse(res, 401, false, "Admin not found");
        }
    } catch (error) {
        return handleCatchErrors(res, error);
    }
}


/** ========card section===== */

module.exports.createCard = async (req, res) => {
    try {
        let { id } = req.user;
        let { first_name, last_name, user_email, designation, bio, cover_pic, profile_picture, contact_number, fb_link, insta_link, linkedin_link, whatsapp, youtube, xiao_hong_shu, tiktok, wechat, line, telegram, webio, twitter, extra_link_title, extra_link_url,
        } = req.body;
        await connection.query("BEGIN");
        let s1 = dbScript(db_sql["Q16"], { var1: id });
        let findCompanyAdmin = await connection.query(s1);
        if (findCompanyAdmin.rowCount > 0) {
            let usedCards = findCompanyAdmin.rows[0].used_cards;
            let maxCards = findCompanyAdmin.rows[0].max_cards;
            if (usedCards >= maxCards) {
                return handleResponse(res, 400, false, "Maximum cards limit reached for this company"
                );
            }

            let errors = await cardValidation.createCardVal(req, res);
            if (!errors.isEmpty()) {
                const firstError = errors.array()[0].msg;
                return handleResponse(res, 400, false, firstError);
            }

            let companyName = formatCompanyName(findCompanyAdmin.rows[0].company_name)
            let company_ref = companyName;
            const card_ref = randomstring.generate({
                length: 5,
                charset: "alphanumeric",
            });
            let qrCodeLink = `${process.env.LINK_INSIDE_QR_CODE}/${companyName}/${card_ref}`; //link which will be seen after scanning qr code
            let databaseLinkQR = `${process.env.DATABASE_LINK_FOR_QR}/${companyName}/${card_ref}.png`; //link of qr code saved in backend folder
            let qrCodeDirectory = path.join(__dirname, "../../", "./uploads", "qrCode", companyName
            );
            let qrCodeFileName = `${card_ref}.png`;
            let card_link = `${process.env.LINK_INSIDE_QR_CODE}/${companyName}/${card_ref}`;

            fs.mkdirSync(qrCodeDirectory, { recursive: true });

            let qrSuccess = await generateQRCode(
                qrCodeLink,
                qrCodeDirectory,
                qrCodeFileName
            );
            if (qrSuccess) {
                cover_pic = cover_pic ? cover_pic : process.env.DEFAULT_CARD_COVER_PIC;
                profile_picture = profile_picture
                    ? profile_picture
                    : process.env.DEFAULT_USER_PROFILE_PIC;
                let created_by =
                    findCompanyAdmin.rows[0].company_admin_data[0].company_admin_id;

                let s2 = dbScript(db_sql["Q17"], {
                    var1: findCompanyAdmin.rows[0].id, var2: created_by, var3: card_ref, var4: mysql_real_escape_string(first_name), var5: mysql_real_escape_string(last_name), var6: mysql_real_escape_string(user_email.toLowerCase()), var7: mysql_real_escape_string(designation), var8: mysql_real_escape_string(bio), var9: databaseLinkQR, var10: "user", var11: mysql_real_escape_string(cover_pic), var12: mysql_real_escape_string(profile_picture), var13: card_link, var14: null, var15: company_ref, var16: contact_number,
                });
                let insertData = await connection.query(s2);
                if (insertData.rowCount > 0) {
                    if (fb_link || insta_link || extra_link_title || linkedin_link || whatsapp || youtube || xiao_hong_shu || tiktok || wechat || line || telegram || webio || twitter) {
                        fb_link = fb_link || null;
                        insta_link = insta_link || null;
                        linkedin_link = linkedin_link || null;
                        whatsapp = whatsapp || null
                        youtube = youtube || null
                        xiao_hong_shu = xiao_hong_shu || null
                        tiktok = tiktok || null
                        wechat = wechat || null
                        line = line || null
                        telegram = telegram || null
                        webio = webio || null
                        twitter = twitter = null
                        extra_link_title = extra_link_title || null;
                        extra_link_url = extra_link_url || null;
                        let s3 = dbScript(db_sql["Q18"], {
                            var1: mysql_real_escape_string(fb_link) ? mysql_real_escape_string(fb_link) : null,
                            var2: mysql_real_escape_string(insta_link) ? mysql_real_escape_string(insta_link) : null,
                            var3: extra_link_title ? mysql_real_escape_string(extra_link_title) : null,
                            var4: extra_link_url ? mysql_real_escape_string(extra_link_url) : null,
                            var5: linkedin_link ? mysql_real_escape_string(linkedin_link) : null,
                            var6: twitter ? mysql_real_escape_string(twitter) : null,
                            var7: telegram ? mysql_real_escape_string(telegram) : null,
                            var8: whatsapp ? whatsapp : null,
                            var9: youtube ? mysql_real_escape_string(youtube) : null,
                            var10: tiktok ? mysql_real_escape_string(tiktok) : null,
                            var11: line ? mysql_real_escape_string(line) : null,
                            var12: wechat ? wechat : null,
                            var13: xiao_hong_shu ? mysql_real_escape_string(xiao_hong_shu) : null,
                            var14: webio ? mysql_real_escape_string(webio) : null,
                            var15: insertData.rows[0].id
                        });

                        let inserSocialMediaLinks = await connection.query(s3);
                    }
                    let s4 = dbScript(db_sql["Q20"], {
                        var1: Number(usedCards) + 1, var2: findCompanyAdmin.rows[0].id,
                    });
                    let updateCardCount = await connection.query(s4);
                    await connection.query("COMMIT");
                    return handleResponse(res, 201, true, "Card Created Successfully", insertData.rows[0]
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
            let s1 = dbScript(db_sql["Q31"], { var1: card_id, var2: false, });
            let findCardDetails = await connection.query(s1);
            if (findCardDetails.rowCount > 0) {
                if (findCardDetails.rows[0].is_active_for_qr) {
                    return handleResponse(res, 200, true, "Card Details", findCardDetails.rows[0]
                    );
                } else {
                    delete findCardDetails.rows[0].qr_url;
                    return handleResponse(res, 200, true, "Card Details", findCardDetails.rows[0]
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
                    var1: findCompanyAdmin.rows[0].used_cards - 1, var2: findCompanyAdmin.rows[0].id,
                });
                let reduceUsedCardCount = await connection.query(s3);
                if (reduceUsedCardCount.rowCount > 0) {
                    await connection.query("COMMIT");
                    return handleResponse(res, 200, true, "Card Deactivated Successfully."
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
        let { comp_name, card_ref } = req.body;
        if (!card_ref || !comp_name) {
            return handleResponse(res, 400, false, "Provide Valid Card and Company Input");
        }

        let s1 = dbScript(db_sql["Q19"], {
            var1: mysql_real_escape_string(comp_name), var2: mysql_real_escape_string(card_ref), var3: false,
        });
        let findCardDetails = await connection.query(s1);
        if (findCardDetails.rowCount > 0) {
            if (findCardDetails.rows[0].is_active_for_qr) {
                return handleResponse(res, 200, true, "Card Details", findCardDetails.rows[0]
                );
            } else {
                delete findCardDetails.rows[0].qr_url;
                return handleResponse(res, 200, true, "Card Details", findCardDetails.rows[0]
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
        let { card_id, first_name, last_name, user_email, designation, bio, cover_pic, profile_picture, contact_number
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
                let s3 = dbScript(db_sql["Q26"], {
                    var1: mysql_real_escape_string(first_name), var2: mysql_real_escape_string(last_name), var3: mysql_real_escape_string(user_email.toLowerCase()), var4: mysql_real_escape_string(designation), var5: profile_picture, var6: (JSON.stringify(bio)), var7: cover_pic, var8: contact_number, var9: card_id
                });
                let editCardDetails = await connection.query(s3);
                if (editCardDetails.rowCount > 0) {
                    await connection.query("COMMIT")
                    return handleResponse(res, 200, true, "Card Updated Successfully");
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
}

//file upload for card section

module.exports.uploadCardProfilePicture = async (req, res) => {
    try {
        let file = req.file
        const validExtensions = ['jpg', 'jpeg', 'png'];
        const fileExtension = file.originalname.split('.').pop().toLowerCase();
        if (!validExtensions.includes(fileExtension)) {
            fs.unlinkSync(file.path);
            return res.status(400).json({
                success: false,
                message: "Only JPG, JPEG, and PNG files are allowed."
            });
        }
        let path = `${process.env.CARD_PROFILE_PIC_LINK}/${file.filename}`;
        return handleResponse(res, 201, true, "Card Profile Pic uploaded successfully.", path);
    } catch (error) {
        res.json({
            success: false,
            status: 400,
            message: error.message
        })
    }
}

module.exports.uploadCardCoverPicture = async (req, res) => {
    try {
        let file = req.file
        const validExtensions = ['jpg', 'jpeg', 'png'];
        const fileExtension = file.originalname.split('.').pop().toLowerCase();
        if (!validExtensions.includes(fileExtension)) {
            fs.unlinkSync(file.path);
            return res.status(400).json({
                success: false,
                message: "Only JPG, JPEG, and PNG files are allowed."
            });
        }
        let path = `${process.env.CARD_COVER_PIC_LINK}/${file.filename}`;
        return handleResponse(res, 201, true, "Card Cover Pic uploaded successfully.", path);
    } catch (error) {
        res.json({
            success: false,
            status: 400,
            message: error.message
        })
    }
}

// Your endpoint handler
module.exports.vcf = async (req, res) => {
    try {
        let { card_id } = req.query;
        let s2 = dbScript(db_sql["Q31"], { var1: card_id, var2: false });
        let findCardDetails = await connection.query(s2);
        if (findCardDetails.rowCount > 0) {
            let vCardString = generateVCard(findCardDetails.rows[0]);
            res.set('Content-Type', 'text/vcard');
            res.set('Content-Disposition', `attachment; filename=${findCardDetails.rows[0].first_name}_${findCardDetails.rows[0].last_name}.vcf`);
            res.send(vCardString);
        } else {
            return handleResponse(res, 404, false, "No cards Found");
        }
    } catch (error) {
        return handleCatchErrors(res, error);
    }
};





