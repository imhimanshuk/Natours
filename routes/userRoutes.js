const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');

const router = express.Router();

router
    .post('/signup', authController.signup)
    .post('/login', authController.login)
    .post('/forgotPassword', authController.forgotPassword)
    .patch('/resetPassword/:token', authController.resetPassword);

//Protect all route after this middelware
router.use(authController.protect);

router
    .patch('/updateMyPassword', authController.updatePassword);

router.get('/me', userController.getMe, userController.getUser);

router
    .patch('/updateMe', userController.uploadPhoto,
                        userController.resizeUserPhoto, 
                        userController.updateMe);

router
    .delete('/deleteMe', userController.deleteMe);

router.use(authController.restrictTo('admin'));

router
    .route('/')
    .get(userController.getAllUsers)
    .post(userController.createUser);

router
    .route('/:id')
    .get(userController.getUser)
    .patch(userController.updateUser)
    .delete(userController.deleteUser);

module.exports = router;
