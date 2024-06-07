const AppError = require("../utils/appError");

const handleCastErrorDB = err => {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new AppError(message, 400);
}
const handleduplicateFieldDB = err => {
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
    const message = `Duplicate field value: ${value} Please use another value`;
    return new AppError(message, 400);
}

const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map(el => el.message);

    const message = `Invalid Input Data. ${errors.join('. ')}`;
    return new AppError(message, 400);
}

const handleJsonWebTokenError = () => new AppError('Invalid token. Please login again', 401);

const handleTokenExpireError = () => new AppError('Your token is expire. Please login again');

const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    });
};

const sendErrorProd = (err, res) => {
    // Operational, trusted error: Send message to the client
    if(err.isProductional) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        });
    } else {
        // Programming or other unknown error: Don't leak error details
        // 1) Log Error
        console.log('ERROR', err);
        // 2) Send generic message
        res.status(500).json({
            status: 'error',
            message: 'Something went wrong'
        });
    }
};

module.exports  = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    
    if(process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else if(process.env.NODE_ENV === 'production') {
        let error = {...err};
        if(error.name === 'CastError') error = handleCastErrorDB(error);
        if(error.code === 11000) error = handleduplicateFieldDB(error);
        if(error.name === 'ValidationError') error = handleValidationErrorDB(error);
        if(error.name === 'JsonWebTokenError') error = handleJsonWebTokenError(error);
        if(error.name === 'TokenExpireError') error = handleTokenExpireError(error);
        sendErrorProd(error, res);
    }
}