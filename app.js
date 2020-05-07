var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var db = require('./db_conn');
var app = express();
var uuid = require('uuid');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));


app.put('/api/user/login/', (req, res) => {
  var email = req.body.email;
  var password = req.body.password;

  resp = validate_existence(email, 'Email');
  if (resp !== true) {
    return res.status(400).send({
      status: 'failure',
      reason: resp
    });
  }

  resp = validate_password(password, 'Password');
  if (resp !== true) {
    return res.status(400).send({
      status: 'failure',
      reason: resp
    });
  }

  get_user_by_email_and_password(email, password)
  .catch(() => res.status(500).json({
    'status': 'failure',
    'reason': 'Error occurred!'
  }))
  .then((row) => {
    if (row) {
      var auth_token = uuid.v4();
      update_user_login_status(row['id'], 1, auth_token)
      .catch((err) => {
        res.status(500).json({
          'status': 'failure',
          'reason': 'Error occurred!'
        })  
      })
      .then((result) => {
        return res.status(200).send({
          status: 'success',
          auth_token: auth_token
        });
      })
    } else {
      res.status(404).json({
        'status': 'failure',
        'reason': 'User not found!'
      })
    }    
  });
});


app.put('/api/user/change-password/', (req, res) => {
  var password = req.body.password;
  var confirm_password = req.body.confirm_password;
  var auth_token = req.get('auth-token');

  resp = validate_existence(auth_token, 'Auth token');
  if (resp !== true) {
    return res.status(400).send({
      status: 'failure',
      reason: resp
    });
  }

  resp = validate_password(password, 'Password');
  if (resp !== true) {
    return res.status(400).send({
      status: 'failure',
      reason: resp
    });
  }

  resp = validate_existence(confirm_password, 'Confirm Password');
  if (resp !== true) {
    return res.status(400).send({
      status: 'failure',
      reason: resp
    });
  }

  if (password !== confirm_password) {
    return res.status(400).send({
      status: 'failure',
      reason: 'Password and Confirm Password don\'t match'
    });
  }

  get_user_by_auth_token(auth_token)
  .catch((err) => res.status(500).json({
    'status': 'failure',
    'reason': 'Error occurred!'
  }))
  .then((row) => {
    if (row) {
      update_user_password(row['id'], password, 0)
      .catch((err) => {
        res.status(500).json({
          'status': 'failure',
          'reason': 'Error occurred!'
        })  
      })
      .then((result) => {
        return res.status(200).send({
          status: 'success'
        });
      })
    } else {
      res.status(404).json({
        'status': 'failure',
        'reason': 'User not found!'
      })  
    }
  });
});

var validate_existence = function(input, field_display_name) {  
  if (!input) {
    return field_display_name + ' is required';
  }
  return true;
};

var validate_length = function(input, min_length, max_length, field_display_name) {
  if (input.length < min_length || input.length > max_length) {
    return field_display_name + ' must be of minimum ' + min_length + ' characters and maximum ' + max_length + ' characters!';      
  }
  return true;
};

var validate_password = function(input, field_display_name) {
  var resp = validate_existence(input, field_display_name)
  if (resp !== true) {
    return resp;
  }

  return true;
}

var get_user_by_auth_token = function(auth_token) {
  const sql = "SELECT * FROM users WHERE auth_token = ? LIMIT 1";
  return new Promise((resolve, reject) => {
    db.get(sql, [auth_token], (err, result) => {
      if (err) {
        console.log('Error running sql: ' + sql);
        console.log(err);
        reject(err);
      } else {
        resolve(result);
      }
    })
  });
}

var get_user_by_email_and_password = function(email, password) {
  const sql = "SELECT * FROM users WHERE email = ? AND password = ? LIMIT 1";
  return new Promise((resolve, reject) => {
    db.get(sql, [password, email], (err, result) => {
      if (err) {
        console.log('Error running sql: ' + sql);
        console.log(err);
        reject(err);
      } else {
        resolve(result);
      }
    })
  });
}

var update_user_password = function(user_id, password, is_logged_in) {
  const sql = `UPDATE users SET password = ?, is_logged_in = ? where id = ?;`;
  const params = [password, is_logged_in, parseInt(user_id)];
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err, result) => {
      if (err) {
        console.log('Error running sql: ' + sql);
        console.log(err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  })
};

var update_user_login_status = function(user_id, is_logged_in, auth_token) {
  const sql = `UPDATE users SET is_logged_in = ?, auth_token = ? where id = ?;`;
  const params = [is_logged_in, auth_token, user_id];
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err, result) => {
      if (err) {
        console.log('Error running sql: ' + sql);
        console.log(err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

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
