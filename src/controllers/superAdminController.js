const connection = require("../config/database");
const { issueJWT } = require("../middleware/authMiddleware");
const { superAdminValidation } = require("../middleware/validation");
const { dbScript, db_sql } = require("../utils/dbscript");
const { mysql_real_escape_string } = require("../utils/helpers");
const { handleCatchErrors, handleSWRError, handleResponse } = require("../utils/response");
const { messages } = require("../utils/responseMessages");
const bcrypt = require('bcrypt')

/* check whether superadmin is already registered */
module.exports.isSupReg = async (req, res) => {
    try {
        let s1 = dbScript(db_sql['Q0'], {})
        let isSuperAdminRegistered = await connection.query(s1)
        if (isSuperAdminRegistered.rowCount > 0) {
            return res.status(200).json({
                success: true,
                messages: "SuperAdmin Already Registered",
                isRegistered: true
            })
        } else {
            return res.status(200).json({
                success: true,
                messages: "SuperAdmin Not Registered",
                isRegistered: false
            })
        }
    } catch (error) {
        return handleCatchErrors(res, error);
    }
}

module.exports.registerSuperAdmin = async (req, res) => {
    try {
        let { name, email, password, avatar } = req.body
        let s1 = dbScript(db_sql['Q0'], {})
        let isSuperAdminRegistered = await connection.query(s1)
        if (isSuperAdminRegistered.rowCount > 0) {
            return handleResponse(res, 409, false, "Super Admin already Registered")
        } else {
            let errors = await superAdminValidation.createSupAdmin(req, res)
            if (!errors.isEmpty()) {
                const firstError = errors.array()[0].msg;
                return handleResponse(res, 400, false, firstError)
            }
            await connection.query("BEGIN")
            let s2 = dbScript(db_sql['Q1'], { var1: mysql_real_escape_string(email.toLowerCase()) })
            let isAlreadyRegistered = await connection.query(s2)
            if (isAlreadyRegistered.rowCount == 0) {
                avatar = avatar ? avatar : process.env.DEFAULT_SUP_ADMIN_AVATAR
                const encryptedPassword = await bcrypt.hash(password, 10);
                let s3 = dbScript(db_sql['Q3'], { var1: mysql_real_escape_string(name), var2: mysql_real_escape_string(email.toLowerCase()), var3: encryptedPassword, var4: mysql_real_escape_string(avatar) })
                let registerSuperAdmin = await connection.query(s3)
                if (registerSuperAdmin.rowCount > 0) {
                    await connection.query("COMMIT")
                    return handleResponse(res, 201, true, "Super Admin registration successful")
                } else {
                    await connection.query("ROLLBACK")
                    return handleSWRError(res);
                }
            } else {
                return handleResponse(res, 409, false, "Super Admin already Registered")
            }
        }
    } catch (error) {
        await connection.query("ROLLBACK")
        return handleCatchErrors(res, error);
    }
}

module.exports.loginSuperAdmin = async (req, res) => {
    try {
        let { email, password } = req.body
        if (!email || !password) {
            return handleResponse(res, 404, false, "Email or Password are required.")
        }
        let s1 = dbScript(db_sql['Q1'], { var1: mysql_real_escape_string(email.toLowerCase()) })
        let findSuperAdmin = await connection.query(s1)
        if (findSuperAdmin.rowCount > 0) {
            let matchPassword = await bcrypt.compare(password, findSuperAdmin.rows[0].password)
            if (matchPassword) {
                let user = {
                    id: findSuperAdmin.rows[0].id,
                    email: findSuperAdmin.rows[0].email,
                    role: 'superadmin'
                }
                let token = await issueJWT(user)
                findSuperAdmin.rows[0].token = token
                delete findSuperAdmin.rows[0].password;
                return handleResponse(res, 200, true, "Logged In Successfully", findSuperAdmin.rows[0]);
            } else {
                return handleResponse(res, 409, false, "Invalid Credentials")
            }
        } else {
            return handleResponse(res, 409, false, "Invalid Credentials")
        }
    } catch (error) {
        return handleCatchErrors(res, error);
    }
}

module.exports.showSAProfile = async (req, res) => {
    try {
        let { id, role } = req.user
        let s1 = dbScript(db_sql['Q4'], { var1: id })
        let findSuperAdmin = await connection.query(s1)
        if (findSuperAdmin.rowCount > 0) {
            return handleResponse(res, 200, true, "SuperAdmin Profile Details", findSuperAdmin.rows[0])
        } else {
            return handleResponse(res, 404, false, "Super Admin Not Found")
        }
    } catch (error) {
        return handleCatchErrors(res, error);
    }
}


