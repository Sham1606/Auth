// Used to create API endpoints for creating user and store in the database.
import bcrypt from "bcryptjs";
import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
import transporter from "../config/nodemailer.js";

export const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.json({ success: false, message: "Missing Details" });
  }

  try {
    const existingUser = await userModel.findOne({ email });

    if (existingUser) {
      return res.json({ success: false, message: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new userModel({
      name,
      email,
      password: hashedPassword,
      role: "user",
    });
    await user.save();

    //authentication token to send to cookies
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    }); // whenever a new user create it is created using ._id, the jwt token is generated and it is validated for 7 days

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days and token will expire
    }); // only http request accept the cookie

    try {
      const mailOptions = {
        from: {
          name: "Auth App",
          address: process.env.SENDER_EMAIL
        },
        to: email,
        subject: 'Welcome to Auth',
        text: `Welcome to our Auth application, Your Account has been created with email id: ${email}!`,
        html: `
          <h2>Welcome to Auth App!</h2>
          <p>Your account has been successfully created.</p>
          <p>Email: ${email}</p>
          <p>Name: ${name}</p>
        `
      };

      await transporter.sendMail(mailOptions);
      return res.json({ success: true, message: "Registration successful and welcome email sent" });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Still return success even if email fails, but log the error
      return res.json({ success: true, message: "Registration successful but email sending failed" });
    }
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({
      success: false,
      message: "Email and Password are required",
    });
  }

  try {
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.json({ success: false, message: "Invalid Email" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.json({ success: false, message: "Invalid Password" });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    }); // whenever a new user create it is created using ._id, the jwt token is generated and it is validated for 7 days

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days and token will expire
    }); // only http request accept the cookie
    

    //Sending Welcome Email
    const mailOptions = {
      from : process.env.SENDER_EMAIL,
      to: email,
      subject: 'Welcome to Auth',
      text: `Welcome to our Auth application, ${user.name}!`,
    }
    
    await transporter.sendMail(mailOptions);

    return res.json({ success: true });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    });

    return res.json({ success: true, message: "Logged Out" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const sendVerifyOtp = async(req, res) => {
  try {
    
    const { userId } = req.body; // to get userId from request

    if (!userId) {
      return res.json({ success: false, message: "User ID is required" });
    }
    
    const user = await userModel.findById(userId);

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    if(user.isAccountVerified){
      return res.json({ success: false, message: "Account already verified" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    user.verifyOtp = otp;
    user.verifyOtpExpireAt = Date.now() + 24*60*60*1000; // 24 hours

    await user.save();

    const mailOption = {
      from: {
        name: "Auth App",
        address: process.env.SENDER_EMAIL
      },
      to: user.email,
      subject: 'Verify Your Account - Auth App',
      text: `Your verification OTP is: ${otp}. This code will expire in 24 hours.`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f9f9f9;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #ffffff;
              border-radius: 8px;
              box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              padding: 20px 0;
              border-bottom: 1px solid #eaeaea;
            }
            .content {
              padding: 20px 0;
              color: #333333;
            }
            .otp-container {
              margin: 20px 0;
              padding: 15px;
              background-color: #f5f5f5;
              border-radius: 5px;
              text-align: center;
            }
            .otp-code {
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 5px;
              color: #4a4a4a;
            }
            .expiry {
              margin-top: 15px;
              font-size: 14px;
              color: #777777;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eaeaea;
              text-align: center;
              font-size: 12px;
              color: #999999;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="color: #3498db; margin: 0;">Auth App</h1>
              <p style="margin: 5px 0 0 0;">Email Verification</p>
            </div>
            <div class="content">
              <p>Hello ${user.name},</p>
              <p>Thank you for registering with Auth App. Please verify your email address by entering the following OTP code:</p>
              
              <div class="otp-container">
                <div class="otp-code">${otp}</div>
                <p class="expiry">This code will expire in 24 hours</p>
              </div>
              
              <p>If you did not request this verification, please ignore this email or contact our support team.</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
              <p>&copy; ${new Date().getFullYear()} Auth App. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    }

    await transporter.sendMail(mailOption);

    // Add success response
    return res.json({ 
      success: true, 
      message: "OTP sent successfully",
      userId: user._id  // Include userId in response for verification
    });
  } catch (error) {
    res.json({ success:false, message: error.message });
  }
}

export const verifyEmail = async(req, res) => {
  const {userId, otp}  = req.body;

  if(!userId || !otp){
    return res.json({ success: false, message: "Missing Details" });
  }
  try {
    const user = await userModel.findById(userId);

    if(!user){
      return res.json({ success: false, message: "User not found" });
    }

    if(user.verifyOtp === '' || user.verifyOtp !== otp ) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    if(user.verifyOtpExpireAt < Date.now()){
      return res.json({ success: false, message: "OTP Expired" });
    }

    if (user.verifyOtpExpireAt < Date.now()) {
      // Clear expired OTP
      user.verifyOtp = '';
      user.verifyOtpExpireAt = 0;
      await user.save();
      return res.json({ success: false, message: "OTP Expired. Please request a new one." });
    }

    user.isAccountVerified = true;
    user.verifyOtp = '';
    user.verifyOtpExpireAt = 0;

    await user.save();
    return res.json({ success: true, message: "Account Verified Successfully" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
}

// Check if user is authenticated
export const isAuthenticated = async (req, res) => {
  try {
    return res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
}

//Send Password Reset OTP
export const sendResetOtp = async (req, res) => {
  const {email} = req.body;

  if(!email){
    return res.json({ success: false, message: "Email is required" });
  }

  try {
    const user = await userModel.findOne({ email });
    if(!user){
      return res.json({ success: false, message: "User not found" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    user.resetOtp = otp;
    user.resetOtpExpireAt = Date.now() + 15*60*1000; // 15 minutes
    await user.save();

    const mailOption = {
      from: {
        name: "Auth App",
        address: process.env.SENDER_EMAIL
      },
      to: user.email,
      subject: 'Password Reset - Auth App',
      text: `Your password reset OTP is: ${otp}. This code will expire in 15 minutes.`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f9f9f9;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #ffffff;
              border-radius: 8px;
              box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              padding: 20px 0;
              border-bottom: 1px solid #eaeaea;
            }
            .content {
              padding: 20px 0;
              color: #333333;
            }
            .otp-container {
              margin: 20px 0;
              padding: 15px;
              background-color: #f5f5f5;
              border-radius: 5px;
              text-align: center;
            }
            .otp-code {
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 5px;
              color: #4a4a4a;
            }
            .expiry {
              margin-top: 15px;
              font-size: 14px;
              color: #777777;
            }
            .warning {
              margin-top: 20px;
              padding: 10px;
              background-color: #fff8e1;
              border-left: 4px solid #ffc107;
              border-radius: 4px;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eaeaea;
              text-align: center;
              font-size: 12px;
              color: #999999;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="color: #e74c3c; margin: 0;">Auth App</h1>
              <p style="margin: 5px 0 0 0;">Password Reset</p>
            </div>
            <div class="content">
              <p>Hello ${user.name},</p>
              <p>We received a request to reset your password. Enter the following OTP code to proceed with your password reset:</p>
              
              <div class="otp-container">
                <div class="otp-code">${otp}</div>
                <p class="expiry">This code will expire in 15 minutes</p>
              </div>
              
              <div class="warning">
                <p style="margin: 0;"><strong>Security Notice:</strong> If you didn't request a password reset, please ignore this email and ensure your account is secure.</p>
              </div>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
              <p>&copy; ${new Date().getFullYear()} Auth App. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    }
    await transporter.sendMail(mailOption);

    return res.json({ success: true, message: "OTP sent successfully"});
  } catch (error) {
    return res.json({ success: false, message: error.message });
    
  }
}

// Reset User Password
export const resetPassword = async(req, res) => {
  const { email, otp, newPassword } = req.body;
  
  if(!email || !otp || !newPassword){
    return res.json({ success: false, message: "Missing Details" });
  }

  try {
    const user = await userModel.findOne({email});
    if(!user){
      return res.json({ success: false, message: "User not found" });
    }
    
    if(user.resetOtp === '' || user.resetOtp!== otp ) {
      return res.json({ success: false, message: "Invalid OTP" });
    }
    
    if(user.resetOtpExpireAt < Date.now()){
      return res.json({ success: false, message: "OTP Expired" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetOtp = '';
    user.resetOtpExpireAt = 0;

    await user.save();

    return res.json({ success: true, message: "Password Reset Successfully"});
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
}