// /api/auth  (guide §6 Auth)
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { notImplemented } = require('../utils/http');

// TODO: validacija, bcrypt.hash, User.create, vrati { token, user }
router.post('/register', notImplemented('POST /api/auth/register'));

// TODO: User.findOne, bcrypt.compare, signToken -> { token, user }
router.post('/login', notImplemented('POST /api/auth/login'));

// TODO: vrati korisnika iz baze (bez passwordHash)
router.get('/me', requireAuth, notImplemented('GET /api/auth/me'));

module.exports = router;
