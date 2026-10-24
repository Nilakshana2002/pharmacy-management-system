import net from 'net';
import tls from 'tls';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded regardless of current working directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

/**
 * Helper to split base64 string into 76-character lines (RFC 2045)
 */
const chunkBase64 = (str) => {
  const b64 = Buffer.from(str, 'utf8').toString('base64');
  return b64.match(/.{1,76}/g)?.join('\r\n') || b64;
};

/**
 * Retrieves normalized SMTP configuration from environment variables
 */
export const getSmtpConfig = () => {
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = (process.env.SMTP_USER || '').trim();
  // Strip spaces from Gmail App Password (e.g., 'cwby xjiz hbja kxnn' -> 'cwbyxjizhbjakxnn')
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
  const from = (process.env.SMTP_FROM || user || 'no-reply@pharmacydispensary.com').trim();
  const fromName = process.env.SMTP_FROM_NAME || 'My Pharmacist Healthcare';

  return { host, port, user, pass, from, fromName };
};

/**
 * Tests connection and authentication with the SMTP server
 */
export const verifySmtpConnection = async () => {
  const config = getSmtpConfig();
  if (!config.user || !config.pass) {
    return {
      ok: false,
      error: 'SMTP_USER or SMTP_PASS missing in .env configuration.'
    };
  }

  // 1. Try nodemailer verify if installed
  try {
    const { default: nodemailer } = await import('nodemailer');
    if (nodemailer && typeof nodemailer.createTransport === 'function') {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: {
          user: config.user,
          pass: config.pass
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      await transporter.verify();
      return {
        ok: true,
        host: config.host,
        port: config.port,
        user: config.user,
        engine: 'nodemailer'
      };
    }
  } catch (err) {
    // Nodemailer not installed or verify failed, fall through to native TLS test
  }

  // 2. Native TLS / SMTP handshake test
  return new Promise((resolve) => {
    let socket = null;
    let timer = null;
    let buffer = '';
    let step = 0;
    let closed = false;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (socket && !closed) {
        closed = true;
        try { socket.end(); } catch (e) {}
        try { socket.destroy(); } catch (e) {}
      }
    };

    timer = setTimeout(() => {
      cleanup();
      resolve({
        ok: false,
        error: `SMTP connection timed out after 15s connecting to ${config.host}:${config.port}`
      });
    }, 15000);

    const onData = (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/).filter(l => l.trim().length > 0);
      const lastLine = lines[lines.length - 1] || '';
      const match = lastLine.match(/^(\d{3})(?: (.*))?$/);
      if (!match) return;

      const code = parseInt(match[1], 10);
      const full = buffer;
      buffer = '';

      if (code >= 400) {
        cleanup();
        return resolve({
          ok: false,
          error: `SMTP error ${code}: ${lastLine}`
        });
      }

      if (step === 0) {
        step = 1;
        socket.write('EHLO localhost\r\n');
      } else if (step === 1) {
        step = 2;
        socket.write('AUTH LOGIN\r\n');
      } else if (step === 2) {
        step = 3;
        socket.write(Buffer.from(config.user).toString('base64') + '\r\n');
      } else if (step === 3) {
        step = 4;
        socket.write(Buffer.from(config.pass).toString('base64') + '\r\n');
      } else if (step === 4) {
        if (code === 235) {
          try { socket.write('QUIT\r\n'); } catch (e) {}
          cleanup();
          return resolve({
            ok: true,
            host: config.host,
            port: config.port,
            user: config.user,
            engine: 'native-tls',
            message: 'SMTP credentials verified successfully.'
          });
        } else {
          cleanup();
          return resolve({
            ok: false,
            error: `Authentication failed (${code}): ${lastLine}`
          });
        }
      }
    };

    if (config.port === 465) {
      socket = tls.connect({
        host: config.host,
        port: config.port,
        servername: config.host,
        rejectUnauthorized: false
      }, () => {
        socket.setEncoding('utf8');
        socket.on('data', onData);
      });
    } else {
      socket = net.connect({ host: config.host, port: config.port }, () => {
        socket.setEncoding('utf8');
        socket.on('data', onData);
      });
    }

    socket.on('error', (err) => {
      cleanup();
      resolve({
        ok: false,
        error: `Socket error connecting to ${config.host}:${config.port} — ${err.message}`
      });
    });
  });
};

/**
 * Sends an email using native TLS or STARTTLS direct to SMTP server
 */
const sendViaNativeTls = ({ host, port, user, pass, from, fromName, to, subject, text, html }) => {
  return new Promise((resolve, reject) => {
    let socket = null;
    let timer = null;
    let buffer = '';
    let step = 0;
    let closed = false;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (socket && !closed) {
        closed = true;
        try { socket.end(); } catch (e) {}
        try { socket.destroy(); } catch (e) {}
      }
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new Error(`SMTP connection timed out after 25s connecting to ${host}:${port}`));
    }, 25000);

    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const msgId = `<${Date.now()}.${Math.random().toString(36).substring(2, 9)}@${host}>`;

    const handleStep = (code, fullResponse) => {
      const lines = fullResponse.split(/\r?\n/).filter(l => l.trim().length > 0);
      const lastLine = lines[lines.length - 1] || '';

      if (code >= 400) {
        cleanup();
        return reject(new Error(`SMTP error (${code}): ${lastLine}`));
      }

      if (step === 0) {
        // 220 banner received
        step = 1;
        socket.write('EHLO localhost\r\n');
      } else if (step === 1) {
        // 250 EHLO received
        step = 2;
        socket.write('AUTH LOGIN\r\n');
      } else if (step === 2) {
        // 334 Username prompt
        step = 3;
        socket.write(Buffer.from(user).toString('base64') + '\r\n');
      } else if (step === 3) {
        // 334 Password prompt
        step = 4;
        socket.write(Buffer.from(pass).toString('base64') + '\r\n');
      } else if (step === 4) {
        // 235 Authentication successful
        if (code !== 235) {
          throw new Error(`SMTP authentication failed (${code}): ${lastLine}`);
        }
        step = 5;
        socket.write(`MAIL FROM:<${from}>\r\n`);
      } else if (step === 5) {
        // 250 MAIL FROM ok
        step = 6;
        socket.write(`RCPT TO:<${to}>\r\n`);
      } else if (step === 6) {
        // 250 RCPT TO ok
        step = 7;
        socket.write('DATA\r\n');
      } else if (step === 7) {
        // 354 Start mail input
        step = 8;

        const encodedSubject = `=?UTF-8?B?${Buffer.from(subject || 'Notification', 'utf8').toString('base64')}?=`;
        const textB64 = chunkBase64(text || '');
        const htmlB64 = chunkBase64(html || '');

        const rawMessage = [
          `From: "${fromName.replace(/"/g, '')}" <${from}>`,
          `To: <${to}>`,
          `Subject: ${encodedSubject}`,
          `Date: ${new Date().toUTCString()}`,
          `Message-ID: ${msgId}`,
          `MIME-Version: 1.0`,
          `Content-Type: multipart/alternative; boundary="${boundary}"`,
          '',
          `--${boundary}`,
          'Content-Type: text/plain; charset=UTF-8',
          'Content-Transfer-Encoding: base64',
          '',
          textB64,
          '',
          `--${boundary}`,
          'Content-Type: text/html; charset=UTF-8',
          'Content-Transfer-Encoding: base64',
          '',
          htmlB64,
          '',
          `--${boundary}--`,
          '.'
        ].join('\r\n');

        socket.write(rawMessage + '\r\n');
      } else if (step === 8) {
        // 250 Message accepted for delivery
        step = 9;
        try { socket.write('QUIT\r\n'); } catch (e) {}
        cleanup();
        resolve({
          success: true,
          messageId: msgId,
          response: lastLine,
          engine: 'native-tls'
        });
      }
    };

    const onData = (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/).filter(l => l.trim().length > 0);
      const lastLine = lines[lines.length - 1] || '';
      const match = lastLine.match(/^(\d{3})(?: (.*))?$/);
      if (!match) return;

      const code = parseInt(match[1], 10);
      const full = buffer;
      buffer = '';

      try {
        handleStep(code, full);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    if (port === 465) {
      socket = tls.connect({
        host,
        port,
        servername: host,
        rejectUnauthorized: false
      }, () => {
        socket.setEncoding('utf8');
        socket.on('data', onData);
      });
    } else {
      socket = net.connect({ host, port }, () => {
        socket.setEncoding('utf8');
        socket.on('data', onData);
      });
    }

    socket.on('error', (err) => {
      cleanup();
      reject(new Error(`Socket connection error to ${host}:${port} — ${err.message}`));
    });
  });
};

/**
 * Dispatches an email using either nodemailer (if installed) or native TLS SMTP
 */
export const sendSmtpMail = async ({
  to,
  subject,
  html,
  text,
  fromEmail,
  fromName
}) => {
  const config = getSmtpConfig();

  const finalFrom = fromEmail || config.from;
  const finalFromName = fromName || config.fromName;

  if (!config.user || !config.pass) {
    throw new Error('SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS in backend/.env.');
  }

  if (!to || !to.includes('@')) {
    throw new Error(`Invalid recipient email address: "${to}".`);
  }

  // 1. Check if nodemailer is installed and functional
  try {
    const { default: nodemailer } = await import('nodemailer');
    if (nodemailer && typeof nodemailer.createTransport === 'function') {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: {
          user: config.user,
          pass: config.pass
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      const info = await transporter.sendMail({
        from: `"${finalFromName}" <${finalFrom}>`,
        to,
        subject,
        text,
        html
      });

      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
        engine: 'nodemailer'
      };
    }
  } catch (err) {
    // If nodemailer is not installed (e.g. Cannot find package 'nodemailer'), fall through to native TLS engine
    if (err.code !== 'ERR_MODULE_NOT_FOUND') {
      console.warn('[SMTP Client] Nodemailer dispatch failed, falling back to native TLS:', err.message);
    }
  }

  // 2. Fall back to zero-dependency native TLS SMTP engine
  return await sendViaNativeTls({
    host: config.host,
    port: config.port,
    user: config.user,
    pass: config.pass,
    from: finalFrom,
    fromName: finalFromName,
    to,
    subject,
    text,
    html
  });
};
