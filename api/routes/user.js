const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require('nodemailer');
const User = require("../models/user");

router.post("/signup", (req, res, next) => {
  const verificationCode = Math.floor(10000 + Math.random() * 90000); // Generate 5-digit verification code
  User.find({ email: req.body.email })
    .exec()
    .then(user => {
      if (user.length >= 1) {
        return res.status(409).json({
          message: "Mail exists"
        });
      } else {
        bcrypt.hash(req.body.password, 10, (err, hash) => {
          if (err) {
            return res.status(500).json({
              error: err
            });
          } else {
            const user = new User({
              _id: new mongoose.Types.ObjectId(),
              email: req.body.email,
              password: hash,
              verified: false, // Add a verified field
              verificationCode: verificationCode // Assign verification code to user
            });
            user
              .save()
              .then(result => {
                console.log(result);
                // Send verification email
                sendVerificationEmail(user.email, verificationCode);
                res.status(201).json({
                  message: "User created"
                });
              })
              .catch(err => {
                console.log(err);
                res.status(500).json({
                  error: err
                });
              });
          }
        });
      }
    });
});

// Send verification email function
function sendVerificationEmail(email, code) {
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
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

router.get("/verify", (req, res, next) => {
  const { code } = req.query;
  
  User.findOneAndUpdate({ verificationCode: code }, { verified: true, verificationCode: null })
    .exec()
    .then(user => {
      if (user) {
        return res.status(200).json({
          message: "Email verified successfully"
        });
      } else {
        return res.status(400).json({
          message: "Invalid verification code"
        });
      }
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({
        error: err
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
