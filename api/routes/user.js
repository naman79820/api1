const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require('nodemailer');
const User = require("../models/user");



router.post("/signup", (req, res, next) => {
  const verificationCode = Math.floor(10000 + Math.random() * 90000); // Generate 5-digit verification code

  const newUser = new User({
    _id: new mongoose.Types.ObjectId(),
    email: req.body.email,
    verificationCode: verificationCode
  });

  // Send verification email
  newUser.save() 
  .then(() => {
  sendVerificationEmail(req.body.email,verificationCode)
  .then(() => {
    
      // Respond to client indicating that verification email has been sent
      res.status(200).json({
        message: "Verification email sent"
      });
    })
  })
    .catch(err => {
      console.log(err);
      res.status(500).json({
        error: "Failed to send verification email"
      });
    });
});

// Send verification email function
function sendVerificationEmail(email, code) {
  return new Promise((resolve, reject) => {
    // Configure nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'naman79820@gmail.com',
        pass: 'lvma mrvs kmea opye'
      }
    });

    // Email content
    const mailOptions = {
      from: 'naman79820@gmail.com',
      to: email,
      subject: 'Email Verification',
      text: `Your verification code is ${code}`
    };

    // Send email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        reject(error);
      } else {
        console.log('Email sent: ' + info.response);
        resolve();
        console.log(email)
      }
    });
  });
}

router.get("/verify", (req, res, next) => {
  const { code, email, password } = req.body;
  console.log(req.body)
  console.log(email)

  
  
  if (!code || !email || !password) {
    return res.status(400).json({
      message: "Missing verification code, email, or password"
    });
    
  }

  User.findOne({ email, verificationCode})
    .exec()
    .then(user => {
      console.log(email)
      console.log(User)
      if (user) {
        console.log("user")
        // User found with matching verification code
        bcrypt.hash(password, 10, (err, hash) => {
          if (err) {
            return res.status(500).json({
              error: err,
              message: "user not found with matching verification code"
            });
          } else {
            // Update user details with hashed password and verified status
            user.password = hash;
            //user.verified = true;
            user.verificationCode = null;
            
            user.save()
            
              .then(() => {
                // Respond to client indicating successful verification
                res.status(200).json({
                  message: "Email verified and user created successfully"
                });
              })
              .catch(err => {
                console.log(err);
                res.status(500).json({
                  error: "Failed to save user details"
                });
              });
          }
        });
      } else {
        return res.status(400).json({
          message: "Invalid verification code or email"
        });
      }
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({
        error: "Failed to verify email"
      });
    });
});

router.post("/login", (req, res, next) => {
  User.find({ email: req.body.email })
    .exec()
    .then(user => {
      if (user.length < 1) {
        return res.status(401).json({
          message: "Auth failed"
        });
      }
      bcrypt.compare(req.body.password, user[0].password, (err, result) => {
        if (err) {
          return res.status(401).json({
            message: "Auth failed"
          });
        }
        if (result) {
          const token = jwt.sign(
            {
              email: user[0].email,
              userId: user[0]._id
            },
            process.env.JWT_KEY,
            {
                expiresIn: "1h"
            }
          );
          return res.status(200).json({
            message: "Auth successful",
            token: token
          });
        }
        res.status(401).json({
          message: "Auth failed"
        });
      });
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({
        error: err
      });
    });
});

router.delete("/:userId", (req, res, next) => {
  User.deleteOne({ _id: req.params.userId })
    .exec()
    .then(result => {
      res.status(200).json({
        message: "User deleted"
      });
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({
        error: err
      });
    });
});

module.exports = router;
