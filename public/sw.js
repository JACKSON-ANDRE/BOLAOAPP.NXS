
// Minimal Service Worker to stop MIME errors and allow push
self.addEventListener('push', function (event) {
    let data = { title: 'Bolão App', body: 'Nova notificação!' };
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: 'https://vucvouxutompqoqhxzmi.supabase.co/storage/v1/object/public/app_assets/pwa-icon.png',
        badge: 'https://vucvouxutompqoqhxzmi.supabase.co/storage/v1/object/public/app_assets/pwa-icon.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
