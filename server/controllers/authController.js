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
      subject: 'Verify Account',
      text: `Verify your account by entering the OTP: ${otp}`,
      html: `
        <h2>Verify Account!</h2>
        <p>Please verify your account by entering the OTP: ${otp}</p>
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
      subject: 'Password OTP Email',
      text: `Reset your password by entering the OTP: ${otp}`,
      html: `
        <h2>Reset Password!</h2>
        <p>Please reset your password by entering the OTP: ${otp}</p>
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