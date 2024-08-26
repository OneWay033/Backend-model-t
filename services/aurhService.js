const pool = require('../pool');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


async function login(username, password) {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await pool.query(query, [username]);

    if (result.rows.length > 0) {
        const user = result.rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (passwordMatch) {
            const token = jwt.sign({ id: user.id, username: user.username }, process.env.SECRET_KEY, { expiresIn: '1d' });
            return { success: true, token, user };
        } else {
            return { success: false, message: 'Invalid username or password' };
        }
    } else {
        return { success: false, message: 'Invalid username or password' };
    }
}

module.exports = {
    login
};
