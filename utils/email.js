import nodemailer from 'nodemailer';

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
    //html
  };
  //if you don't add a callback function as the second argument then it returns a promise, async is good for node remember
  const info = await transport.sendMail(mailOptions);
};
export default sendEmail;
