const CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

export async function uploadDocumentToCloudinary(file, documentType) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', `froehlich-vermoegensberatung/documents/${documentType}`);

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
        { method: 'POST', body: formData }
    );

    if (!response.ok) throw new Error('Upload fehlgeschlagen');

    const data = await response.json();
    return {
        url: data.secure_url,
        public_id: data.public_id,
        name: file.name,
    };
}