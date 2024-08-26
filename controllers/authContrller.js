const authService = require('../services/authService');

async function login(req, res) {
    const { username, password } = req.body;
    try {
        const result = await authService.login(username, password);
        if (result.success) {
            res.json({ success: true, message: 'Login successful', token: result.token, user: result.user });
        } else {
            res.status(401).json({ success: false, message: result.message });
        }
    } catch (error) {
        console.error('Error in login:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

module.exports = {
    login
};