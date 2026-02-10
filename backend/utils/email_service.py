# utils/email_service.py
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

class EmailService:
    @staticmethod
    def send_verification_email(user_email, user_name, verification_token):
        """Send email verification link"""
        try:
            # Email configuration from environment variables
            smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
            smtp_port = int(os.getenv('SMTP_PORT', '587'))
            sender_email = os.getenv('SENDER_EMAIL')
            sender_password = os.getenv('SENDER_PASSWORD')  # Use App Password for Gmail
            
            if not sender_email or not sender_password:
                print("⚠️ Email credentials not configured in environment variables")
                return False
            
            # Create verification link
            frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:8081')
            verification_link = f"{frontend_url}/verify-email?token={verification_token}"
            
            # Create email message
            message = MIMEMultipart('alternative')
            message['Subject'] = 'Verify Your Email - AvoCare'
            message['From'] = sender_email
            message['To'] = user_email
            
            # Plain text version
            text = f"""
Hi {user_name},

Thank you for registering with AvoCare!

Please verify your email by clicking the link below:
{verification_link}

This link will expire in 24 hours.

If you didn't create this account, please ignore this email.

Best regards,
AvoCare Team
            """
            
            # HTML version
            html = f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <h2 style="color: #3d4d3d; margin-bottom: 20px;">Welcome to AvoCare!</h2>
    <p style="color: #333; font-size: 16px;">Hi {user_name},</p>
    <p style="color: #333; font-size: 16px;">Thank you for registering with AvoCare. Please verify your email address to activate your account.</p>
    
    <div style="margin: 30px 0; text-align: center;">
      <a href="{verification_link}" 
         style="background: #3d4d3d; color: white; padding: 14px 40px; 
                text-decoration: none; border-radius: 5px; display: inline-block;
                font-weight: 600; font-size: 16px;">
        Verify Email Address
      </a>
    </div>
    
    <p style="color: #666; font-size: 14px; margin-top: 30px;">
      This verification link will expire in 24 hours.
    </p>
    
    <p style="color: #666; font-size: 14px;">
      If you didn't create this account, please ignore this email.
    </p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="color: #999; font-size: 12px; text-align: center;">
      © 2024 AvoCare. All rights reserved.
    </p>
  </div>
</body>
</html>
            """
            
            # Attach both versions
            message.attach(MIMEText(text, 'plain'))
            message.attach(MIMEText(html, 'html'))
            
            # Send email
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(sender_email, sender_password)
                server.send_message(message)
            
            print(f"✅ Verification email sent to {user_email}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to send verification email: {e}")
            import traceback
            traceback.print_exc()
            return False