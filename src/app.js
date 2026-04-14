import express from 'express';
import session from 'express-session';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET ?? 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' },
}));

// Routes (mounted after session middleware)
import { authRouter } from './routes/auth.js';
import { boardRouter } from './routes/board.js';
import { ticketsRouter } from './routes/tickets.js';

app.use('/auth', authRouter);
app.use('/orgs', boardRouter);
app.use('/orgs', ticketsRouter);

app.get('/', (req, res) => {
  res.redirect('/auth/login');
});

export { app };
