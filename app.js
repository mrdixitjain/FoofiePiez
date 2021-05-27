var http = require('http');
var express = require('express');
var path = require("path");
var router = express.Router();
var session = require('express-session');
var bodyParser = require('body-parser');
// var ejs = require('ejs');
var mysql = require('mysql');
// invoke an instance of express application.
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');

app.use(session({
  secret: 'keyboard cat',
  'redirectTo': "",
	'location': "",
	'city': "",
	'updateFailed': 2,
  resave : false,
  saveUninitialized : false
}))

// create connection with mysql database
var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "dixit@1#$23",
  database: 'myProject',
});

// check if connected or not  
con.connect(function(err){
  if (err) throw err;
  console.log('connected with database');
});

app.use('/',router);

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/views/firstpage.html'));
});

app.route("/user-signin")
  .get((req, res) => {
    res.render("user_signin", {
      "attempt" : 0,
      "wrongField" : "Email",
    });
  })
  .post((req, res) => {
    var email = req.body.email;
    var password = "" + req.body.password;
    sql = "SELECT * FROM user WHERE email = ?;"
    con.query(sql, [email], function(err, results, fields) {
      if (err) throw err;

      if(results.length == 0) {
        res.render("user_signin", {attempt:1, wrongField:'Email'});
      }
      else if(results[0].password == password) {
        req.session.username = results[0].name;
        req.session.email = results[0].email;
        req.session.phone = results[0].phone;
        req.session.password = results[0].password;
        req.session.uid = results[0].uid;
        res.redirect("/homepage");
      }
      else {
        res.render("user_signin", {attempt:1, wrongField:'Password'})
      }
    });
  });

app.route('/user-signup')
  .get((req, res) => {
    res.render("user_signup", {
      "attempt" : 0,
      'signedup' : 0
    });
	})
  .post((req, res) => {
    var phone = req.body.phone;
    var email = req.body.email;
    con.query('SELECT * FROM user WHERE phone=? or email=?', [phone, email], (err, results)=>{
      if(results.length > 0){
        res.render('user_signup', {attempt: 1, signedup : 0})
      }
      else{
        var sql = "SELECT * FROM user;"
        var name = req.body.name;
        var password = "" + req.body.password;
        var answer = req.body.answer;
        con.query(sql, (err, results) => {
          if (err) throw err;          
          var uid = results.length + 1;
          sql = "INSERT INTO user VALUES(?, ?, ?, ?, ?, ?);"
          con.query(sql, [uid, name, phone, email, password, answer], function(err, results, fields)
          {
            if (err) {
              console.log(err);
              res.redirect("/user-signup");
              res.end();
            }
            else {
              res.render("user_signup", {attempt : 0, signedup : 1});
            }
          })
        })
      }
    })
  });

app.route('/user-forgot-password')
  .get((req, res) => {
    res.render("user_forgot_password", {
      "attempt" : 0, 
      'wrongField' : '',
      'changed' : 0,
      'not_matched' : 0
    });
  })
  .post((req, res) => {
		var email = req.body.email;
		var answer = req.body.securityAnswer;
    var password = req.body.password;
    var password2 = req.body.password2;
		con.query("SELECT securityAnswer FROM user WHERE email = ?;", [email], (err, results)=>{
			if(results.length == 0){
				res.render("user_forgot_password", {
          "attempt":1, 
          "wrongField":'Email',
          'changed' : 0,
          'not_matched' : 0
        });
			}
			else if(results[0].securityAnswer != answer){
				res.render("user_forgot_password", {
          'attempt':1, 
          'wrongField':'Security Answer',
          'changed' : 0,
          'not_matched' : 0
        });
      }
      else if(password != password2){
				res.render("user_forgot_password", {
          'attempt' : 0, 
          'wrongField' : '',
          'changed' : 0,
          'not_matched' : 1
        });
      }
      else {
        con.query("UPDATE user SET password=? where email=?;", [password, email], (err, results)=>{
          if (err) throw err;
          res.render("user_forgot_password", {
            'attempt' : 0, 
            'wrongField' : '',
            'changed' : 1,
            'not_matched' : 0
          });
        });
	    }
    });
  });

router.get('/homepage', (req, res) => {

  // let sql1 = "SELECT * FROM user;";
  // con.query(sql1, (err, results) => {
  //   console.log(results);
  // });

  // sql1 = "DESCRIBE user;";
  // con.query(sql1, (err, results) => {
  //   console.log(results);
  // });
  
  if(!('location' in req.session) || req.session.location=="" || req.session.city=="") {
    res.redirect("/");
  }
  else {
    var location = req.session.location;
    var city = req.session.city;

    let sql = "SELECT * FROM restaurant where city = ?;";
    con.query(sql, [city], (err, results) => {
      if (err) {
        console.log("Error in /homepage.");
        console.log("error");
        res.redirect("/homepage");
      }
      else {
        let signed_in = false;
        if (req.session.username !== undefined) {
          signed_in = true
        }

        let userDetail;
        let updateFailed = req.session.updateFailed;
        req.session.updateFailed = 2;

        if (signed_in) {
          userDetail = {
            name : req.session.username,
            phone : req.session.phone,
            email : req.session.email,
            password : req.session.password
          }
        }
        else {
          userDetail = {}
        }
        console.log(userDetail);
        console.log(updateFailed);
        console.log(signed_in);
        console.log("")
        res.render("homepage", {
          user : {
            "signed_in" : signed_in,
            userDetail : userDetail
          },
          "updateFailed" : updateFailed,
          'location' : req.session.location,
          'searchDetail' : results
        });
      }
    });
  }
});

router.route('/restaurant-signup')
  .get((req, res) => {
    res.render('restaurant_signup', {attempt: 0, signedup : 0});
  })
  .post( (req, res) => {
    let name = req.body.name;
    let phone = req.body.phone;
    let email = req.body.email;
    let pwd = req.body.password;
    let address = req.body.address;
    let city = req.body.city;
    let postal = req.body.postal;
    let owner = req.body.owner;
    let answer = req.body.answer;
    let cft = req.body.cft;
    let type = req.body.type;

    let sql = 'DESCRIBE restaurant;'

    con.query(sql, (err, results) => {
      if (err) throw err;
      console.log(results);
    });

    // sql = `CREATE TABLE restaurant (
    //   rid varchar(20),
    //   name varchar(255),
    //   phone varchar(20),
    //   email varchar(255),
    //   password varchar(255),
    //   address varchar(500),
    //   city varchar(255),
    //   postal varchar(255),
    //   owner varchar(255),
    //   answer varchar(255),
    //   cost varchar(255),
    //   type varchar(255)
    // );`

    // con.query(sql, (err, results) => {
    //   if (err) throw err;
    //   console.log(results);
    // });

    sql = `SELECT * FROM restaurant
      WHERE phone=? OR email=?;`;

    con.query(sql, [phone, email], (err, results)=>{
      console.log(results);
      if(results.length>0) {
        res.render('restaurant_signup', {attempt: 1, signedup : 0})
      }
      else{
        var sql = "SELECT * FROM restaurant;"
        con.query(sql, function(err, results) {
          if (err) throw err;
          
          let rid=results.length+1;
          sql = "INSERT INTO restaurant VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);"
          con.query(sql, [rid, name, phone, email, pwd, address, city, postal, owner, answer, cft, type], (err, results) => {
            if (err) throw err;
            res.render("restaurant_signup", {attempt : 0, signedup : 1});
          });
        });            
      }
    });
  });

app.route('/restaurant-signin')
  .get((req,res) => {
    res.render('restaurant_signin', {attempt: 0, wrongField: ""});
  })
  .post((req, res) => {
    var email = req.body.email;
    var password = "" + req.body.password;
    var sql = "SELECT * FROM restaurant WHERE email = ?;"
    con.query(sql, [email], function(err, results, fields) {
      if (err) {
        console.log("MYSQL ERROR IN /restaurant-signin");
        console.log("");
        console.log(err);
        res.render('restaurant_signin', {attempt: 0, wrongField: ""});
      };

      if(results.length == 0) {
        res.render("restaurant_signin", {attempt:1, wrongField:'Email'});
      }
      else if(results[0].password == password) {
        let data = req.body;
        let email = req.body.email;
        let pass = req.body.password;
        let objects = {};
        res.set('Access-Control-Allow-Origin','*');
        sql = `SELECT r.name rname, r.rid, d.name, d.price, d.quantity 
          FROM restaurant r LEFT JOIN dish d ON d.rid = r.rid WHERE r.email = ? and r.password = ?;`;
        // let sql = "SELECT * FROM restaurant where email = ?;";
        // let sql2 = "SELECT * FROM dish;";
        // sql2 = 'DESCRIBE dish;';

        // con.query(sql2, (err, results) => {
        //   console.log(results);
        // })

        con.query(sql, [email, pass], (err, results) => {
          if (err) {
            console.log("MYSQL ERROR IN /restaurants-signin", err);
            res.render('restaurant_signin',{attempt: 0, "wrongField" : ""});
          }
          else {
            if(results.length === 0) {
              console.log("MYSQL ERROR! restaurant's entry not found");
              res.render('restaurant_signin',{attempt: '1', wrongField: "Email"});
            }
            else {
              objects = {};
              objects.rid = results[0].rid;
              objects.rname = results[0].rname;
              objects.dishes = [];
              let arr = [];

              // push dish and it's price in an array
              results.forEach((data)=>{
                arr.push({dish : data.name, price : data.price, quantity : data.quantity});
              });
              objects.dishes = arr;

              var send = async()=>{
                res.render('restaurant_homepage', {objects:objects});
              }
              //Send the object
              send();
            }
          }
        });
      }
      else {
        res.render("restaurant_signin", {attempt:1, wrongField:'Password'})
      }
    });
  });

app.route('/restaurant-forgot-password')
  .get((req, res) => {
    res.render("restaurant_forgot_password", {
      "attempt" : 0, 
      'wrongField' : '',
      'changed' : 0,
      'not_matched' : 0
    });
  })
  .post((req, res) => {
		var email = req.body.email;
		var answer = req.body.securityAnswer;
    var password = req.body.password;
    var password2 = req.body.password2;
    // let sql = "DESCRIBE restaurant;"
    // con.query(sql, (err, results) => {
    //   if (err) throw err;
    //   console.log(results);
    // })
    let sql = "SELECT answer FROM restaurant WHERE email = ?;";
		con.query(sql, [email], (err, results)=>{
			if(results.length == 0){
				res.render("restaurant_forgot_password", {
          "attempt":1, 
          "wrongField":'Email',
          'changed' : 0,
          'not_matched' : 0
        });
			}
			else if(results[0].answer != answer){
				res.render("restaurant_forgot_password", {
          'attempt':1, 
          'wrongField':'Security Answer',
          'changed' : 0,
          'not_matched' : 0
        });
      }
      else if(password != password2){
				res.render("restaurant_forgot_password", {
          'attempt' : 0, 
          'wrongField' : '',
          'changed' : 0,
          'not_matched' : 1
        });
      }
      else {
        con.query("UPDATE restaurant SET password=? where email=?;", [password, email], (err, results)=>{
          if (err) throw err;
          res.render("restaurant_forgot_password", {
            'attempt' : 0, 
            'wrongField' : '',
            'changed' : 1,
            'not_matched' : 0
          });
        });
	    }
    });
  });

app.post('/add/dish',(req,res)=>{
  let data = req.body.obj;
  res.set('Access-Control-Allow-Origin','*');
  sql = "SELECT * FROM dish;";
  con.query(sql, (err, results) => {
    if (err) {
      console.log("MYSQL ERROR IN /add/dish", err);
      res.send("not-inserted in dish table");
    }
    else {
      console.log(data);
      var did = results.length + 1;
      var dish = data.dish.toLowerCase();
      var quantity = data.quantity.toLowerCase();
      var price = data.price;
      let sql = "INSERT INTO dish VALUES(?, ?, ?, ?, ?)"
      let query = con.query(sql,[did, data.rid, dish, quantity, price],(err,results,fields)=>{
        if(err){
          console.log("MYSQL ERROR", err);
          res.send('not-inserted in dish table');
          //throw err;
        }
        else{
          res.send('done');
        }
      });
    }
  });
});

app.route('/search-by-location')
	.get((req, res)=>{
		res.redirect('/homepage');
	})
	.post((req, res)=>{
		var location = req.body.location;
		var city=req.body.city;
		req.session.location=req.body.location;
		req.session.city=city;
    req.session.updateFailed = 2;
		res.redirect("/homepage");
	}
);

app.post('/update-profile', (req, res)=> {
  let email = req.body.email;
  let pass = req.body.password;
  let phone = req.body.phone;
  let uid = req.session.uid;

	con.query('UPDATE user SET email=?, password=?, phone=? WHERE uid=?', [email, pass, phone, uid], (err, results)=>{
		if(err){
			console.log('Error while updating');
      console.log(err);
			req.session.updateFailed = 1;
			res.redirect('/homepage');
		}
		else{
			console.log('profile updated');
			req.session.updateFailed = 0;
      req.session.phone = phone;
      req.session.email = email;
      req.session.password = pass;
			res.redirect('/homepage');
		}
	})
});

app.get('/restaurant', (req, res) => {
	res.redirect('/dashboard');
});


app.get("/restaurant/:id", (req, res) => {
  var restaurant = req.params.id.toLowerCase();

  function getRID () {
    let rid;
    let sql="SELECT rid FROM restaurant WHERE name = ?;";
    con.query(sql, [restaurant], (err, results) => {
      if(err) {
        console.log("SQL error in /restaurants/:id");
        res.redirect("\homepage");
      }
      console.log("hey");
      console.log(results);
      rid = results[0].rid;
    });
    return Promise.resolve(rid);
  }

  async function getDishes() {
    console.log("hello");
    const rid = await getRID();
    console.log("hello2");
    console.log(rid);
    console.log("hello3");
    let sql = "SELECT * FROM dish WHERE rid = ?"
    con.query(sql, [rid], (err, results) => {
      console.log(results);
      if (!(err || results.length == 0)) {
        res.render('restaurant', {
          user : {
            "signed_in" : true,
            userDetail : {
              "name" : 'dixit',
              'phone' : '8742051270',
              'email' : 'jainraj.raj123@gmail.com',
              'password' : "dixit",
            },
          },
          "rid" : rid,
          "status" : 1,
          "name" : restaurant,
          'location' : req.session.location,
          'searchDetail' : results
        });
      }
      else{
        res.render('restaurant', {
          user : {
            "signed_in" : true,
            userDetail : {
              "name" : 'dixit',
              'phone' : '8742051270',
              'email' : 'jainraj.raj123@gmail.com',
              'password' : "dixit",
            },
          },
          "rid" : rid,
          "status" : 0,
          "name" : restaurant,
          'location' : req.session.location,
          'searchDetail' : results
        });
      }
    });
  }
  
  getDishes(); 

  // function executeAsyncTask () {
  //   let valueA;
  //   return getRID()
  //     .then((v) => {
  //       console.log("hello");
  //       console.log(v);
  //       valueA = v;
  //       return getDishes(valueA);
  //     })
  // }

  // function functionA() {
  //   return 1;
  // }

  // function functionB(val) {
  //   return val*2;
  // }

  // function functionC(vala, valb) {
  //   return vala + valb;
  // };

  // function executeAsyncTask1 () {
  //   return functionA()
  //     .then((valueA) => {
  //       return functionB(valueA)
  //         .then((valueB) => {          
  //           return functionC(valueA, valueB)
  //         })
  //     })
  // }

  // res.send(executeAsyncTask1());
	// var restaurant = req.params.id.toLowerCase();
  // console.log(restaurant);
  // let sql="SELECT rid FROM restaurant WHERE name = ?;";
	// const rows = con.query(sql, [restaurant], (err, results) => {
	// 	if(err) throw err;
  //   console.log(results);
  // });
  // console.log(rows);
  //   else {
  //     console.log(results);
  //     let rid = results[0].rid
  //     sql = "SELECT * FROM dish WHERE rid = ?"
  //     con.query(sql, [rid], (err, results) => {
  //       if (!(err || results.length == 0)) {
  //         res.render('restaurant', {
  //           user : {
  //             "signed_in" : true,
  //             userDetail : {
  //               "name" : 'dixit',
  //               'phone' : '8742051270',
  //               'email' : 'jainraj.raj123@gmail.com',
  //               'password' : "dixit",
  //             },
  //           },
  //           "rid" : rid,
  //           "status" : 1,
  //           "name" : restaurant,
  //           'location' : req.session.location,
  //           'searchDetail' : results
  //         });
  //       }
  //       else{
  //         res.render('restaurant', {
  //           user : {
  //             "signed_in" : true,
  //             userDetail : {
  //               "name" : 'dixit',
  //               'phone' : '8742051270',
  //               'email' : 'jainraj.raj123@gmail.com',
  //               'password' : "dixit",
  //             },
  //           },
  //           "rid" : rid,
  //           "status" : 0,
  //           "name" : restaurant,
  //           'location' : req.session.location,
  //           'searchDetail' : results
  //         });
  //       }
  //     });
	// 	}
	// })
})

app.listen(8080, () => console.log(`App started on port 8080`)); 