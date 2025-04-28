var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const mySqlPool = require('./config/db')
const Handlebars = require('handlebars');
const expressHbs = require('express-handlebars')
const { allowInsecurePrototypeAccess } = require('@handlebars/allow-prototype-access');
const session = require("express-session");
const sessionStore = require('connect-mongodb-session')(session)
var mongoose = require('mongoose')
const fs = require('fs');


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

//DB MongDB
mongoose.connect('mongodb://localhost/Network-SNMP',{useNewUrlParser : true,
  useUnifiedTopology:true ,
  useCreateIndex: true},(err)=>{
if (err) {
console.log(err);
} else {
console.log('Connect to  MongDB DataBase successfull');
}
});

        // Connect to the second database
        mongoose.createConnection('mongodb://localhost/Network-oids', {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          useCreateIndex: true
      }, (err) => {
          if (err) {
              console.log('Error connecting to Network-oids database:', err);
          } else {
              console.log('Connected to Network-PacketLossDataBase database successfully');
          }
      });
app.use(express.urlencoded({ extended: true })); // Middleware to parse form data
// Set up session middleware

app.use(session({
  secret: 'your_secret_key_1', // Change this to a secure random string
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));


app.engine('.hbs',expressHbs({defaultLayout : 'layout',extname : '.hbs' ,handlebars: allowInsecurePrototypeAccess(Handlebars),helpers: {
  json: function (context) {
    return JSON.stringify(context, null, 2);
  },
    eq: function(a, b) {
        return a === b;
    },
    gt: function (a, b) {  // Here is the gt helper
      return a > b;
  },
  sortByDays: function (data, options) {
    // Sort data by upTime.days in descending order
    const sortedData = data.slice().sort((a, b) => b.upTime.days - a.upTime.days);
    // Pass the sorted data back to the template
    return options.fn({ sortedData });
  } ,
    add: (value, increment) => parseInt(value, 10) + parseInt(increment, 10),

}}));


// view engine setup
app.set('views', path.join(__dirname, 'views'));
//hbs.registerPartials(path.join(__dirname, 'views/partials'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// Set limit on the body parser
//lang
app.use((req, res, next) => {
  const lang = req.query.lang || req.cookies.lang || 'ar';  //default its arabic
  res.locals.lang = lang;
  res.locals.translations = require(`./locales/${lang}.json`);
  res.cookie('lang', lang);
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/', indexRouter);
app.use('/users', usersRouter);



/*
//Database Connect 
mySqlPool.query('SELECT 1').then(()=>{
  console.log("Database Connected")
  }).catch((err)=>{
    console.log(err)
})

*/



app.use((req, res, next) => {
  // Determine the language (defaults to English if no query parameter is set)
  const lang = req.query.lang || 'ar';
  const langFile = `./locales/${lang}.json`;

  // Load the language file and attach it to `res.locals.lang`
  fs.readFile(langFile, 'utf8', (err, data) => {
    if (!err) {
      res.locals.lang = JSON.parse(data);
    } else {
      res.locals.lang = {}; // fallback in case of an error
    }
    next();
  });
});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
