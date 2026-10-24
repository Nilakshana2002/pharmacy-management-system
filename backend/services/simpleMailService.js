import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { sendSmtpMail, verifySmtpConnection, getSmtpConfig } from './smtpClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTBOX_FILE = path.join(__dirname, '..', 'data', 'mail_outbox.json');

// Re-export SMTP helpers
export { verifySmtpConnection, getSmtpConfig };

// Ensure data folder exists
const ensureDataDir = () => {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

/**
 * Saves or updates sent email in relational notification_logs table and outbox mirror
 */
const saveToOutbox = async (emailRecord) => {
  // 1. Enterprise Relational Database Logging (notification_logs table)
  try {
    const notifType = emailRecord.type || 'SYSTEM';
    const statusVal = emailRecord.status === 'FAILED' ? 'FAILED' : 'SENT';
    await pool.query(`
      INSERT INTO notification_logs (
        order_id, customer_id, recipient_email, recipient_name,
        subject, message_body, notification_type, status, error_message, sent_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      emailRecord.order_id || null,
      emailRecord.customer_id || null,
      emailRecord.to || 'unknown@recipient.com',
      emailRecord.recipientName || emailRecord.customerName || null,
      emailRecord.subject || 'Dispensary Notification',
      emailRecord.text || emailRecord.preview || '',
      notifType,
      statusVal,
      emailRecord.error || null
    ]);
  } catch (dbErr) {
    console.warn('[Mail Service DB Logging Notice]:', dbErr.message);
  }

  // 2. Local Disk Outbox File Mirror
  try {
    ensureDataDir();
    let records = [];
    if (fs.existsSync(OUTBOX_FILE)) {
      const content = fs.readFileSync(OUTBOX_FILE, 'utf8');
      records = JSON.parse(content || '[]');
    }
    records.unshift(emailRecord);
    // Keep last 100 emails
    if (records.length > 100) records = records.slice(0, 100);
    fs.writeFileSync(OUTBOX_FILE, JSON.stringify(records, null, 2), 'utf8');
  } catch (err) {
    console.error('[Mail Service] Outbox write error:', err.message);
  }
};

/**
 * Reads outbox emails prioritizing MySQL notification_logs table with fallback to JSON
 */
export const getMailOutbox = async () => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        notification_id,
        notification_id AS id,
        order_id,
        customer_id,
        recipient_email AS \`to\`,
        recipient_name AS recipientName,
        subject,
        message_body AS text,
        notification_type AS type,
        status,
        sent_at,
        created_at
      FROM notification_logs
      ORDER BY sent_at DESC
      LIMIT 100
    `);
    if (rows && rows.length > 0) {
      return rows;
    }
  } catch (dbErr) {
    console.warn('[Mail Service Outbox Query Notice]:', dbErr.message);
  }

  try {
    ensureDataDir();
    if (!fs.existsSync(OUTBOX_FILE)) return [];
    const content = fs.readFileSync(OUTBOX_FILE, 'utf8');
    return JSON.parse(content || '[]');
  } catch (err) {
    return [];
  }
};

/**
 * Sends a real confirmation email to customer when prescription is accepted
 */
export const sendOrderAcceptedEmail = async ({
  orderId,
  customerEmail,
  customerName,
  patientName,
  readyTime,
  pharmacistName,
  confirmationMessage,
  deliveryOption
}) => {
  const subject = `Prescription Order Confirmed [${orderId}] — Ready for Pickup`;
  
  const textBody = `
======================================================
MY PHARMACIST DISPENSARY & HEALTHCARE
PRESCRIPTION ORDER CONFIRMATION
======================================================
Dear ${customerName || patientName || 'Valued Patient'},

Great news! Your prescription order (${orderId}) has been reviewed and verified by our supervising pharmacist.

ORDER SUMMARY:
------------------------------------------------------
Order Reference    : ${orderId}
Patient Name       : ${patientName}
Fulfillment Method : ${deliveryOption || 'Dispensary Counter Pickup (Free)'}
Estimated Ready    : ${readyTime || '15 - 20 Minutes'}
Supervising Staff  : Pharmacist ${pharmacistName || 'in charge'}

PHARMACIST VERIFICATION NOTE:
${confirmationMessage || 'Your medication has been validated and prepared for counter collection.'}

COUNTER PICKUP INSTRUCTIONS:
Please present this order reference (${orderId}) or your registered phone number at Dispensary Counter 01. 
If requested by your physician, please bring the original physical doctor prescription slip for clinical stamping.

Pharmacy Hotline   : +94 11 234 5678 / +94 77 123 4567
Dispensary Address : No 45/2, Galle Road, Colombo 03, Sri Lanka
Operating Hours    : 8:00 AM - 10:00 PM (Daily)

Thank you for choosing My Pharmacist Dispensary & Healthcare.
======================================================
`.trim();

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0d9488 0%, #047857 100%); padding: 32px 24px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 30px 28px; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 700; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; margin-bottom: 16px; }
    .order-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin: 20px 0; }
    .order-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px; }
    .order-row:last-child { border-bottom: none; }
    .label { color: #64748b; font-weight: 600; }
    .value { font-weight: 700; color: #0f172a; }
    .message-box { background: #f0fdfa; border-left: 4px solid #0d9488; padding: 14px 18px; border-radius: 0 10px 10px 0; margin: 20px 0; font-size: 13px; color: #134e4a; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>My Pharmacist Dispensary</h1>
      <p>Official Patient Prescription Order Confirmation</p>
    </div>
    <div class="content">
      <span class="badge">PRESCRIPTION APPROVED & READY</span>
      <h2 style="font-size: 18px; margin: 0 0 10px; color: #0f172a;">Dear ${customerName || patientName},</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        Your doctor prescription order has been successfully reviewed, verified, and packaged by our licensed dispensary team.
      </p>

      <div class="order-box">
        <div class="order-row"><span class="label">Order Reference:</span><span class="value" style="color: #0d9488;">${orderId}</span></div>
        <div class="order-row"><span class="label">Patient Name:</span><span class="value">${patientName}</span></div>
        <div class="order-row"><span class="label">Estimated Ready Time:</span><span class="value" style="color: #047857;">${readyTime || '15 - 20 Minutes'}</span></div>
        <div class="order-row"><span class="label">Pickup Option:</span><span class="value">${deliveryOption || 'Dispensary Counter Pickup (Free)'}</span></div>
        <div class="order-row"><span class="label">Supervising Pharmacist:</span><span class="value">${pharmacistName || 'Staff Pharmacist'}</span></div>
      </div>

      <div class="message-box">
        <strong>Pharmacist Verification Note:</strong><br/>
        ${confirmationMessage || 'Medication ready for pickup at Dispensary Counter 01.'}
      </div>

      <p style="font-size: 12px; color: #64748b; margin-top: 24px; line-height: 1.5;">
        <strong>Counter Collection Note:</strong> When collecting, please present Order ID <strong>${orderId}</strong> at Counter 01.
      </p>
    </div>
    <div class="footer">
      My Pharmacist Healthcare Management System • No 45/2, Galle Road, Colombo 03 • Hotline: +94 11 234 5678
    </div>
  </div>
</body>
</html>
`.trim();

  const emailRecord = {
    id: `MAIL-${Date.now()}`,
    type: 'ACCEPT_CONFIRMATION',
    order_id: orderId,
    to: customerEmail,
    subject,
    text: textBody,
    html: htmlBody,
    sent_at: new Date().toISOString(),
    status: 'PENDING'
  };

  try {
    console.log(`[SMTP Mail Service] Dispatching Confirmation Email to: ${customerEmail} for Order: ${orderId}...`);
    const smtpRes = await sendSmtpMail({
      to: customerEmail,
      subject,
      html: htmlBody,
      text: textBody
    });

    emailRecord.status = 'SENT';
    emailRecord.smtp_message_id = smtpRes.messageId;
    emailRecord.smtp_engine = smtpRes.engine;
    emailRecord.smtp_response = smtpRes.response;
    saveToOutbox(emailRecord);

    console.log(`[SMTP Mail Service] Successfully sent confirmation email to ${customerEmail} (Engine: ${smtpRes.engine})`);

    return {
      success: true,
      messageId: smtpRes.messageId,
      recipient: customerEmail,
      subject,
      sentAt: emailRecord.sent_at,
      engine: smtpRes.engine
    };
  } catch (err) {
    emailRecord.status = 'FAILED';
    emailRecord.error = err.message;
    saveToOutbox(emailRecord);
    console.error(`[SMTP Mail Service] Failed to dispatch email to ${customerEmail}:`, err.message);
    throw err;
  }
};

/**
 * Sends a real rejection notice email if prescription is invalid or illegible
 */
export const sendOrderRejectedEmail = async ({
  orderId,
  customerEmail,
  customerName,
  patientName,
  rejectionReason,
  pharmacistName
}) => {
  const subject = `Update Regarding Prescription Order [${orderId}] — Action Required`;
  
  const textBody = `
======================================================
MY PHARMACIST DISPENSARY & HEALTHCARE
PRESCRIPTION REVIEW NOTICE
======================================================
Dear ${customerName || patientName || 'Valued Patient'},

We have reviewed your prescription submission (${orderId}). Unfortunately, our pharmacist cannot process this order at this time.

REASON FOR CLINICAL REVIEW NOTICE:
${rejectionReason || 'Prescription image illegible or doctor license seal required.'}

NEXT STEPS:
Please visit our dispensary counter with your original paper prescription from your registered medical practitioner, or submit a legible high-resolution image through our portal.

Pharmacy Hotline   : +94 11 234 5678 / +94 77 123 4567
Dispensary Address : No 45/2, Galle Road, Colombo 03, Sri Lanka
Supervising Staff  : Pharmacist ${pharmacistName || 'in charge'}
======================================================
`.trim();

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); padding: 32px 24px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 30px 28px; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 700; background: #ffe4e6; color: #9f1239; border: 1px solid #fecdd3; margin-bottom: 16px; }
    .reason-box { background: #fff1f2; border-left: 4px solid #e11d48; padding: 14px 18px; border-radius: 0 10px 10px 0; margin: 20px 0; font-size: 13px; color: #881337; }
    .next-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin: 20px 0; font-size: 13px; color: #334155; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>My Pharmacist Dispensary</h1>
      <p>Prescription Review Notice</p>
    </div>
    <div class="content">
      <span class="badge">ACTION REQUIRED / NOT PROCESSED</span>
      <h2 style="font-size: 18px; margin: 0 0 10px; color: #0f172a;">Dear ${customerName || patientName},</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        Thank you for submitting your prescription (Reference <strong>${orderId}</strong>). Our supervising pharmacist reviewed your submission, but was unable to process it due to the following reason:
      </p>

      <div class="reason-box">
        <strong>Pharmacist Review Reason:</strong><br/>
        ${rejectionReason || 'Prescription image is unclear, expired, or missing authorized physician signature/seal.'}
      </div>

      <div class="next-box">
        <strong>Recommended Next Steps:</strong>
        <ul style="margin: 8px 0 0; padding-left: 20px; line-height: 1.6;">
          <li>Visit Dispensary Counter 01 with your physical paper prescription slip.</li>
          <li>Or submit a clear, well-lit high-resolution image through the dispensary portal.</li>
          <li>For immediate assistance, please contact our helpline at <strong>+94 11 234 5678</strong>.</li>
        </ul>
      </div>
    </div>
    <div class="footer">
      My Pharmacist Healthcare Management System • No 45/2, Galle Road, Colombo 03
    </div>
  </div>
</body>
</html>
`.trim();

  const emailRecord = {
    id: `MAIL-${Date.now()}`,
    type: 'REJECTION_NOTICE',
    order_id: orderId,
    to: customerEmail,
    subject,
    text: textBody,
    html: htmlBody,
    sent_at: new Date().toISOString(),
    status: 'PENDING'
  };

  try {
    console.log(`[SMTP Mail Service] Dispatching Rejection Notice to: ${customerEmail} for Order: ${orderId}...`);
    const smtpRes = await sendSmtpMail({
      to: customerEmail,
      subject,
      html: htmlBody,
      text: textBody
    });

    emailRecord.status = 'SENT';
    emailRecord.smtp_message_id = smtpRes.messageId;
    emailRecord.smtp_engine = smtpRes.engine;
    emailRecord.smtp_response = smtpRes.response;
    saveToOutbox(emailRecord);

    console.log(`[SMTP Mail Service] Successfully sent rejection notice to ${customerEmail}`);

    return {
      success: true,
      messageId: smtpRes.messageId,
      recipient: customerEmail,
      subject,
      sentAt: emailRecord.sent_at,
      engine: smtpRes.engine
    };
  } catch (err) {
    emailRecord.status = 'FAILED';
    emailRecord.error = err.message;
    saveToOutbox(emailRecord);
    console.error(`[SMTP Mail Service] Failed to dispatch rejection notice to ${customerEmail}:`, err.message);
    throw err;
  }
};

/**
 * Sends an immediate acknowledgment email when patient submits prescription order
 */
export const sendOrderSubmittedEmail = async ({
  orderId,
  customerEmail,
  customerName,
  patientName,
  deliveryOption
}) => {
  const subject = `Prescription Order Received [${orderId}] — In Review`;

  const textBody = `
======================================================
MY PHARMACIST DISPENSARY & HEALTHCARE
PRESCRIPTION ORDER RECEIVED
======================================================
Dear ${customerName || patientName || 'Valued Patient'},

We have received your prescription upload (Order ID: ${orderId}).

Our registered dispensary pharmacists are currently verifying your prescription details. 
You will receive another notification once your medication is verified and packed for collection.

Summary:
- Order Reference: ${orderId}
- Patient: ${patientName || customerName}
- Fulfillment: ${deliveryOption || 'Counter Pickup'}
- Estimated Review Time: 15 - 30 Minutes

Hotline: +94 11 234 5678 / +94 77 123 4567
Dispensary: No 45/2, Galle Road, Colombo 03, Sri Lanka
======================================================
`.trim();

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 30px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 800; }
    .content { padding: 30px; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 700; background: #e0f2fe; color: #0369a1; margin-bottom: 16px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0; font-size: 13px; }
    .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>My Pharmacist Dispensary</h1>
      <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Prescription Received & Queued</p>
    </div>
    <div class="content">
      <span class="badge">RECEIVED • UNDER CLINICAL REVIEW</span>
      <h2 style="font-size: 18px; margin: 0 0 10px;">Dear ${customerName || patientName},</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        Your doctor prescription upload has been safely received. Our licensed pharmacists are reviewing your item requests.
      </p>
      <div class="box">
        <div><strong>Order Reference:</strong> <span style="color: #0284c7;">${orderId}</span></div>
        <div style="margin-top: 6px;"><strong>Patient:</strong> ${patientName || customerName}</div>
        <div style="margin-top: 6px;"><strong>Estimated Review Window:</strong> 15 - 30 Minutes</div>
      </div>
      <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
        You will receive another update when your medication is verified and ready for pickup.
      </p>
    </div>
    <div class="footer">
      My Pharmacist Healthcare • No 45/2, Galle Road, Colombo 03 • Hotline: +94 11 234 5678
    </div>
  </div>
</body>
</html>
`.trim();

  const emailRecord = {
    id: `MAIL-${Date.now()}`,
    type: 'SUBMISSION_ACK',
    order_id: orderId,
    to: customerEmail,
    subject,
    text: textBody,
    html: htmlBody,
    sent_at: new Date().toISOString(),
    status: 'PENDING'
  };

  try {
    const smtpRes = await sendSmtpMail({
      to: customerEmail,
      subject,
      html: htmlBody,
      text: textBody
    });

    emailRecord.status = 'SENT';
    emailRecord.smtp_message_id = smtpRes.messageId;
    emailRecord.smtp_engine = smtpRes.engine;
    saveToOutbox(emailRecord);

    return { success: true, messageId: smtpRes.messageId };
  } catch (err) {
    emailRecord.status = 'FAILED';
    emailRecord.error = err.message;
    saveToOutbox(emailRecord);
    // Don't crash submission if email fails
    console.warn(`[SMTP Mail Service] Submission ack email notice:`, err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Sends a real test email to check live SMTP delivery
 */
export const sendTestEmail = async (targetEmail) => {
  const config = getSmtpConfig();
  const recipient = (targetEmail || config.user || '').trim();

  if (!recipient || !recipient.includes('@')) {
    throw new Error('Please specify a valid recipient email address for testing.');
  }

  const subject = `[Test Email] My Pharmacist SMTP Dispatch Test (${new Date().toLocaleTimeString()})`;
  const textBody = `This is a test email dispatched directly via SMTP from My Pharmacist Healthcare Management System.\nSMTP Host: ${config.host}:${config.port}\nSender: ${config.user}\nTimestamp: ${new Date().toISOString()}`;
  const htmlBody = `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #10b981; border-radius: 12px; max-width: 500px;">
      <h2 style="color: #047857; margin-top: 0;">✅ SMTP Connection Verified!</h2>
      <p>This is a real test email sent through your configured SMTP credentials.</p>
      <table style="font-size: 13px; line-height: 1.8; color: #334155;">
        <tr><td><strong>Host:</strong></td><td>${config.host}</td></tr>
        <tr><td><strong>Port:</strong></td><td>${config.port} (SSL/TLS)</td></tr>
        <tr><td><strong>Sender:</strong></td><td>${config.user}</td></tr>
        <tr><td><strong>Timestamp:</strong></td><td>${new Date().toISOString()}</td></tr>
      </table>
    </div>
  `;

  const result = await sendSmtpMail({
    to: recipient,
    subject,
    html: htmlBody,
    text: textBody
  });

  saveToOutbox({
    id: `MAIL-TEST-${Date.now()}`,
    type: 'TEST_EMAIL',
    to: recipient,
    subject,
    text: textBody,
    sent_at: new Date().toISOString(),
    status: 'SENT',
    smtp_message_id: result.messageId,
    smtp_engine: result.engine
  });

  return result;
};
