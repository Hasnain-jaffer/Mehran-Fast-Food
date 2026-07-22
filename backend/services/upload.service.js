const cloudinary = require('../config/cloudinary');
const { ApiError } = require('../utils/ApiError');

// Uploads a buffer (from multer memoryStorage) to Cloudinary using an
// upload_stream — avoids writing the file to disk at any point.
function uploadBufferToCloudinary(buffer, { folder, publicIdPrefix }) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder, // e.g. 'mehran/profiles' — keeps uploads organized by purpose
        public_id: `${publicIdPrefix}_${Date.now()}`,
        // Automatic optimization: Cloudinary picks the best format/quality
        // for the requesting client instead of serving a fixed-size original.
        transformation: [{ width: 512, height: 512, crop: 'fill', gravity: 'face' }],
        quality: 'auto',
        fetch_format: 'auto'
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

async function uploadProfileImage({ buffer, userId }) {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
    // Fail loudly and clearly rather than silently storing a broken/empty
    // image reference — this is a deployment configuration gap, not a
    // user error, so the message says so.
    throw new ApiError(500, 'Image upload is not configured on this server (missing Cloudinary credentials).');
  }

  const result = await uploadBufferToCloudinary(buffer, {
    folder: 'mehran/profiles',
    publicIdPrefix: `user_${userId}`
  });

  return { url: result.secure_url, publicId: result.public_id };
}

// Deletes a previously-uploaded image by its Cloudinary public_id — used
// when a user replaces their profile photo, so old images don't
// accumulate unused in the Cloudinary account indefinitely.
async function deleteImage(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    // Best-effort cleanup — a failed delete of the OLD image shouldn't
    // block the user from having successfully set their NEW one.
    console.error('Cloudinary cleanup failed for', publicId, err.message);
  }
}

module.exports = { uploadProfileImage, deleteImage };
