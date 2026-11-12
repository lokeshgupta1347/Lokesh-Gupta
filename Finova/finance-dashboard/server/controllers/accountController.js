const pool = require('../config/db');

const ACCOUNT_TYPES = ['Savings', 'Current', 'Credit Card', 'Cash', 'Wallet'];

// Helper: id valid integer hai ya nahi
const isValidId = (id) => Number.isInteger(Number(id)) && Number(id) > 0;

// ---------- CREATE ----------
const createAccount = async (req, res) => {
  try {
    const { name, type, balance = 0, currency = 'INR' } = req.body;

    // 1. Validation
    if (!name || !type) {
      return res.status(400).json({ message: 'Name aur type required hain' });
    }
    if (!ACCOUNT_TYPES.includes(type)) {
      return res.status(400).json({
        message: `Type in mein se ek hona chahiye: ${ACCOUNT_TYPES.join(', ')}`,
      });
    }

    const openingBalance = Number(balance);
    if (Number.isNaN(openingBalance)) {
      return res.status(400).json({ message: 'Balance ek number hona chahiye' });
    }
    // Sirf Credit Card ka balance negative ho sakta hai (udhaar)
    if (openingBalance < 0 && type !== 'Credit Card') {
      return res.status(400).json({ message: 'Is account type ka balance negative nahi ho sakta' });
    }

    const cleanCurrency = String(currency).trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(cleanCurrency)) {
      return res.status(400).json({ message: 'Currency 3 letters ki honi chahiye (jaise INR, USD)' });
    }

    // 2. Insert (user_id token se, body se nahi)
    const result = await pool.query(
      `INSERT INTO accounts (user_id, name, type, balance, currency)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, name.trim(), type, openingBalance, cleanCurrency]
    );

    res.status(201).json({ account: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ---------- READ ALL ----------
const getAccounts = async (req, res) => {
  try {
    const { status } = req.query; // optional: /api/accounts?status=active

    let query = 'SELECT * FROM accounts WHERE user_id = $1';
    const params = [req.user.id];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json({ count: result.rows.length, accounts: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ---------- READ ONE ----------
const getAccountById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid account id' });
    }

    const result = await pool.query(
      'SELECT * FROM accounts WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Account nahi mila' });
    }

    res.json({ account: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ---------- UPDATE ----------
const updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid account id' });
    }

    const { name, type, status } = req.body;

    if (type && !ACCOUNT_TYPES.includes(type)) {
      return res.status(400).json({ message: 'Invalid account type' });
    }
    if (status && !['active', 'closed'].includes(status)) {
      return res.status(400).json({ message: "Status 'active' ya 'closed' hona chahiye" });
    }

    const result = await pool.query(
      `UPDATE accounts
       SET name   = COALESCE($1, name),
           type   = COALESCE($2, type),
           status = COALESCE($3, status)
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [name ? name.trim() : null, type || null, status || null, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Account nahi mila' });
    }

    res.json({ account: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ---------- DELETE (soft: account close karna) ----------
const closeAccount = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid account id' });
    }

    const result = await pool.query(
      `UPDATE accounts SET status = 'closed'
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Account nahi mila' });
    }

    res.json({ message: 'Account close ho gaya', account: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createAccount,
  getAccounts,
  getAccountById,
  updateAccount,
  closeAccount,
};