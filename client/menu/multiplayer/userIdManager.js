let userId = localStorage.getItem('userId');

export function getUserId() {
    if (!userId) {
        userId = generateUserId(); // Generate a unique ID if not already set
        localStorage.setItem('userId', userId);
    }
    return userId;
}

function generateUserId() {
    // Generate a simple unique ID (you can improve this)
    return 'user-' + Math.random().toString(36).substr(2, 9);
}
