const stripe = require('stripe')(process.env.STRIP_SECRET_KEY);
const Tour = require('./../model/tourModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
    const tour = await Tour.findById(req.params.tourId);

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        success_url: `${req.protocol}://${req.get('host')}/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}`,
        cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
        customer_email: req.user.email,
        client_reference_id: req.params.tourId,
        line_items:[
            {
                name: `${tour.name} Tour`,
                description: `${tour.summary}`,
                images: [''],
                amount: tour.price * 100,
                currency: 'usd',
                quantity: 1
            }
        ]
    });

    res.status(200).json({
        status: 'success',
        session
    })
});

exports.createBookingCheckout = catchAsync( async(req, res, next) => {
    const {tour, user, price} = req.query;

    if(!tour && !user && !price) return next();

    await Booking.create({tour, user, price});
    res.redirect(req.originalUrl.split('?')[0]);
});