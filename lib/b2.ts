import { S3Client } from '@aws-sdk/client-s3';

let client: S3Client;

export function getB2Client(): S3Client {
  if (client) return client;

  client = new S3Client({
    endpoint: process.env.B2_ENDPOINT,
    region: 'us-west-004',
    credentials: {
      accessKeyId: process.env.B2_KEY_ID ?? '',
      secretAccessKey: process.env.B2_APP_KEY ?? '',
    },
  });

  return client;
}

export function getBucketName(): string {
  return process.env.B2_BUCKET_NAME ?? '';
}
