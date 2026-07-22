import nodemailer from 'nodemailer';
import pug from 'pug'; //for converting templates to html
import { convert, compile } from 'html-to-text'; //for converting html into raw text
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//create an email class so we can use templates
export class Email {
  //create a static instance of the html-to-text compile object so it only compiles once. The fromString() method used in the course is deprecated so this is the new way.
  static convertHtmlToText = compile({
    wordwrap: 130,
    selectors: [
      { selector: 'a', options: { hideLinkHrefIfSameAsText: true } },
      { selector: 'img', format: 'skip' }, // Drops raw image tags from plain text fallback
    ],
  });
  //user is self evident but url is for any button links in the emails
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = process.env.MAILTRAP_FROM;
  }

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

  async send(template, subject) {
    //render pug template, not like in our view controllers with res.render()
    const html = pug.renderFile(
      `${__dirname}/../views/emails/${template}.pug`,
      {
        firstName: this.firstName,
        url: this.url,
        subject,
      },
    );
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

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Natours gang');
  }
}

export class CustomEmail extends Email {
  constructor(user, url, to) {
    super(user, url);
    this.to = to;
  }
}

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
