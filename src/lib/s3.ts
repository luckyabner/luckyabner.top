import { S3Client } from '@aws-sdk/client-s3';
import { getSecret } from 'astro:env/server';

export const s3 = new S3Client({
	region: 'auto',
	endpoint: getSecret('R2_ENDPOINT'),
	credentials: {
		accessKeyId: getSecret('R2_ACCESS_KEY_ID') || 'default',
		secretAccessKey: getSecret('R2_SECRET_ACCESS_KEY') || 'default',
	},
	forcePathStyle: true, // 对于 R2 很重要
});