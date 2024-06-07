const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

module.exports = class Email{
    constructor(user, url) {
        this.to = user.email;
        this.firstname = user.name.split(' ')[0];
        this.url = url;
        this.from = `Himanshu katiyar <${process.env.EMAIL_FROM}>`;
    }

    newCreateTransport() {
        if(process.env.NODE_ENV === 'production') {
            //Sendgrid
            return nodemailer.createTransport({
                service: 'SendGrid',
                auth:{
                    user: pasocess.env.SENDGRID_USERNAME,
                    pass: process.env.SENDGRID_PASSWORD
                }
            });
        }
        return nodemailer.createTransport({
            // service : 'Gmail',
            host: process.env.EMAIL_HOST,
            post: process.env.EMAIL_PORT,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    }

    async send(template, subject) {
        //send the actual email
        // 1) Render HTML on template
        const html = pug.renderFile(`${__dirname}/../views/emails/${template}.pug`, {
            firstname: this.firstname,
            url: this.url,
            subject
        });

        // 2) Define email options
        const mailOptions = {
            from: this.from,
            to: this.to,
            subject,
            html,
            text: htmlToText.htmlToText(html)
        }

        // 3) Create a transport and send email
        await this.newCreateTransport().sendMail(mailOptions);
    }

    async sendWelcome(){
       await this.send('welcome', 'Welcome to the Natours family');
    }

    async sendReset() {
        await this.send('reset', 'Your password reset token(valid for 10 min.');
    }
}