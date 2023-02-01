const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
	const transporter = nodemailer.createTransport({
		host: process.env.EMAIL_HOST,
		port: process.env.EMAIL_PORT,
		auth: {
			user: process.env.EMAIL_USERNAME,
			pass: process.env.EMAIL_PASSWORD,
		},
	});

	const mailOptions = {
		from: `Nov Social <${process.env.EMAIL_USERNAME}>`,
		to: options.email,
		subject: options.subject,
		text: options.message,
		html: options.html,
	};

	await transporter.sendMail(mailOptions);
};

const generateHTMLWelcomeMail = (recipientName, activeLink) => {
	return `
      <div style="background:#f6f6f6;display: flex;justify-content: center;align-items: center; padding: 40px">
   <div style="max-width: 540px;margin: auto;font-size: 110%;border-radius: 12px;/* border: 1px solid #d7d8d9; */overflow: hidden;">
      <div style="width: 100%; height: 80px; background: #3588f2;">
         <div style="cursor: auto; color: white; font-family: Whitney, Helvetica Neue, Helvetica, Arial, Lucida Grande, sans-serif; font-size: 28px; font-weight: 600; text-align: center; line-height: 80px;">
            Welcome to Nov Social!
         </div>
      </div>
      <div style="background: white;padding: 20px;">
         <h3 style="font-family: Whitney, Helvetica Neue, Helvetica, Arial, Lucida Grande, sans-serif; font-weight: 500; font-size: 20px; color: #4f545c; letter-spacing: 0.27px;">
            Hi ${recipientName},
         </h3>
         <p style="cursor: auto; color: #737f8d; font-family: Whitney, Helvetica Neue, Helvetica, Arial, Lucida Grande, sans-serif; font-size: 16px; line-height: 24px; text-align: left;">
            Thanks for registering an account with
            <span style="color: #6ba4e9;">NovSocial</span>! You're the coolest person in all the land (and I've met a lot of really cool people).
         </p>
         <span style="cursor: auto; color: #737f8d; font-family: Whitney, Helvetica Neue, Helvetica, Arial, Lucida Grande, sans-serif; font-size: 16px; line-height: 24px; text-align: left;">
         Before we get started, we'll need to verify your email.
         </span>
         <div style="text-align: center; margin-top: 20px;">
            <a href="${activeLink}" style="
               font-family: Whitney, Helvetica Neue, Helvetica, Arial, Lucida Grande, sans-serif;
               background: #3588f2;
               text-decoration: none;
               color: white;
               padding: 12px 12px;
               margin: 10px 0;
               display: inline-block;
               border-radius: 8px;
               font-weight: bold;
               font-size: 16px;
               ">
              Activate your account
            </a>
         </div>
      </div>
   </div>
   <div>
  `;
};

module.exports = {
	sendEmail,
	generateHTMLWelcomeMail,
};
