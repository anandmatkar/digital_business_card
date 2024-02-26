const jsonwebtoken = require("jsonwebtoken");
const connection = require("../config/database");
const { db_sql, dbScript } = require("../utils/dbscript");


const jwt = {
    //create token
    issueJWT: async (user) => {
        let payload = {
            id: user.id,
            email: user.email,
            role: user.role,
        };
        const expiresIn = 60 * 60 * 24;
        const jwtToken = jsonwebtoken.sign(payload, process.env.JWT_KEY, { expiresIn })
        return jwtToken;
    },

    //verify Token function for super admin
    verifyTokenForSA: async (req, res, next) => {
        var token = req.headers.authorization
        jsonwebtoken.verify(token, process.env.JWT_KEY, function (err, decoded) {
            if (err) {
                return res.status(401).json({
                    success: false,
                    message: "Session timed out. Please sign in again",
                });
            } else {
                if (decoded.role !== "superadmin") {
                    return res.status(401).json({
                        success: false,
                        message: "Unauthorized Access",
                    });
                }
                req.user = {
                    id: decoded.id,
                    email: decoded.email,
                    role: decoded.role
                }
                return next();

            }
        });
    },

    //verify Token function for company admin
    verifyTokenForCA: async (req, res, next) => {
        var token = req.headers.authorization
        jsonwebtoken.verify(token, process.env.JWT_KEY, function (err, decoded) {
            if (err) {
                return res.status(401).json({
                    success: false,
                    message: "Session timed out. Please sign in again",
                });
            } else {
                if (decoded.role !== "Admin") {
                    return res.status(401).json({
                        success: false,
                        message: "Unauthorized Access",
                    });
                }
                req.user = {
                    id: decoded.id,
                    email: decoded.email,
                    role: decoded.role
                }
                const checkDeactivated = async (id) => {
                    try {
                        let s1 = dbScript(db_sql['Q16'], { var1: id });
                        let findAdmin = await connection.query(s1);
                        return findAdmin.rows[0].status;
                    } catch (error) {
                        console.error(error);
                        return false;
                    }
                };
                (async () => {
                    let status = await checkDeactivated(req.user.id)
                    if (status == 'deactivated') {
                        return res.status(401).json({
                            success: false,
                            message: "Deactivated Account Please Contact Super Admin.",
                        });
                    } else {
                        next()
                    }
                })();
            }
        });
    },

    verifyPassResTokenCA: async (req) => {
        let token =
            req.body && req.body.resetToken
                ? req.body.resetToken
                : req.headers.authorization;
        let user = await jsonwebtoken.verify(
            token,
            process.env.JWT_KEY,
            function (err, decoded) {
                if (err) {
                    return 0;
                } else {
                    var decoded = {
                        id: decoded.id,
                        email: decoded.email,
                        role: decoded.role,
                    };
                    return decoded;
                }
            }
        );
        return user;
    },

};
module.exports = jwt;