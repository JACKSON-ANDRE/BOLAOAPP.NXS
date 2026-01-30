/**
 * Image Processing Utility for Bolão App
 * Optimized for Mobile/iOS
 */

export async function processImage(file: File, maxSize = 800): Promise<Blob> {
    return new Promise((resolve, reject) => {
        // Check if it's already a small JPEG to skip processing if possible
        // (But we usually process anyway to normalize HEIC/PNG)

        const url = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(url); // Clean up memory

            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Calculate new dimensions maintain aspect ratio
            if (width > height) {
                if (width > maxSize) {
                    height *= maxSize / width;
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width *= maxSize / height;
                    height = maxSize;
                }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Falha ao processar imagem (Context)'));
                return;
            }

            // Draw and compress to 80% quality JPEG
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Falha ao gerar arquivo de imagem'));
                },
                'image/jpeg',
                0.8
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Erro ao carregar imagem para processamento'));
        };

        img.src = url;
    });
}
