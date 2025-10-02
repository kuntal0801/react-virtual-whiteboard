// Call a put api to update the canvas on URL localhost:3030/canvas/:uuid
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3030/canvas';

export const updateCanvasAPI = async (uuid, elements) => {
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            throw new Error('No authentication token found');
        }
        const response = await fetch(`${API_BASE_URL}/${uuid}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({elements}),
        });
        if (!response.ok) {
            throw new Error('Failed to update canvas');
        }
        return await response.json();
    } catch (error) {
        console.error('Error updating canvas:', error);
        throw error;
    }
};