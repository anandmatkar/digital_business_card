const jsonwebtoken = require("jsonwebtoken");
const connection = require("../config/database");

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
                console.log(decoded, "decoded");
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

};
module.exports = jwt;