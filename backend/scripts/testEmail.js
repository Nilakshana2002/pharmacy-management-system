import { verifySmtpConnection, sendTestEmail, getSmtpConfig } from '../services/simpleMailService.js';

console.log('======================================================');
console.log('   MY PHARMACIST HEALTHCARE — SMTP EMAIL TESTER       ');
console.log('======================================================');

const config = getSmtpConfig();
console.log(`Target Host : ${config.host}:${config.port}`);
console.log(`Username    : ${config.user}`);
console.log(`Password    : ${config.pass ? '•••••••••••••••• (' + config.pass.length + ' chars)' : 'NOT CONFIGURED'}`);
console.log(`From        : ${config.fromName} <${config.from}>`);
console.log('------------------------------------------------------');

console.log('Step 1: Testing SMTP Server Handshake & Authentication...');
try {
  const verifyRes = await verifySmtpConnection();
  if (!verifyRes.ok) {
    console.error('❌ SMTP Verification Failed:', verifyRes.error);
    process.exit(1);
  }
  console.log(`✅ SMTP Handshake Successful! (Engine: ${verifyRes.engine || 'native-tls'})`);

  console.log('\nStep 2: Dispatching Real Test Email to Sender...');
  const sendRes = await sendTestEmail(config.user);
  console.log('✅ Real Test Email Dispatched Successfully!');
  console.log('Message ID:', sendRes.messageId);
  console.log(`Please check the inbox for: ${config.user}`);
} catch (err) {
  console.error('❌ Error during email dispatch:', err.message);
  process.exit(1);
}

console.log('======================================================');
