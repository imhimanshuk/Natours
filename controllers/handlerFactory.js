const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');

exports.deleteOne = Model => catchAsync(async (req, res, next) => {
    const document = await Model.findByIdAndDelete(req.params.id);

    if(!document) {
        return next(new AppError('No document Found with that id', 404));
    }

    res.status(204).json({
        status : 'success',
        message: "Deleted..."
    });
});

exports.updateOne = Model => catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    if(!doc) {
        return next(new AppError('No document Found with that id', 404));
    }
    
    res.status(202).json({
        status : 'success',
        data: {
            data: doc
        }
    });
});

exports.createOne = Model => catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);
    
    res
        .status(201)
        .json({
            status: 'success',
            data: {
                data: doc
            }
        });
});

exports.getOne = (Model, popOption) => catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if(popOption) query = query.populate(popOption);

    const doc = await query;

    if(!doc) {
        return next(new AppError('No document Found with that id', 404));
    }

    res.status(200).json({
        status : 'success',
        data: {
            data: doc
        }
    });
});

exports.getAll = Model => catchAsync(async (req, res, next) => {
    let filter = {};
    if(req.params.tourId) filter = {tour: req.params.tourId};

    const features = new APIFeatures(Model.find(), req.query)
			.filter()
			.sort()
			.limitFields()
			.paginate();
    
    // const docs = await features.query.explain();
    const docs = await features.query;
    
    res.status(200).json({
			status : 'success',
			results: docs.length,
			data: {
				data: docs
			}
    })
});