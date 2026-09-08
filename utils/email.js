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
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = process.env.MAILTRAP_FROM;
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
      //create sendGrid
      return;
    }
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
    //create transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  renderHTML(template, subject) {
    //render pug template, not like in our view controllers with res.render()
    const html = pug.renderFile(
      `${__dirname}/../views/emails/${template}.pug`,
      {
        firstName: this.firstName,
        url: this.url,
        subject,
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

  // async sendEmailChangeConfirm() {
  //   const subject =
  //     'You must confirm the change to your email on Natours within 10 minutes';
  //   const html = this.renderHTML('emailChangeConfirm', subject);
  //   await this.send(subject, html);
  // }
}

//for use with email change, namely where we want to send a message to the old email address to warn of the change or to send the revertEmail message
export class CustomEmail extends Email {
  constructor(user, url, to, old = null) {
    super(user, url);
    this.to = to;
    this.old = old;
  }

  renderHTML(template, subject) {
    //render pug template, not like in our view controllers with res.render()
    const html = pug.renderFile(
      `${__dirname}/../views/emails/${template}.pug`,
      {
        firstName: this.firstName,
        url: this.url,
        old: this.old,
        subject,
      },
    );
    return html;
  }

  async sendEmailChangedThenPasswordNotification() {
    // this.url = this.to;
    // this.to = this.user.oldEmail;
    const subject =
      '[SECURITY NOTIFICATION - URGENT ACTION REQUIRED] Someone has requested a password reset to be sent to a new email address';
    const html = this.renderHTML('emailChange', subject);
    await this.send(subject, html);
  }

  async sendEmailChangeConfirm() {
    const subject =
      'You must confirm the change to your email on Natours within 10 minutes';
    const html = this.renderHTML('emailChangeConfirm', subject);
    await this.send(subject, html);
  }

  async sendEmailRevert() {
    const subject =
      '[SECURITY NOTIFICATION - URGENT ACTION REQUIRED] Someone has tried to change your email address';
    const html = this.renderHTML('emailChangeRevert', subject);
    await this.send(subject, html);
  }
}

//the original simple email sending function that was used before we crated a class (or two!)
const sendEmail = async (options) => {
  const transport = nodemailer.createTransport({
    host: process.env.MAILTRAP_HOST,
    port: process.env.MAILTRAP_PORT,
    auth: {
      user: process.env.MAILTRAP_USER,
      pass: process.env.MAILTRAP_PW,
    },
  });
  //define the email options
  const mailOptions = {
    from: process.env.MAILTRAP_FROM,
    to: options.email,
    subject: options.subject,
    text: options.message,
    //clever trick using the spread operator to dynamically add html if it exists in the options object, it's based on the fact that the spread operator will quietly fail if trying to spread false
    ...(options.html && { html: options.html }),
    // html: options.html || '',
  };
  //if you don't add a callback function as the second argument then it returns a promise, async is good for node remember
  const info = await transport.sendMail(mailOptions);
};
export default sendEmail;
