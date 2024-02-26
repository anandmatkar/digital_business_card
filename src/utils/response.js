module.exports.handleCatchErrors = (res, error) => {
    return res.status(500).json({
        success: false,
        message: error.stack
    });
};

module.exports.handleSWRError = (res) => {
    return res.status(400).json({
        success: false,
        message: "Something went wrong"
    });
};

module.exports.handleResponse = (res, statusCode, success, message, data) => {
    return res.status(statusCode).json({
        success: success,
        message: message,
        data: data === undefined ? null : data
    });
};