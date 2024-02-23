const { query, body, validationResult } = require('express-validator');
const validator = require('validator');

const superAdminValidation = {

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

    loginUserValidation: async (req, res) => {
        const validationRules = [
            body('email').trim().isLength({ min: 1 }).withMessage('Email is required'),
            body('password').trim().isLength({ min: 1 }).withMessage('Password is required'),
            body('email').trim().isEmail().withMessage('Invalid email address'),
            body('password').trim().isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
        ];
        await Promise.all(validationRules.map(validationRule => validationRule.run(req)));

        return errors = validationResult(req);

    },

    editUserValidation: async (req, res) => {
        const validationRules = [
            body('first_name').trim().isLength({ min: 1 }).withMessage('First name is required'),
            body('last_name').trim().isLength({ min: 1 }).withMessage('Last name is required'),
            body('email').trim().isEmail().withMessage('Invalid email address'),
        ];
        await Promise.all(validationRules.map(validationRule => validationRule.run(req)));

        return errors = validationResult(req);

    },

    changePasswordValidation: async (req, res) => {
        const validationRules = [
            body('currentPassword').trim().isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
        ];
        await Promise.all(validationRules.map(validationRule => validationRule.run(req)));

        return errors = validationResult(req);

    },

    forgetPasswordValidation: async (req, res) => {
        const validationRules = [
            body('email').trim().isLength({ min: 1 }).withMessage('Email is required'),
            body('email').trim().isEmail().withMessage('Invalid email address'),
        ];
        await Promise.all(validationRules.map(validationRule => validationRule.run(req)));

        return errors = validationResult(req);

    },

    resetPasswordValidation: async (req, res) => {
        const validationRules = [
            body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
        ];
        await Promise.all(validationRules.map(validationRule => validationRule.run(req)));

        return errors = validationResult(req);

    },

    resetPasswordWithOtpValidation: async (req, res) => {
        const validationRules = [
            body('email').trim().isLength({ min: 1 }).withMessage('Email is required'),
            body('email').trim().isEmail().withMessage('Invalid email address'),
            body('otp').trim().isLength({ min: 6 }).withMessage('Please enter correct 6 digit OTP'),
            body('password').trim().isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
        ];
        await Promise.all(validationRules.map(validationRule => validationRule.run(req)));

        return errors = validationResult(req);

    },



}

module.exports = {
    superAdminValidation
}