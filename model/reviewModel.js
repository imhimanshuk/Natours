const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
    {
        review : {
            type: String,
            required: [true, 'Review can not be empty']
        },
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        createdAt: {
            type: Date,
            default: Date.now()},
        tour:{
            type: mongoose.Schema.ObjectId,
            ref: 'Tour',
            required: [true, 'Review must belongs to a tour']
        },
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, 'Review must belongs to a user']
        }
    },
    {
        toJSON: {virtuals: true},
        toObject: {virtuals: true}
    }
);

reviewSchema.index({
    tour: 1,
    user: 1
},{
    unique: true
});

reviewSchema.pre(/^find/, function(next){
    // this.populate({
    //         path: 'tour',
    //         select: 'name'
    //     })
    //     .populate({
    //         path: 'user',
    //         select: 'name photo'
    //     });
    

    this
        .populate({
            path: 'user',
            select: 'name photo'
        });
    
    next();
});

reviewSchema.static.calcAverageRatings = async function(tourId) {
    const stats = await this.aggregate([
        {
            $match: { tour: tourId}
        },
        {
            $group: {
                _id: '$tour',
                nRating:{ $sum: 1},
                avgRating: {$avg: '$rating'}
            }
        }
    ]);
    if(stats.length > 0) {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: stats[0].nRating, 
            ratingAverage: stats[0].avgRating
        });
    } else {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: 4.5, 
            ratingAverage: 0
        });
    }
}

reviewSchema.post('save', function(){
    // this refers to currect review
    this.constructor.calcAverageRatings(this.tour);
});

reviewSchema.pre(/^findOneAnd/, async function(next) {
    this.r = await this.findOne();
    next();
});

reviewSchema.post(/^findOneAnd/, async function() {
    // await this.findOne(); Doesn't work here as query is already executed.
    await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;