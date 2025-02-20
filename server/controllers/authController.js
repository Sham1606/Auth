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

    return res.json({ success: true });
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
    
    const user = await userModel.findById(userId);

    if(user.isAccountVerified){
      return res.json({ success: false, message: "Account already verified" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000)); // to generate 6 digit random number

    user.verifyOtp = otp;
    user.verifyOtpExpireAt = Date.now() + 24*60*60*1000; // 24 hours

    await user.save();

    const mailOption = {
      from: {
        name: "Auth App",
        address: process.env.SENDER_EMAIL
      },
      to: user.email,
      subject: 'Verify Account',
      text: `Verify your account by entering the OTP: ${otp}`,
      html: `
        <h2>Verify Account!</h2>
        <p>Please verify your account by entering the OTP: ${otp}</p>
      `
    }

    await transporter.sendMail(mailOption);
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

    user.isAccountVerified = true;
    user.verifyOtp = '';
    user.verifyOtpExpireAt = 0;

    await user.save();
    return res.json({ success: true, message: "Account Verified Successfully" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
}