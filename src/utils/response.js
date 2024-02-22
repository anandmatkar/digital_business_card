module.exports.handleErrors = (res, error) => {
    return res.status(500).json({
        success: false,
        messages: error.message
    });
};