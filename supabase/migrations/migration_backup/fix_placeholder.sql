-- Remove invalid placeholder URL to stop console errors
UPDATE app_settings
SET pix_qrcode_url = ''
WHERE pix_qrcode_url = 'https://placeholder.com/qr.png';
