import path from 'path';

async function main() {
  console.log('--- AWS CREDENTIAL ENVIRONMENT CHECK ---');
  const keyId = process.env.AWS_ACCESS_KEY_ID;
  const secret = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.REMOTION_AWS_REGION || process.env.AWS_REGION || 'us-east-1';

  console.log('AWS_ACCESS_KEY_ID present:', Boolean(keyId));
  console.log('AWS_SECRET_ACCESS_KEY present:', Boolean(secret));
  console.log('AWS Region selected:', region);

  if (keyId) {
    console.log('Key ID Prefix:', keyId.substring(0, 4) + '***');
  }

  if (!keyId || !secret) {
    console.log('\nRESULT: AWS credentials are NOT currently exposed to this environment process.');
    process.exit(1);
  } else {
    console.log('\nRESULT: AWS credentials ARE available in this process environment.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
