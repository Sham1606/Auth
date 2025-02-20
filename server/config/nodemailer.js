import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: 'smtp-relay.sendinblue.com',  // Changed from brevo.com to sendinblue.com
    port: 587,
    secure: false,
    requireTLS: true,  // Added this
    auth: {
        user: '864834001@smtp-brevo.com', // Your Brevo SMTP username
        pass: 'NbyqZmD2FzXnMpYT'  // Your Brevo SMTP key
    },
    debug: true  // Add this for debugging
});

// Verification
transporter.verify((error, success) => {
    if (error) {
        console.log("SMTP Error:", error);
    } else {
        console.log("Server is ready to take our messages");
    }
});

export default transporter;