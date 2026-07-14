import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import sharp from 'sharp';

// configure Cloudinary when the server initialises - do not import { v2 as cloudinary } from 'cloudinary' anywhere else in the app but instead import the cloudinary instance from this file
//we'll configure cloudinary with the .env varaibles - simply sign up for a free Cloudinary account and get the cloud name from the dashboard, you then click on 'Get API Keys' to get the key and secret and then put them in your .env file(s)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Extracts a Cloudinary Public ID from its secure URL string dynamically
 * Works for any directory depth.
 */
export const getPublicIdFromUrl = (url) => {
  if (!url || !url.startsWith('http')) return null;

  const urlParts = url.split('/');
  const fileNameWithExtension = urlParts.pop();
  const fileName = fileNameWithExtension.split('.')[0];

  const uploadIndex = urlParts.indexOf('upload');
  if (uploadIndex === -1) return null;

  const folderParts = urlParts.slice(uploadIndex + 2); // Skips 'upload' and version string (v12345...)
  return [...folderParts, fileName].join('/');
};
/**
 * Non-blocking background worker to safely destroy aborted files, see userController for an example of usage
 */
export const rollbackCloudinaryUploads = (urlsArray) => {
  if (!urlsArray || urlsArray.length === 0) return;

  const validPublicIds = urlsArray
    .map((url) => getPublicIdFromUrl(url))
    .filter(Boolean);

  validPublicIds.forEach((publicId) => {
    cloudinary.uploader
      .destroy(publicId, { invalidate: true })
      .then((result) =>
        console.log(`[Cloudinary Purge] Success: ${publicId}`, result),
      )
      .catch((err) =>
        console.error(`[Cloudinary Purge] Failed for ${publicId}:`, err),
      );
  });
};

// ==========================================
// STRATEGY A: THE BUFFER-TO-MEMORY WORKFLOW
// ==========================================
/**
 * Processes image to a local memory buffer using sharp before uploading.
 * Best suited for: Single profile pictures and low-traffic internal uploads.
 */
export const uploadViaBuffer = async (
  fileBuffer,
  folder,
  publicId,
  options = {},
) => {
  const { width = 500, height = 500, quality = 80 } = options;

  // 1. Await sharp processing to completely finish generating a static buffer in RAM
  const optimizedBuffer = await sharp(fileBuffer)
    .resize(width, height)
    .toFormat('jpeg')
    .jpeg({ quality })
    .toBuffer();

  // 2. Hand that finished buffer over to a standalone Cloudinary upload stream promise
  return new Promise((resolve, reject) => {
    const cloudStream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, format: 'jpeg' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url); // Resolve directly with the resulting cloud URL string
      },
    );
    cloudStream.end(optimizedBuffer);
  });
};

// ==========================================
// STRATEGY B: THE STREAM-PIPELINE WORKFLOW
// ==========================================
/**
 * Pipes data in real-time chunks through Sharp and directly up to Cloudinary.
 * Best suited for: Multi-image galleries, high-traffic routes, and massive file sizes.
 */
export const uploadViaPipeline = async (
  fileBuffer,
  folder,
  publicId,
  options = {},
) => {
  const { width = 800, height = 600, quality = 85 } = options;

  const readableStream = new Readable();
  readableStream.push(fileBuffer);
  readableStream.push(null);

  const sharpTransform = sharp()
    .resize(width, height)
    .toFormat('jpeg')
    .jpeg({ quality });

  let cloudStream;
  const cloudinaryUploadPromise = new Promise((resolve, reject) => {
    cloudStream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, format: 'jpeg' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      },
    );
  });

  try {
    // Safely execute the unbroken stream pipeline. If anything fails, all links are closed safely.
    await pipeline(readableStream, sharpTransform, cloudStream);
    return await cloudinaryUploadPromise;
  } catch (streamError) {
    readableStream.destroy();
    sharpTransform.destroy();
    if (cloudStream) cloudStream.destroy();

    if (
      streamError.message.includes(
        'Input buffer contains unsupported image format',
      ) ||
      streamError.message.includes('Input file has corrupt header')
    ) {
      throw new AppError(
        'The uploaded file is corrupt or not a valid image.',
        400,
      );
    }
    throw streamError;
  }
};

export { cloudinary };
