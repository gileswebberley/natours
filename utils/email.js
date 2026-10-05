import nodemailer from 'nodemailer';
import pug from 'pug'; //for converting templates to html
import { convert, compile } from 'html-to-text'; //for converting html into raw text
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//create an email class so we can use templates
export class Email {
  //user is self evident but url is for any button links in the emails
  constructor(user, url) {
    // this.user = user;
    this.to = user.email;
    this.firstName = user.name.split(' ')[0] || 'User';
    this.url = url;
    this.from =
      process.env.NODE_ENV !== 'production'
        ? process.env.MAILTRAP_FROM
        : process.env.BREVO_FROM;
  }

  //create a static instance of the html-to-text compile object so it only compiles once. The fromString() method used in the course is deprecated so this is the new way.
  static convertHtmlToText = compile({
    wordwrap: 130,
    selectors: [
      { selector: 'a', options: { hideLinkHrefIfSameAsText: true } },
      { selector: 'img', format: 'skip' }, // Drops raw image tags from plain text fallback
    ],
  });

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      //create Brevo
      return nodemailer.createTransport({
        host: process.env.BREVO_HOST,
        port: process.env.BREVO_PORT,
        secure: false, //must be false for port 587 appently
        auth: {
          user: process.env.BREVO_USER,
          pass: process.env.BREVO_PW,
        },
      });
      //until this is properly set up I'm going to throw an error to avoid confusion - take a look at BREVO for implementing this but we'll need a non gmail email address for the from field and also to avoid being flagged as spam. The course uses sendGrid but I think BREVO is a better option as it has a free tier and is easier to set up.
      // throw new Error(
      //   'Email class has not been set up for production use yet, check out the email.js file for details',
      // );
    }
    //for development we use the Mailtrap which sends all emails to the same Mailtrap inbox
    return nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST,
      port: process.env.MAILTRAP_PORT,
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PW,
      },
    });
  }

  async send(subject, html) {
    //use our static html-to-text
    const text = Email.convertHtmlToText(html);
    //define options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      text,
      html,
    };
    try {
      //we don't want this to make everything crash so if an error occurs let's simply log it to our console
      await this.newTransport().sendMail(mailOptions);
    } catch (error) {
      console.error('Email sending failed: ', error);
    }
    //create transport and send email
  }

  //refactor - I have ended up with virtually the same function redefined in the CustomEmail subclass so instead we'll just make this one more flexible
  renderHTML(template, subject, additionalData = {}) {
    //render pug template, not like in our view controllers with res.render()
    const html = pug.renderFile(
      `${__dirname}/../views/emails/${template}.pug`,
      {
        firstName: this.firstName,
        url: this.url,
        subject,
        ...additionalData,
      },
    );
    return html;
  }

  async sendWelcome() {
    const subject = 'Welcome to the Natours gang';
    const html = this.renderHTML('welcome', subject);
    await this.send(subject, html);
  }

  async sendPasswordReset() {
    const subject = 'Your Natours password reset link (expires in 10 minutes)';
    const html = this.renderHTML('passwordReset', subject);
    await this.send(subject, html);
  }
}

//for use with email change, namely where we want to send a message to the old email address to warn of the change or to send the revertEmail message
export class CustomEmail extends Email {
  constructor(user, url, to, old = null) {
    super(user, url);
    this.to = to;
    this.old = old;
  }

  //now that we've refactored the renderHTML method to accept additional data we can simply remove this from the subclass by passing in an object with the old email address as a property
  // renderHTML(template, subject) { ... }

  async sendEmailChangedThenPasswordNotification() {
    const subject =
      '[SECURITY NOTIFICATION - URGENT ACTION REQUIRED] Someone has requested a password reset to be sent to a new email address';
    const html = this.renderHTML('emailChange', subject, { old: this.old });
    await this.send(subject, html);
  }

  async sendEmailChangeConfirm() {
    const subject =
      '[ACTION REQUIRED] You must confirm the change to your email on Natours within 10 minutes';
    const html = this.renderHTML('emailChangeConfirm', subject, {
      old: this.old,
    });
    await this.send(subject, html);
  }

  async sendEmailRevert() {
    const subject =
      '[SECURITY NOTIFICATION - URGENT ACTION REQUIRED] Someone has tried to change your email address';
    const html = this.renderHTML('emailChangeRevert', subject, {
      old: this.old,
    });
    await this.send(subject, html);
  }
}
