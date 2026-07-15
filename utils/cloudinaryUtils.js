import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import sharp from 'sharp';
import AppError from './appError.js';

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

  //This initializes a brand-new, empty Readable Stream instance. Think of this like installing an empty water pipe in your application. Right now, it's open, but no data is inside it.
  const readableStream = new Readable();
  //The .push() method is how you feed data into a stream's internal queue. By passing your fileBuffer, you are dumping the raw image data straight into the pipe. The stream breaks this memory buffer down into smaller chunks, ready to be read by the next piece of your code (Sharp).
  readableStream.push(fileBuffer);
  // EOF (End Of File) signal. It tells the stream architecture: "I am completely finished loading data into this pipe. There are no more chunks coming.". If you forget to push null, the stream stays in an open, waiting state forever. Sharp will sit waiting for more data chunks, Cloudinary will keep the network connection open, and your API request will hang until it times out. Pushing null allows the data to flush completely through the pipe.
  readableStream.push(null);

  //When you create an instance of Sharp without passing a file or a buffer directly into the brackets, like sharp(), it initializes itself as a native Node.js Duplex/Transform Stream. When we later setup the pipeline with the readableStream it behaves like so -
  /* Chunk Intake: The raw image data chunks (typically 16KB packs) arrive from your readable stream.
  Streaming Transform: Sharp passes these binary packets immediately into libvips (the native C++ image processing engine underneath Node). It reads the image headers from the first few chunks to understand the dimensions, then begins resizing and transforming the pixel data as subsequent chunks stream through
  Format & Compression On-The-Fly: The instructions .toFormat('jpeg') and .jpeg({ quality }) tell Sharp to re-encode the internal pixel matrix stream into JPEG-compressed binary chunks as it works.
  Instant Output: The moment a chunk is processed and compressed, sharpTransform emits it out of its readable side, pushing it directly down the next pipe segment into Cloudinary's upload stream network socket. */
  const sharpTransform = sharp()
    .resize(width, height)
    .toFormat('jpeg')
    .jpeg({ quality });

  //This creates an empty variable pointer outside the scope of the Promise. Because it is declared outside, the pipeline() function further down can access it to attach the pipes.
  let cloudStream;
  //creating a manual JavaScript Promise because Cloudinary’s native upload_stream method uses older callback syntax (error, result) instead of modern async/await. Wrapping it in a Promise lets you use await on it later.
  const cloudinaryUploadPromise = new Promise((resolve, reject) => {
    //This tells Cloudinary to open a Writable Stream network socket. It acts like a temporary open door over the internet directly to Cloudinary’s media servers. The configuration object tells Cloudinary where to put the file once it arrives.
    cloudStream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, format: 'jpeg' },
      //This is the standard callback mentioned above which we use to reject or resolve the Promise
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      },
    );
    //no need for the cloudStream.end() in this version as the pipeline architecture handles this functionality for you
  });

  try {
    // Safely execute the unbroken stream pipeline. If anything fails, all links are closed safely.
    /* It establishes sequential connections between your streams. It hooks the output of readableStream to the input of sharpTransform, and hooks the output of sharpTransform directly to the network socket of cloudStream. Data immediately begins moving in tiny, manageable binary chunks (usually 16KB packets).
    As the data chunks flow through, pipeline() monitors the lifecycle signals of each segment:When your readableStream runs out of file data, it emits an end event.pipeline() intercepts this event and smoothly forwards it to sharpTransform.Once Sharp processes its final chunk, it completes its work and closes its output.Finally, pipeline() automatically calls .end() on cloudStream. This notifies Cloudinary's servers that the file is complete, allowing them to close the network socket safely.
    The primary reason we use pipeline() instead of old-school .pipe() - If a user uploads a corrupted file, Sharp will throw a formatting error mid-stream. If that happens:
    pipeline() instantly catches the error.It immediately halts the entire operation.It automatically triggers the .destroy() method on every single stream in the chain. This forces the memory buffers to clear and closes down the network socket to Cloudinary, ensuring your server never suffers from hanging connections or memory leaks.It throws the error up into your try/catch block so your code can handle the failure gracefully.
     */
    await pipeline(readableStream, sharpTransform, cloudStream);
    //I wondered whether cloudStream would be an empty variable in the pipeline() because we call this afterwards (and this is where the cloudStream is actually initialised) and I got this explaination which is very interesting -
    /* Your confusion is completely justified and it highlights one of the most subtle details about how JavaScript handles variable scope and execution order. If you look at the code linearly, cloudStream looks like it might still be empty. However, because of how JavaScript Promises execute, cloudStream is fully initialized before the pipeline line runs.
    A common misconception is that code inside a new Promise doesn't run until you await it.In JavaScript, the function inside a new Promise constructor runs synchronously and immediately the exact millisecond the Promise is created. 
    We are forced to play this clever trick with the variables because of an architectural limitation: pipeline() needs the stream object, but we also need the Promise's result
    If we didn't put cloudStream inside the Promise, we wouldn't have a clean way to catch Cloudinary's final network response callback and resolve() the secure URL string.
    If we didn't declare let cloudStream; outside the Promise at the very top, it would be trapped inside the Promise's curly braces (scope), and the pipeline() function below wouldn't be able to see it.By declaring the variable outside, and assigning it inside the instantly running Promise constructor, we bridge the gap perfectly. By the time JavaScript reaches your await pipeline(...) line, cloudStream is fully loaded, active, and ready to receive your image data chunks.
    */
    return await cloudinaryUploadPromise;
  } catch (streamError) {
    //While the pipeline() function automatically tries to clean up after an error, including these explicit .destroy() calls in your catch block provides absolute assurance against memory leaks and frozen server threads.
    /* If a user uploads a corrupted file or their network connection drops midway through an upload, the data stream halts abruptly.When a stream crashes inside a pipeline, it can become "stranded." The stream might know an error occurred, but it doesn't automatically know how to close itself safely.
    If you leave .destroy() out: The unfinished image data chunks remain trapped inside your server's RAM, and the network socket to Cloudinary stays open, waiting indefinitely for data that will never arrive. If this happens to 20 or 30 users over a few days, your server's available memory will slowly disappear until the entire Node.js application completely crashes with an Out of Memory (OOM) allocation error.
    By explicitly calling .destroy(): You ensure that the very millisecond an upload fails, your server aggressively reclaims its memory and closes its open internet sockets. Your server's resource footprint stays flat, clean, and completely safe. */
    readableStream.destroy();
    sharpTransform.destroy();
    //The if (cloudStream) guard: Prevents code execution crashes by ensuring the application only attempts to destroy the Cloudinary stream if it was successfully initialized before the failure occurred.
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
    throw new AppError(
      streamError.message || 'An error occurred during image upload.',
      500,
    );
  }
};

//export the configured cloudinary instance for use elsewhere - import this rather than import {v2 as cloudinary} from 'cloudinary'
export { cloudinary };
