export const notifyAllUsers = async (title: string, message: string) => {
    try {
        const baseUrl = window.location.origin;

        await fetch(`${baseUrl}/api/send-broadcast-push`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title, message }),
        });
    } catch (error) {
        console.error('Failed to broadcast:', error);
    }
};
