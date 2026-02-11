const nodemailer = require('nodemailer');
const logger = require('../config/logger');

// Email configuration
const EMAIL_CONFIG = {
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER || 'aircraftinspectorai@gmail.com',
        pass: process.env.SMTP_PASS || '', // Set this in .env file
    },
};

// Create transporter
const transporter = nodemailer.createTransport(EMAIL_CONFIG);

// Verify transporter configuration
transporter.verify((error, success) => {
    if (error) {
        logger.error('Email transporter verification failed:', error);
        console.error('⚠️  Email service not configured properly. OTP will only be shown in console.');
    } else {
        logger.info('Email service is ready to send emails');
        console.log('✅ Email service configured successfully');
    }
});

/**
 * Send OTP email for password reset
 * @param {string} email - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<void>}
 */
async function sendOTPEmail(email, otp) {
    const mailOptions = {
        from: {
            name: 'Aircraft Defect Detection System',
            address: process.env.SMTP_USER || 'aircraftinspectorai@gmail.com',
        },
        to: email,
        subject: 'Password Reset OTP - Aircraft Defect Detection',
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px;
            padding: 40px;
            text-align: center;
          }
          .content {
            background: white;
            border-radius: 8px;
            padding: 30px;
            margin-top: 20px;
          }
          .otp-code {
            font-size: 48px;
            font-weight: bold;
            color: #4a90e2;
            letter-spacing: 8px;
            margin: 30px 0;
            padding: 20px;
            background: #f0f4f8;
            border-radius: 8px;
            display: inline-block;
          }
          .header {
            color: white;
            margin: 0;
            font-size: 24px;
          }
          .warning {
            color: #666;
            font-size: 14px;
            margin-top: 20px;
            padding: 15px;
            background: #fff3cd;
            border-radius: 5px;
            border-left: 4px solid #ffc107;
          }
          .footer {
            color: white;
            font-size: 12px;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="header">🔐 Password Reset Request</h1>
          
          <div class="content">
            <p>You requested to reset your password for the Aircraft Defect Detection System.</p>
            
            <p>Your One-Time Password (OTP) is:</p>
            
            <div class="otp-code">${otp}</div>
            
            <p><strong>This code will expire in 10 minutes.</strong></p>
            
            <div class="warning">
              ⚠️ <strong>Security Notice:</strong><br>
              If you didn't request this password reset, please ignore this email and ensure your account is secure.
            </div>
          </div>
          
          <p class="footer">
            This is an automated email from Aircraft Defect Detection System.<br>
            Please do not reply to this email.
          </p>
        </div>
      </body>
      </html>
    `,
        text: `
Password Reset Request - Aircraft Defect Detection System

Your OTP for password reset is: ${otp}

This code will expire in 10 minutes.

If you didn't request this password reset, please ignore this email.

---
This is an automated email. Please do not reply.
    `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        logger.info(`OTP email sent to ${email}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        logger.error(`Failed to send OTP email to ${email}:`, error);
        throw error;
    }
}

/**
 * Send welcome email to new users
 * @param {string} email - Recipient email address
 * @param {string} username - Username
 * @returns {Promise<void>}
 */
async function sendWelcomeEmail(email, username) {
    const mailOptions = {
        from: {
            name: 'Aircraft Defect Detection System',
            address: process.env.SMTP_USER || 'aircraftinspectorai@gmail.com',
        },
        to: email,
        subject: 'Welcome to Aircraft Defect Detection System',
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px;
            padding: 40px;
            text-align: center;
          }
          .content {
            background: white;
            border-radius: 8px;
            padding: 30px;
            margin-top: 20px;
            text-align: left;
          }
          .header {
            color: white;
            margin: 0;
            font-size: 28px;
          }
          .footer {
            color: white;
            font-size: 12px;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="header">✈️ Welcome Aboard!</h1>
          
          <div class="content">
            <h2>Hello ${username}!</h2>
            
            <p>Thank you for registering with the Aircraft Defect Detection System.</p>
            
            <p>Your account has been successfully created. You can now:</p>
            <ul>
              <li>Upload aircraft images for defect detection</li>
              <li>View detection results and analysis</li>
              <li>Access your inspection history</li>
              <li>Manage your account settings</li>
            </ul>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            
            <p>Happy inspecting!</p>
          </div>
          
          <p class="footer">
            Aircraft Defect Detection System<br>
            This is an automated email. Please do not reply.
          </p>
        </div>
      </body>
      </html>
    `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        logger.info(`Welcome email sent to ${email}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        logger.error(`Failed to send welcome email to ${email}:`, error);
        // Don't throw error for welcome email - it's not critical
        return { success: false, error: error.message };
    }
}

module.exports = {
    sendOTPEmail,
    sendWelcomeEmail,
};
