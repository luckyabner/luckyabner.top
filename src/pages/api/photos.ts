export const prerender = false;

import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import type { APIRoute } from 'astro';
import { getSecret } from 'astro:env/server';
import { s3 } from '../../lib/s3';

export const GET: APIRoute = async ({ url }) => {
	const BUCKET = getSecret('R2_BUCKET') || 'photos';
	const END_POINT = getSecret('R2_ENDPOINT');
	const CUSTOM_DOMAIN = getSecret('R2_CUSTOM_DOMAIN');

	try {
		// 从查询参数中获取分页信息
		const searchParams = new URLSearchParams(url.search);
		const maxKeys = parseInt(searchParams.get('max-keys') || '1000');
		const continuationToken = searchParams.get('continuation-token');
		const prefix = searchParams.get('prefix') || '';

		const command = new ListObjectsV2Command({
			Bucket: BUCKET,
			MaxKeys: maxKeys,
			ContinuationToken: continuationToken || undefined,
			Prefix: prefix || undefined,
		});

		const data = await s3.send(command);

		// 将 S3 对象转换为照片格式
		const photos = (data.Contents || [])
			.map((object, index) => {
				const key = object.Key || '';

				// 跳过目录
				if (key.endsWith('/')) {
					return null;
				}

				// 生成图片 URL
				const imageUrl = CUSTOM_DOMAIN ? `${CUSTOM_DOMAIN}/${key}` : `${END_POINT}/${key}`;

				// 从文件名生成标题
				const fileName = key.split('/').pop() || '';
				const title = fileName.split('.')[0] || `Photo ${index + 1}`;

				return {
					id: index + 1,
					title: title.charAt(0).toUpperCase() + title.slice(1),
					url: imageUrl,
					key: key,
					lastModified: object.LastModified?.toISOString(),
					size: object.Size,
				};
			})
			.filter(Boolean); // 过滤掉 null 值

		return new Response(
			JSON.stringify({
				photos,
				isTruncated: data.IsTruncated || false,
				nextContinuationToken: data.NextContinuationToken,
				keyCount: data.KeyCount || 0,
			}),
			{
				headers: { 'Content-Type': 'application/json' },
			}
		);
	} catch (error) {
		console.error('Error fetching photos from R2:', error);
		return new Response(
			JSON.stringify({
				error: 'Failed to fetch photos',
				details: error instanceof Error ? error.message : 'Unknown error',
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};
