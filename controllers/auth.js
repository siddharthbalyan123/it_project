const mysql = require('mysql');
const db = require('../model/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { promisify } = require('util');

//login 
exports.login = async (req, res, next) => {
    const { email, password } = req.body;
  
    // 1) Check if email and password exist
    if (!email || !password) {
      return res.status(400).render("login", {
        message: 'Please provide email and password'
      });
    }
  
    // 2) Check if user exists && password is correct
    db.start.query('SELECT * FROM users WHERE email = ?', [email], async(error, results) => {
        if(results==0) {
            return res.status(401).render("login", {
            message: 'Email does not exist'
             });
        }
        console.log(results);
        console.log(password);
        const isMatch = await bcrypt.compare(password, results[0].password);
        console.log(isMatch);
        if(!results || !isMatch ) {
         return res.status(401).render("login", {
           message: 'Incorrect email or password'
        });
      } else {
        // 3) If everything ok, send token to client
        const id = results[0].id;
        console.log(id);
        const token = jwt.sign({ id }, process.env.JWT_SECRET, {
          expiresIn: process.env.JWT_EXPIRES_IN * 24 * 60 * 60 * 1000
        });
  
        const cookieOptions = {
          expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
          ),
          httpOnly: true
        };
        res.cookie('jwt', token, cookieOptions);
        res.render('index', {message : 'Login Successful!'});
     }
    });
  };
  
//register
exports.register = (req, res) => {
    
    console.log(req.body);
    const {name, email, password, c_password} = req.body;

    db.start.query('SELECT email FROM users WHERE email = ?', [email], async (error, results) => {
        if(error){
            console.log(error);
        }
        if(!name || !email || !password || !c_password) {
            return res.status(401).render("register", {
            message: 'Fill all the fields'
             });
        }
        if(results.length > 0){
            return res.render('register', {
                message : 'That email is already in use!'
            })
        }
        else if(password !== c_password){
            return res.render('register', {
                message : 'Passwords do not match!'
            })
        }

        let h_password = await bcrypt.hash(password,8);
        console.log(h_password);

        db.start.query('INSERT INTO users SET ?', {name: name, email: email, password: h_password}, (error,results) => {
            if(error){
                console.log(error);
            }else{
                db.start.query('SELECT id FROM users WHERE email = ?', [email], (error, result) => {
                    const id = result[0].id;
                    console.log(id);
                    const token = jwt.sign({ id }, process.env.JWT_SECRET, {
                      expiresIn: process.env.JWT_EXPIRES_IN * 24 * 60 * 60 * 1000
                    });
          
                    const cookieOptions = {
                      expires: new Date(
                        Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
                      ),
                      httpOnly: true
                    };
                    res.cookie('jwt', token, cookieOptions);
          
                    //res.status(201).redirect("/index");
                    res.render('index',{message : 'Registeration Successful'})
                  });
            }
        });
    });
};

// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
  console.log(req.cookies);
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt, 
        process.env.JWT_SECRET
        );

      console.log(decoded);
      
      // 2) Check if user still exists
      db.start.query('SELECT * FROM users WHERE id = ?', [decoded.id], (error, result) => {
        console.log(result)
        if(!result) {
          return next();
        }
        // THERE IS A LOGGED IN USER
        //req.user = result[0];
        req.user = result[0];

          db.start.query('SELECT * FROM course WHERE uid = ?',[decoded.id], (err, row) => {
          if(!err)
          {
            console.log(row);
            req.locals = row[0];
            res.render('profile', {
              user:req.user,
              row})
          }
          else{
            console.log(err);
          }
        });

        return next();
      });
    } catch (err) {
      return next();
    }
  } else {
    next();
  }
};

//logout
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  //res.status(200).redirect("/index");
  res.render('index',{message : 'Logout Successful'})
};

exports.view = (req, res) => {
  db.start.query('SELECT * FROM course',(err, row) => {
      if(!err)
      {
        console.log(row);
        req.user= row[0];
      }
      else{
        console.log(err);
      }
  });
}

//add rows
exports.addAF = async (req,res, next) => {
  console.log(req.cookies);
  if(req.cookies.jwt)
  {
    try{
        const decoded = await promisify(jwt.verify)(
        req.cookies.jwt, 
        process.env.JWT_SECRET
        );
        req.user = decoded.id;

        db.start.query("SELECT * FROM course WHERE name='Africa' AND uid = ?", decoded.id ,(err,res) => {
            req.user = res [0];
            if(!req.user)
            {
              db.start.query('INSERT INTO course SET ?', {uid : decoded.id, name: 'Africa', img:'img/af.png', link:'AF'}, (err,res) => {
                if(err){
                
                  console.log(err);
                }
              })
            }
           
        })
        return next();

    }catch (err){
      return next();
    }
  }else{
    return next();
  }
}

exports.addAS = async (req,res, next) => {
  console.log(req.cookies);
  if(req.cookies.jwt)
  {
    try{
        const decoded = await promisify(jwt.verify)(
        req.cookies.jwt, 
        process.env.JWT_SECRET
        );
        req.user = decoded.id;

        db.start.query("SELECT * FROM course WHERE name='Asia' AND uid = ?", decoded.id ,(err,res) => {
            req.user = res [0];
            if(!req.user)
            {
              db.start.query('INSERT INTO course SET ?', {uid : decoded.id, name: 'Asia', img:'img/as.png', link:'AS'}, (err,res) => {
                if(err){
                  console.log(err);
                }
              })
            }
        })
        return next();

    }catch (err){
      return next();
    }
  }else{
    return next();
  }
}

exports.addEU = async (req,res, next) => {
  console.log(req.cookies);
  if(req.cookies.jwt)
  {
    try{
        const decoded = await promisify(jwt.verify)(
        req.cookies.jwt, 
        process.env.JWT_SECRET
        );
        req.user = decoded.id;

        db.start.query("SELECT * FROM course WHERE name='Europe' AND uid = ?", decoded.id ,(err,res) => {
            req.user = res [0];
            if(!req.user)
            {
              db.start.query('INSERT INTO course SET ?', {uid : decoded.id, name: 'Europe', img:'img/eu.png', link:'EU'}, (err,res) => {
                if(err){
                  console.log(err);
                }
              })
            }
        })
        return next();

    }catch (err){
      return next();
    }
  }else{
    return next();
  }
}

exports.addNA = async (req,res, next) => {
  console.log(req.cookies);
  if(req.cookies.jwt)
  {
    try{
        const decoded = await promisify(jwt.verify)(
        req.cookies.jwt, 
        process.env.JWT_SECRET
        );
        req.user = decoded.id;

        db.start.query("SELECT * FROM course WHERE name='North America' AND uid = ?", decoded.id ,(err,res) => {
            req.user = res [0];
            if(!req.user)
            {
              db.start.query('INSERT INTO course SET ?', {uid : decoded.id, name: 'North America', img:'img/na.png', link:'NA'}, (err,res) => {
                if(err){
                  console.log(err);
                }
              })
            }
        })
        return next();

    }catch (err){
      return next();
    }
  }else{
    return next();
  }
}

exports.addOC = async (req,res, next) => {
  console.log(req.cookies);
  if(req.cookies.jwt)
  {
    try{
        const decoded = await promisify(jwt.verify)(
        req.cookies.jwt, 
        process.env.JWT_SECRET
        );
        req.user = decoded.id;

        db.start.query("SELECT * FROM course WHERE name='Oceania' AND uid = ?", decoded.id ,(err,res) => {
            req.user = res [0];
            if(!req.user)
            {
              db.start.query('INSERT INTO course SET ?', {uid : decoded.id, name: 'Oceania', img:'img/oc.png', link:'OC'}, (err,res) => {
                if(err){
                  console.log(err);
                }
              })
            }
        })
        return next();

    }catch (err){
      return next();
    }
  }else{
    return next();
  }
}

exports.addSA = async (req,res, next) => {
  console.log(req.cookies);
  if(req.cookies.jwt)
  {
    try{
        const decoded = await promisify(jwt.verify)(
        req.cookies.jwt, 
        process.env.JWT_SECRET
        );
        req.user = decoded.id;

        db.start.query("SELECT * FROM course WHERE name='South America' AND uid = ?", decoded.id ,(err,res) => {
            req.user = res [0];
            if(!req.user)
            {
              db.start.query('INSERT INTO course SET ?', {uid : decoded.id, name: 'South America', img:'img/sa.png', link:'SA'}, (err,res) => {
                if(err){
                  console.log(err);
                }
              })
            }
        })
        return next();

    }catch (err){
      return next();
    }
  }else{
    return next();
  }
}


//delete rows
exports.delAF = async (req,res, next) => {
  console.log(req.cookies);
  if(req.cookies.jwt)
  {
    try{
        const decoded = await promisify(jwt.verify)(
        req.cookies.jwt, 
        process.env.JWT_SECRET
        );
        req.user = decoded.id;
        db.start.query("DELETE FROM course WHERE name = 'Africa' AND uid = ?",decoded.id, (err,res) => {
          if(err){
            console.log(err);
          }
        })
        return next();

    }catch (err){
      return next();
    }
  }else{
    return next();
  }
}

exports.delAS = async (req,res, next) => {
  console.log(req.cookies);
  if(req.cookies.jwt)
  {
    try{
        const decoded = await promisify(jwt.verify)(
        req.cookies.jwt, 
        process.env.JWT_SECRET
        );
        req.user = decoded.id;
        db.start.query("DELETE FROM course WHERE name = 'Asia' AND uid = ?",decoded.id, (err,res) => {
          if(err){
            console.log(err);
          }
        })
        return next();

    }catch (err){
      return next();
    }
  }else{
    return next();
  }
}

exports.delEU = async (req,res, next) => {
  console.log(req.cookies);
  if(req.cookies.jwt)
  {
    try{
        const decoded = await promisify(jwt.verify)(
        req.cookies.jwt, 
        process.env.JWT_SECRET
        );
        req.user = decoded.id;
        db.start.query("DELETE FROM course WHERE name = 'Europe' AND uid = ?",decoded.id, (err,res) => {
          if(err){
            console.log(err);
          }
        })
        return next();

    }catch (err){
      return next();
    }
  }else{
    return next();
  }
}

exports.delNA = async (req,res, next) => {
  console.log(req.cookies);
  if(req.cookies.jwt)
  {
    try{
        const decoded = await promisify(jwt.verify)(
        req.cookies.jwt, 
        process.env.JWT_SECRET
        );
        req.user = decoded.id;
        db.start.query("DELETE FROM course WHERE name = 'North America' AND uid = ?",decoded.id, (err,res) => {
          if(err){
            console.log(err);
          }
        })
        return next();

    }catch (err){
      return next();
    }
  }else{
    return next();
  }
}

exports.delOC = async (req,res, next) => {
  console.log(req.cookies);
  if(req.cookies.jwt)
  {
    try{
        const decoded = await promisify(jwt.verify)(
        req.cookies.jwt, 
        process.env.JWT_SECRET
        );
        req.user = decoded.id;
        db.start.query("DELETE FROM course WHERE name = 'Oceania' AND uid = ?",decoded.id, (err,res) => {
          if(err){
            console.log(err);
          }
        })
        return next();

    }catch (err){
      return next();
    }
  }else{
    return next();
  }
}

exports.delSA = async (req,res, next) => {
  console.log(req.cookies);
  if(req.cookies.jwt)
  {
    try{
        const decoded = await promisify(jwt.verify)(
        req.cookies.jwt, 
        process.env.JWT_SECRET
        );
        req.user = decoded.id;
        db.start.query("DELETE FROM course WHERE name = 'South America' AND uid = ?",decoded.id, (err,res) => {
          if(err){
            console.log(err);
          }
        })
        return next();

    }catch (err){
      return next();
    }
  }else{
    return next();
  }
}