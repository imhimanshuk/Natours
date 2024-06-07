const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');

const tourSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'A tour must have a name'],
            unique: true,
            trim: true,
            maxLength: [40, 'A Tour name must have less or equal than 49 charcter'],
            minLength: [5, 'A tour name must have more or equal than 5 character'],
            // validate: [validator.isAlpha, 'Tour name must only contain characters']
        },
        slug: String,
        duration: {
            type: Number,
            required: [true, 'A tour must have a duration']
        },
        maxGroupSize: {
            type: Number,
            require: [true, 'A tour must have a group size']
        },
        difficulty: {
            type: String,
            required: [true, 'A tour shoil have difficulty'],
            enum: {
                values: ['easy', 'medium', 'difficult'],
                message: 'Difficulty is either easy, medium or difficult'
            }
        },
        ratingAverage: {
            type: Number,
            default: 4.5,
            min: [1, 'Rating must be above 1.0'],
            max: [5, 'Rating must be below 5.0'],
            set: val => Math.round(val * 10) / 10
        },
        ratingsQuantity: {
            type: Number,
            default: 0
        },
        price: {
            type: Number,
            required: [true, 'A tour must have a price']
        },
        priceDiscount: {
            type: Number,
            validate: 
            {
                validator: function(val) {
                    // this validator will not work with the update query
                    return this.price > val;
                },
                message: 'Dicount price ({VALUE}) should be below the regular price'
            }
        },
        summary:{
            type: String,
            trim: true,
            required: [true, "A tour must have a description"]
        },
        description: {
            type: String,
            trim: true
        },
        imageCover: {
            type: String,
            required: [true, 'A tour must have a cover images']
        },
        images: [String],
        createdAt: {
            type: Date,
            default: Date.now(),
            select: false
        },
        startDates: [Date],
        secretTour: {
            type: Boolean,
            default: false
        },
        startLocation: {
            type: {
                type: String,
                default: 'Point',
                enum: ['Point']
            },
            cordinates: [Number],
            address: String,
            description: String
        },
        locations: [
            {
                type: {
                    type: String,
                    default: 'Point',
                    enum: ['Point']
                },
                cordinates: [Number],
                address: String,
                description: String,
                day: Number
            }
        ],
        guides: [
            {
                type: mongoose.Schema.ObjectId,
                ref: 'User'
            }
        ]
    },
    {
        toJSON: {virtuals: true},
        toObject: {virtuals: true}
    }
);

tourSchema.index({
    price: 1,
    ratingAverage: -1
});
tourSchema.index({ slug: 1});
tourSchema.index({ startLocation: '2dsphere'});

tourSchema
    .virtual('durationWeeks')
    .get(function() {
        return this.duration / 7;
    });

// This is virtual populate
tourSchema.virtual('reviews', {
    ref: 'Review',
    foreignField: 'tour',
    localField: '_id'
});

// Documnet Middleware: Runs before .save() and .create()
tourSchema.pre('save', function(next) {
    this.slug = slugify(this.name, { lower: true });
    next();
});

// tourSchema.post('save', function(doc, next) {
//     console.log(doc);
//     next();
// });

//Query Middleware(Hook)
// tourSchema.pre('find', function(next){
tourSchema.pre(/^find/, function(next){
    this.find({ secretTour: {$ne: true}});
    this.start = Date.now();
    next();
});

tourSchema.pre(/^find/, function(next) {
    this.populate({
        path: 'guides',
        select: '-__v -passwordChangedAt'
    });
    next();
});

tourSchema.post(/^find/, function(docs, next){
    // console.log(`Query Took ${Date.now() - this.start}`);
    // console.log(docs);
    next();
});

// Aggregation Middleware
// tourSchema.pre('aggregate', function(next) {
//     this.pipeline().unshift({ $match: {secretTour: { $ne : true}} });
//     console.log(this.pipeline());
//     next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;