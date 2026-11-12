const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// ---------- PROTECT: login zaroori ----------
const protect = async (req, res, next) => {
  try {
    // 1. Header se token nikalo
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Login required: token nahi mila' });
    }
    const token = header.split(' ')[1];

    // 2. Token verify karo
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. User abhi bhi DB mein hai? (delete ho gaya ho to access band)
    const result = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [decoded.id]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'User exist nahi karta' });
    }

    // 4. User ko request mein attach karo
    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalid ya expire ho gaya' });
  }
};

// ---------- AUTHORIZE: role check ----------
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Aapko is kaam ki permission nahi hai' });
    }
    next();
  };
};

module.exports = { protect, authorize };