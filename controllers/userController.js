const AppError = require('../utils/appError');
const multer = require('multer');
const User = require('./../model/userModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const sharp = require('sharp');

// const multerStorage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, 'public/img/users')
//     },
//     filename: (req, file, cb) => {
//         //user-userid-timestamp.ext
//         const extension = file.mimetype.split('/')[1];
//         cb(null, `user-${req.user.id}-${Date.now()}.${extension}`);
//     }
// });

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
    if(file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(new AppError('No an image! Please upload only images.', 400), false);
    }
}

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
});

exports.uploadPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
    if(!req.file) return next();
    req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

    await sharp(req.file.buffer)
        .resize(500, 500)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/users/${req.file.filename}`);

    next();
});

const filterObj = (obj, ...allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach(el => {
        if(allowedFields.includes(el)) newObj[el] = obj[el];
    });
    return newObj;
}

exports.getMe = (req, res, next) => {
    req.params.id = req.user.id;
};

exports.getAllUsers = factory.getAll(User);

exports.updateMe = catchAsync(async(req, res, next) => {
    //1) Create Error if user post password data
    if(req.body.password || req.body.passwordConfirm) return next(AppError('This is not for password update', 400));
    //2) Update user data
    const filteredBody = filterObj(req.body, 'name', 'email');
    
    if(req.file) filteredBody.photo = req.file.filename;

    const updateUser = await User.findByIdAndUpdate(
                                req.user.id, 
                                filteredBody, 
                                {
                                    new: true, 
                                    runValidators: true
                                }
                            );
    
    res.status(200).json({
        status: "success",
        data: {
            user:  updateUser
        }
    });
});

exports.deleteMe = catchAsync(async(req, res, next) => {
    await User.findByIdAndUpdate(
                                req.user.id, 
                                {active: false}
                            );
    
    res.status(204).json({
        status: "success",
        data: null
    });
});


exports.createUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: 'This route is not yet defined! Please use signup instead'
    })
}
exports.getUser = factory.getOne(User);


// Do not update passwords with this!
exports.updateUser = factory.updateOne(User);

exports.deleteUser = factory.deleteOne(User);
