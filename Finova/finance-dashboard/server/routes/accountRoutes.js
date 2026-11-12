const express = require('express');
const {
  createAccount,
  getAccounts,
  getAccountById,
  updateAccount,
  closeAccount,
} = require('../controllers/accountController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Is file ke saare routes private hain
router.use(protect);

router.route('/').post(createAccount).get(getAccounts);
router.route('/:id').get(getAccountById).put(updateAccount).delete(closeAccount);

module.exports = router;