// /api/auth  (guide §6 Auth)
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { requireAuth, signToken } = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../utils/http');

// Username ulazi u imena MongoDB kolekcija ({username}_{type}_{index}), zato je strogo ogranicen
const USERNAME_RE = /^[a-z0-9_-]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Korisnik bez osetljivih polja
const toPublicUser = (u) => ({
  _id: String(u._id),
  username: u.username,
  email: u.email,
  plan: u.plan,
  createdAt: u.createdAt,
});

// Body: { username, email, password } -> 201 { token, user }
router.post('/register', asyncHandler(async (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!USERNAME_RE.test(username)) throw new HttpError(400, 'Username: 3-30 karaktera, samo mala slova, brojevi, _ i -');
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Neispravan email');
  if (password.length < 6) throw new HttpError(400, 'Lozinka mora imati bar 6 karaktera');

  if (await User.exists({ $or: [{ username }, { email }] })) {
    throw new HttpError(409, 'Korisnik sa tim username-om ili email-om vec postoji');
  }

  const user = await User.create({ username, email, passwordHash: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: signToken(user), user: toPublicUser(user) });
}));

// Body: { username, password } (username moze biti i email) -> { token, user }
router.post('/login', asyncHandler(async (req, res) => {
  const login = String(req.body.username || req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  const user = await User.findOne({ $or: [{ username: login }, { email: login }] });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Pogresan username ili lozinka');
  }
  res.json({ token: signToken(user), user: toPublicUser(user) });
}));

// Trenutni korisnik (plan se cita iz baze, ne iz tokena)
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new HttpError(404, 'Korisnik ne postoji');
  res.json(toPublicUser(user));
}));

module.exports = router;
