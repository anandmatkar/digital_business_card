const connection = require("../config/database");
const { dbScript, db_sql } = require("../utils/dbscript");
const { handleErrors } = require("../utils/response");
const { messages } = require("../utils/responseMessages");

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
        return handleErrors(res, error);
    }
}

module.exports.registerSuperAdmin = async (req, res) => {
    try {

    } catch (error) {
        return res.status(500).json({
            success: false,
            messages: error.message
        })
    }
}