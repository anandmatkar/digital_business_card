const nodemailer = require("nodemailer");
const { forgetPasswordFunction } = require("../templates/forgetPassword");

module.exports.forgetPassword = async (email, link, userName) => {
    console.log(email, link, userName, "forget password mail");
    const smtpEndpoint = "smtp.gmail.com";
    const port = 587;
    const senderAddress = process.env.SMTP_USERNAME;
    var toAddresses = email;

    let resetPass = forgetPasswordFunction(link, email, userName)

    var ccAddresses = "";
    var bccAddresses = "";

    const smtpUsername = process.env.SMTP_USERNAME;
    const smtpPassword = process.env.SMTP_PASSWORD;

    var subject = "Reset password";

    var body_text = `Please use the below link to reset your password`;

    let transporter = nodemailer.createTransport({
        host: smtpEndpoint,
        port: port,
        secure: false, // true for 465, false for other ports
        auth: {
            user: smtpUsername,
            pass: smtpPassword
        }
    });
    console.log(transporter, "trna");

    let mailOptions = {
        from: senderAddress,
        to: toAddresses,
        subject: subject,
        cc: ccAddresses,
        bcc: bccAddresses,
        text: body_text,
        html: resetPass,
        headers: {}
    };
    console.log(mailOptions, "mailOptions");
    // Send the email.
    let info = await transporter.sendMail(mailOptions)
    console.log("Message sent! Message ID: ", info.messageId);

}