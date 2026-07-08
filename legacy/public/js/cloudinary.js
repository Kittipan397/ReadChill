export const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/t5bapifi/auto/upload";
export const CLOUDINARY_UPLOAD_PRESET = "readchill_unsigned";

/**
 * Uploads a file to Cloudinary and returns the optimized secure URL.
 * @param {File} file The file to upload
 * @returns {Promise<string>} The optimized URL
 */
export const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(CLOUDINARY_URL, {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "Failed to upload file to Cloudinary");
    }

    const data = await response.json();
    
    // Auto-optimize the URL with f_auto but retain 100% quality for sharp text
    // Only apply this to images
    if (data.resource_type === 'image') {
        const urlParts = data.secure_url.split('/upload/');
        if (urlParts.length === 2) {
            return `${urlParts[0]}/upload/f_auto,q_100/${urlParts[1]}`;
        }
    }
    
    return data.secure_url;
};
