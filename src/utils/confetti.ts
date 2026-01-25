import confetti from 'canvas-confetti';

/**
 * 🎇 Trigger a realistic confetti explosion from the center.
 * Best for: Single actions like placing a bet.
 */
export const triggerConfettiBurst = () => {
    const count = 200;
    const defaults = {
        origin: { y: 0.7 },
        zIndex: 9999 // Ensure it's on top of modals
    };

    function fire(particleRatio: number, opts: any) {
        confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio)
        });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
};

/**
 * 🏆 Trigger a continuous side-cannon celebration.
 * Best for: Big wins, finishing a pool, or major achievements.
 */
export const triggerCelebration = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    // Use the vivid green and dark colors of the app
    const colors = ['#10B981', '#ffffff'];

    (function frame() {
        confetti({
            particleCount: 2,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: colors,
            zIndex: 9999
        });
        confetti({
            particleCount: 2,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: colors,
            zIndex: 9999
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    })();
};
