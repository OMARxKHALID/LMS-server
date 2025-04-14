import { Resend } from "resend";

const resend = new Resend("re_6bedRFPW_4pbEEg6ytJQWmcN3DedUcfpA");

const sendEmail = async ({ email, subject, message }) => {
  try {
    await resend.emails.send({
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      text: message,
    });
  } catch (error) {
    throw new Error("Error sending email: " + error.message);
  }
};

export default sendEmail;
