import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstallable, setIsInstallable] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            console.log('PWA: beforeinstallprompt disparado!');
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsInstallable(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Verifica se já teve disparo (alguns navegadores guardam)
        if (window.hasOwnProperty('beforeinstallprompt')) {
            console.log('PWA: Evento já existia no window');
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const install = async () => {
        if (!deferredPrompt) {
            console.log('PWA: Tentativa de instalação sem prompt diferido');
            return false;
        }

        await deferredPrompt.prompt();
        const result = await deferredPrompt.userChoice;
        console.log('PWA: Escolha do usuário:', result.outcome);

        if (result.outcome === 'accepted') {
            setIsInstallable(false);
            setDeferredPrompt(null);
            return true;
        }
        return false;
    };

    return { isInstallable, install };
}
