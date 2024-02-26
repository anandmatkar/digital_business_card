const { query, body, validationResult } = require('express-validator');
const validator = require('validator');

const superAdminValidation = {

    /* Auth Section Validation */
    createSupAdmin: async (req, res) => {
        const validationRules = [
            body('name')
                .trim()
                .isLength({ min: 1 })
                .escape()
                .withMessage('Name is required'),
            body('email').isEmail().withMessage('Invalid email address'),
            body('password')
                .trim()
                .isLength({ min: 8 })
                .withMessage('Password must be at least 8 characters long'),
        ];

        await Promise.all(validationRules.map(validationRule => validationRule.run(req)));

        return errors = validationResult(req);

    },

    loginSuperAdminValidation: async (req, res) => {
        const validationRules = [
            body('email').trim().isLength({ min: 1 }).withMessage('Email is required'),
            body('password').trim().isLength({ min: 1 }).withMessage('Password is required'),
            body('email').trim().isEmail().withMessage('Invalid email address'),
        ];
        await Promise.all(validationRules.map(validationRule => validationRule.run(req)));

        return errors = validationResult(req);

    },


    changePasswordValidation: async (req, res) => {
        const validationRules = [
            body('oldPassword').trim().isLength({ min: 1 }).withMessage('Please Provide Old Password'),
            body('newPassword').trim().isLength({ min: 8 }).withMessage('New Password must be at least 8 characters long'),
        ];
        await Promise.all(validationRules.map(validationRule => validationRule.run(req)));

        return errors = validationResult(req);
    },

    /* Company & Company Admin Section Validation */
    createCompanyValidation:
        async (req, res) => {
            const validationRules = [
                body('company_name')
                    .trim()
                    .isLength({ min: 1 })
                    .escape()
                    .withMessage('Company Name is required'),
                body('company_email').isEmail().withMessage('Invalid Company Email address'),
                body('max_cards')
                    .isNumeric()
                    .withMessage('Max Cards must be numeric'),
                body('contact_person_name')
                    .trim()
                    .isLength({ min: 1 })
                    .escape()
                    .withMessage('Contact Person Name is required'),
                body('contact_person_email').isEmail().withMessage('Invalid Contact Person Email address'),
            ];

            await Promise.all(validationRules.map(validationRule => validationRule.run(req)));

            return errors = validationResult(req);

        },

    createCompanyAdminValidation: async (req, res) => {
        const validationRules = [
            body('first_name')
                .trim()
                .isLength({ min: 1 })
                .escape()
                .withMessage('First Name is required'),
            body('last_name')
                .trim()
                .isLength({ min: 1 })
                .escape()
                .withMessage('Last Name is required'),
            body('email').isEmail().withMessage('Invalid Email address'),
            body('password')
                .trim()
                .isLength({ min: 8 })
                .withMessage('Password must be at least 8 characters long'),
        ];

        await Promise.all(validationRules.map(validationRule => validationRule.run(req)));

        return errors = validationResult(req);

    },

    editCompanyDetailsValidation: async (req, res) => {
        const validationRules = [
            body('company_name')
                .trim()
                .isLength({ min: 1 })
                .escape()
                .withMessage('Company Name is required'),
            body('contact_person_name')
                .trim()
                .isLength({ min: 1 })
                .escape()
                .withMessage('Company Person Name is required'),
            body('company_email').isEmail().withMessage('Invalid Company Email address'),
            body('contact_person_email').isEmail().withMessage('Invalid Company Person Email address'),
            body("max_cards").isNumeric().withMessage("Provide Valid Card Number (In Digits)"),
            body('description')
                .optional()
                .trim(),
            body('company_address')
                .optional()
                .custom(value => {
                    // Check if the value contains only whitespace characters
                    if (/^\s*$/.test(value)) {
                        // Return true if it's empty or contains only whitespace
                        return true;
                    } else {
                        // Trim the value otherwise
                        return value.trim();
                    }
                })
                .withMessage('Company Address must not contain only whitespace characters'),
            body('company_logo')
                .optional()
                .trim(),
            body('company_website')
                .optional()
                .trim(),
            body('contact_person_designation')
                .optional()
                .trim(),
            body('contact_person_mobile')
                .optional()
                .trim(),
            body('latitude')
                .optional()
                .trim()
                .isNumeric()
                .withMessage('Latitude must be a number'),
            body('longitude')
                .optional()
                .trim()
                .isNumeric()
                .withMessage('Longitude must be a number'),
        ];

        await Promise.all(validationRules.map(validationRule => validationRule.run(req)));

        return errors = validationResult(req);
    },




}

const companyAdminValidation = {
    loginCompanyAdminValidation: async (req, res) => {
        const validationRules = [
            body("email")
                .trim()
                .isLength({ min: 1 })
                .withMessage("Email is required"),
            body("password")
                .trim()
                .isLength({ min: 1 })
                .withMessage("Password is required"),
            body("email").trim().isEmail().withMessage("Invalid email address"),
        ];
        await Promise.all(
            validationRules.map((validationRule) => validationRule.run(req))
        );

        return (errors = validationResult(req));
    },
    forgetPasswordCAValidation: async (req, res) => {
        const validationRules = [
            body("email")
                .trim()
                .isLength({ min: 1 })
                .withMessage("Email is required"),
            body("email").trim().isEmail().withMessage("Invalid email address"),
        ];
        await Promise.all(
            validationRules.map((validationRule) => validationRule.run(req))
        );

        return (errors = validationResult(req));
    },
    resetPasswordCAValidation: async (req, res) => {
        const validationRules = [
            body("resetToken")
                .trim()
                .isLength({ min: 1 })
                .withMessage("resetToken is required"),
            body("password")
                .trim()
                .isLength({ min: 1 })
                .withMessage("Password is required"),
        ];
        await Promise.all(
            validationRules.map((validationRule) => validationRule.run(req))
        );

        return (errors = validationResult(req));
    },
    changePasswordCAValidation: async (req, res) => {
        const validationRules = [
            body("old_password")
                .trim()
                .isLength({ min: 1 })
                .withMessage("Old Password is required"),
            body("new_password")
                .trim()
                .isLength({ min: 1 })
                .withMessage("New Password is required"),
            body("new_password")
                .trim()
                .isLength({ min: 8 })
                .withMessage("Password Must Be 8 Character Long"),
        ];
        await Promise.all(
            validationRules.map((validationRule) => validationRule.run(req))
        );

        return (errors = validationResult(req));
    },
    editProfileCAValidation: async (req, res) => {
        const validationRules = [
            body("first_name")
                .trim()
                .isLength({ min: 1 })
                .escape()
                .withMessage("First Name is required"),
            body("last_name")
                .trim()
                .isLength({ min: 1 })
                .escape()
                .withMessage("Last Name is required"),
            body("email")
                .trim()
                .isLength({ min: 1 })
                .escape()
                .withMessage("Email is required")
                .isEmail()
                .withMessage("Email is Not Valid"),
            body("phone_number")
                .trim()
                .optional()
                .isMobilePhone("any", { strictMode: false })
                .withMessage("Phone Number is not valid"),
            body("mobile_number")
                .trim()
                .optional()
                .isMobilePhone("any", { strictMode: false })
                .withMessage("Mobile Number is not valid"),
        ];

        await Promise.all(
            validationRules.map((validationRule) => validationRule.run(req))
        );

        return validationResult(req);
    },
};

const cardValidation = {
    /* Auth Section Validation */
    createCardVal: async (req, res) => {
        const validationRules = [
            body('first_name')
                .trim()
                .isLength({ min: 1 })
                .escape()
                .withMessage('First Name is required'),
            body('last_name')
                .trim()
                .isLength({ min: 1 })
                .escape()
                .withMessage('Last Name is required'),
            body('user_email').isEmail().withMessage('Invalid email address'),
            body('designation').trim().isLength({ min: 2 }).withMessage('Designation must be at least 2 characters long'),
            body('bio').trim().isLength({ min: 1 }).withMessage('Bio is required'),
            body('contact_number').trim().isLength({ min: 10 }).withMessage('Contact Number is required'),


        ];

        await Promise.all(validationRules.map(validationRule => validationRule.run(req)));

        return errors = validationResult(req);

    },
}

const trimValue = (value) => {
    if (value && typeof value === 'string') {
        return value.trim();
    }
    return value;
}

module.exports = {
    superAdminValidation,
    trimValue,
    companyAdminValidation,
    cardValidation
}