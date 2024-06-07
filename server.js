const mongoose = require('mongoose');
const env = require('dotenv');
env.config({path: './config.env'});

process.on('uncaughtException', err => {
    console.log(err.name, err.message);
    console.log('Uncaught Exception: Shutting down...');
    process.exit(1);
});

const app = require('./app');
const db = process.env.DATABASE.replace(
    '<PASSWORD>', 
    process.env.DATABASE_PASSWORD
);

mongoose
    .connect(db, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: false,
        useUnifiedTopology: true
    })
    .then(() => console.log('DB Connection Succesful'));

const port = process.env.PORT;
const server = app.listen(port, () => {
    console.log(`App running on port ${port}...`);
});

process.on('unhandledRejection', err => {
    console.log(err.name, err.message);
    console.log('Unhandler Rejeaction: Shutting down...');
    server.close(() => {
        process.exit(1);
    });
});