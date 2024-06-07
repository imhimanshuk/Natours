const crypto = require('crypto');
const {promisify} = require('util');
const jwt = require('jsonwebtoken');

const User = require('./../model/userModel');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const Email = require('./../utils/email');

const signedTOken = id => {
    return jwt.sign({id : id}, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE_IN
    });
}

const createAndSendToken = (user, statusCode, res) => {
    const token = signedTOken(user._id);
    const cookieOptions = {
        expire: new Date(Date().now + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
        httpOnly: true
    };

    if(process.env.NODE_ENV === 'production') {
        cookieOptions.secure = true; // Only work with the https
    }

    res.cookie('jwt', token, cookieOptions);
    // Remove the password from the output
    user.password = undefined;

    res
        .status(statusCode)
        .json({
            status: 'success',
            token,
            data: {
                user
            }
        });
}

exports.signup = catchAsync (async(req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        role: req.body.role
    });
    const url = `${req.protocol}://${req.get('host')}/me`;
    await new Email(newUser, url).sendWelcome();

    createAndSendToken(newUser, 201, res);
});

exports.login = catchAsync(async(req, res, next) => {
    const { email, password } = req.body;
    //1) check if email and password exist
    if(!email || !password) return next(new AppError('Please provide email and password', 400));
    //2) check if the user exist and password is correct
    const user = await User.findOne({ email: email}).select('+password');

    if(!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('Incorrect email or password', 401));
    }
    //3) If true, send JWT to the client
    createAndSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
    let token;
    //1) Getting token and check if it exists
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if(!token) return next(new AppError('You are not logged in to get access', 401));
    //2) Verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    //3) Check if user still exists
    const freshUser = await User.findOne({_id : decoded.id});
    if(!freshUser) return next(new AppError('The user no longer exist', 401));
    //4) Check if user change password after token was issued
    if(await freshUser.changedPasswordAfter(decoded.iat)) return next(new AppError('Password has updated recently. Please login again', 401));

    // Grant Access to the protected route
    req.user = freshUser;
    next();
});

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        // roles ['admin', 'lead-guide']
        if(!roles.includes(req.user.role)) return next(new AppError('You are not allowed to perform this action', 403));

        next();
    }
}

exports.forgotPassword = catchAsync( async(req, res, next) => {
    //1) Get User by email
    const user = await User.findOne({email : req.body.email })
    if(!user) {
        return next(new AppError('No User exist', 404));
    }
    //2) Generate the random token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false});
    //3) Send it to user's email
    try{
        const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`; 
    
        const message = `Forgot your password? Submit your information to: ${resetURL}.\n If you didn't forget your password please ignore this mail.`
        await new Email(user, resetURL).sendReset();
        res.status(200).json({
            status: 'success',
            message: "Token send to the mail"
        });
    } catch(err) {
        user.createPasswordResetToken = undefined;
        user.passwordResetExpire = undefined;

        await user.save({ validateBeforeSave: false});

        return next(new AppError('Error in sending the email.', 500));
        // return next(new AppError(err, 500));
    }
});

exports.resetPassword = catchAsync (async (req, res, next) => {
    //1) Get user based on the token
    const hashedToken = crypto.createHash('SHA256').update(req.params.token).digest('hex');
    //2) Set the new password if the token is not expired and there is a user
    const user = await User.findOne({
        passwordResetToken: hashedToken, 
        passwordResetExpire: {$gt : Date.now()}
    });

    if(!user) {
        return next(new AppError('Token is invalid or expired', 400));
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpire = undefined;
    await user.save();
    //3) Update changedPasswordAt property
    //4) Send JWT to the client
    createAndSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async(req, res, next) => {
    //1) User from the collection
    const user = await User.findOne({_id: req.user.id}).select('+password');

    //2) Check if the posted password is correct
    if(!user || !(await user.correctPassword(req.body.passwordCurrent, user.password))) {
        return next(new AppError('Your current password is wrong', 401));
    }

    //3) If the password is correct, updated the password findByIdAndUpdate will not work as middleware and validation will not work with this method
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();
    //4) Log user in, send JWT
    createAndSendToken(user, 200, res);
});