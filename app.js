if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const User = require('./models/user');
const multer = require('multer');
const { storage } = require('./cloudinary/index');
const upload = multer({ storage });
const File = require('./models/file');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const dbUrl = process.env.DB_URL;
const MongoStore = require("connect-mongo");

mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
})

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));

const secret = process.env.SECRET || 'secret'

const store = MongoStore.create({
    mongoUrl: dbUrl,
    secret,
    touchAfter: 24 * 60 * 60
})

store.on("error", function (e) {
    console.log("Session store error", e)
})

const sessionConfig = {
    store,
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 1000 * 60 * 10,
        maxAge: 1000 * 60 * 10
    }
}

app.use(session(sessionConfig));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.get('/', (req, res) => {
    res.send('hello')
})

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})

app.get('/files/new', (req, res) => {
    res.render('sendForm')
});

app.post('/files', upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash('error', 'You must be singed in');
        return res.redirect('/login');
    }
    const file = new File({ name: req.file.originalname, url: req.file.path, size: req.file.size, type: req.file.mimetype });
    await file.save();
    req.flash('success', 'File send successfully')
    // req.flash('error', 'File cannot be send')
    res.redirect('/files/new');
});

app.get('/register', (req, res) => {
    res.render('register')
})

app.post('/register', async (req, res, next) => {
    try {
        const { email, username, password } = req.body;
        const user = new User({ email, username });
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, err => {
            if (err) return next(err);
        })
        req.flash('success', 'Welcome, now you can send a file');
        res.redirect('files/new');
    } catch (e) {
        req.flash('error', e.message);
        res.redirect('/register');
    }
})

app.get('/login', (req, res) => {
    res.render('login')
})

app.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), (req, res) => {
    req.flash('success', 'Welcome back')
    res.redirect('/files/new')
})

app.get('/logout', (req, res) => {
    req.logout();
    req.flash('success', 'Goodbye')
    res.redirect('/files/new')
})

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log('Serving on port 3000')
})