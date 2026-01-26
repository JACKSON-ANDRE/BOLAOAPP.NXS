export const notifyAdmin = async (title: string, message: string) => {
    try {
        // Determine the base URL (local or production)
        const baseUrl = window.location.origin;

        // Call the serverless function
        await fetch(`${baseUrl}/api/send-admin-push`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title, message }),
        });
    } catch (error) {
        console.error('Failed to notify admin:', error);
        // Silent fail - don't block user flow
    }
};
