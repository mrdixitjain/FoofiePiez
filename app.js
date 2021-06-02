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
	'location': "malaviya nagar",
	'city': "jaipur",
	'updateFailed': 2,
  resave : false,
  saveUninitialized : false
}));

store = {};

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
  res.redirect("/homepage");
  // res.sendFile(path.join(__dirname, '/views/firstpage.html'));
});

app.route("/user-signin")
  .get((req, res) => {
    res.render("user_signin", {
      "attempt" : 0,
      "wrongField" : "",
    });
  })
  .post((req, res) => {
    var email = req.body.email;
    var password = "" + req.body.password;
    sql = "SELECT * FROM user WHERE email = ?;"
    con.query(sql, [email], function(err, results, fields) {
      if (err) {
        console.log("SQL error in /user-signin");
        console.log(err);
        res.redirect("/user-signin");
      };

      if(results.length == 0) {
        res.render("user_signin", {attempt:1, wrongField:'Email'});
      }
      else if(results[0].password == password) {
        let uid = results[0].uid;
        sql = 'SELECT SUM(quantity) sq FROM cart WHERE uid = ?;';
        con.query(sql, [uid], (err, result) => {
          if (err) {
            console.log("SQL error in /user-signin while fetching cart");
            console.log(err);
            res.redirect("/user-signin");
          }
          else {
            req.session.username = results[0].name;
            req.session.email = results[0].email;
            req.session.phone = results[0].phone;
            req.session.password = results[0].password;
            req.session.uid = results[0].uid;
            req.session.userDetail = {
              name : req.session.username,
              phone : req.session.phone,
              email : req.session.email,
              password : req.session.password
            };
            req.session.cart_num = result[0].sq;
            res.redirect("/homepage");
          }
        });
      }
      else {
        res.render("user_signin", {attempt:1, wrongField:'Password'});
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

  req.session.location = "malaviya nagar";
  req.session.city = 'jaipur';
  if (!req.session.cart_num) {
    req.session.cart_num = 0;
  }
  
  if(!('location' in req.session) || req.session.location=="" || req.session.city=="") {
    res.redirect("/");
  }
  else {
    var location = req.session.location;
    var city = req.session.city;

    let sql = "SELECT * FROM restaurant WHERE city = ? AND rid IN (SELECT rid FROM dish GROUP BY rid HAVING COUNT(rid) >= 1);";
    con.query(sql, [city], (err, results) => {
      if (err) {
        console.log("Error in /homepage.");
        console.log(err);
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
        res.render("homepage", {
          user : {
            "signed_in" : signed_in,
            userDetail : userDetail
          },
          "updateFailed" : updateFailed,
          'location' : req.session.location,
          'searchDetail' : results,
          cart_num : req.session.cart_num
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
    let sql = "SELECT * FROM restaurant;";
    con.query(sql, (err, results) => {
      console.log(results);
    });
    res.render('restaurant_signin', {attempt: 0, wrongField: ""});
  })
  .post((req, res) => {
    var email = req.body.email;
    var password = "" + req.body.password;
    var sql = "SELECT * FROM restaurant WHERE email = ?;"
    con.query(sql, [email], function(err, results, fields) {
      if (err) {
        console.log("MYSQL ERROR IN /restaurant-signin");
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
			req.session.updateFailed = 0;
      req.session.phone = phone;
      req.session.email = email;
      req.session.password = pass;
			res.redirect('/homepage');
		}
	})
});

app.get('/restaurant', (req, res) => {
	res.redirect('/homepage');
});

app.get("/restaurant/:id", (req, res)=>{
  if(!('location' in req.session || req.session.city=="" || req.session.location=="")) {
    res.redirect("/homepage");
  }
	var user={userDetail: {}, signed_in: false};
	if(req.session.email){
		user.signed_in = true;
    user.userDetail = req.session.userDetail;
	}
	var restaurant=req.params.id;
	var sql="SELECT * FROM dish WHERE rid in (SELECT rid FROM restaurant WHERE name = ?);";
	con.query(sql, [restaurant], (err, results)=>{
		if(err) {
      console.log("SQL error in /restaurant/:id.");
    }
		req.session.rid = results[0].rid;
    req.session.restaurantName = restaurant;
		if (!(err || results.length==0)){
      res.render('restaurant', {
                  user: user, 
                  name: restaurant, 
                  rid: req.session.rid, 
                  searchDetail: results, 
                  status: 1, 
                  location: req.session.location,
                  cart_num : req.session.cart_num
                });
    }
    else{
      res.render('restaurant', {
                  user: user, 
                  name: restaurant, 
                  rid: req.session.rid, 
                  searchDetail: results, 
                  status: 0, 
                  location: req.session.location,
                  cart_num : req.session.cart_num
                });
    }
	});
});

app.get('/logout', (req, res) => {
  let city = req.session.city;
  let location = req.session.location;
  if (req.session.email) {
    req.session.destroy(function(err) {
      if(err){
        console.log('unable to destroy session')
      }
      else{
        console.log('logged out')
      }
    });
    res.redirect('/homepage');
  } 
  else {
    res.redirect('/homepage');
  }
});

// app.route('/orders')
// 	.get((req, res, next)=> {

//     let sql1 = `CREATE TABLE order (
//                   oid varchar(20),
//                   uid varchar(20),
//                   rid varchar(20),
//                   total varchar(20),
//                   address varchar(255),
//                   paymethod varchar(255)
//                 )`
//     sql1 = `CREATE TABLE orderitems (
//               oid varchar(20),
//               did varchar(20)
//             );`;
//     if(!req.session.email) {
//       req.session.redirectTo = '/orders';
//       res.redirect('/user-signin');
//     }
//     else {
//       next();
//     }
//   }, function(req, res, next) {
//       var email = req.session.email;
//       var user={userDetail: req.session.userDetail, signed_in: true, search: false};      
//       var uid = req.session.uid;
//       var ans=""
//       let sql = `SELECT * FROM (SELECT o.*, r.name FROM order o LEFT JOIN restaurant r
//                   ON o.rid = r.rid where o.uid = ?) as tbl LEFT JOIN orderitem on
//                   tbl.oid = orderitems.oid LEFT JOIN dish on orderitems.did = dish.did;`;
//       // "select * from (select o.*, restaurants.name from orders o  left join  restaurants on o.rid=restaurants.rid where o.uid=?) as tbl left join oitems on  tbl.oid = oitems.oid;"
//       console.log('query done')
//       con.query(sql, [uid], (err, results)=>
//         {
//           if (err) throw err;

//           else if(results.length==0)
//           {
//             console.log('no previous orders')
//             res.render('noOrders.ejs', {user: user})
//           }

//           else
//           {
//             var i=0;
//             while(i<results.length){
//               results[i].orderDetail={1: {dishName: results[i].dishName, quantity: results[i].quantity, price: results[i].price}}
//               delete results[i].dishName
//               delete results[i].quantity
//               delete results[i].price
//               var j=i+1
//               var k=2
//               while(j<results.length && results[j].oid==results[i].oid){
//                 results[i].orderDetail[2] = {dishName: results[j].dishName, quantity: results[j].quantity, price: results[j].price}
//                 results.splice(j, j+1)
//               }
//               i++;
//             }
//             console.log(results)
//             console.log(results[0].orderDetail)
//             res.render('prevOrders.ejs', {results:results, user: user})
          
//           }
//         }
//       )
//     }
// 	)

app.route('/addToCart')
	.post(function(req, res) {
    let did = req.body.obj.did;
    let rid = req.session.rid;
    let uid = req.session.uid;

    let sql = `SELECT * FROM cart WHERE uid = ?`;
    con.query(sql, [uid], (err, results) => {
    if (err) {
        console.log("SQL error in /addToCart.");
        console.log(err);
        res.redirect("/restaurant/"+req.session.restaurantName);
      }
      else if(results.length != 0) {
        if (results[0].rid != rid) {
          sql = `DELETE FROM cart WHERE uid = ?;`;
          con.query(sql, [uid], (err, results) => {
            if (err) {
              console.log("SQL error in /addToCart.");
              console.log(err);
              res.redirect("/restaurant/"+req.session.restaurantName);
            }
            else {
              sql = `INSERT INTO cart VALUES(?, ?, ?, ?);`;
              con.query(sql, [uid, rid, did, 1], (err, results) => {
                if (err) {
                  console.log("SQL error in /addToCart.");
                  console.log(err);
                  res.redirect("/restaurant/"+req.session.restaurantName);
                }
                else {
                  req.session.cart_num = 1;
                  res.send({
                    'done' : 'done',
                    cart_num : req.session.cart_num
                  });
                }
              });
            }
          });
        }
        else {
          let i = 0;
          for(i = 0; i < results.length; i++) {
            if (results[i].did == did) {
              break;
            }
          }
          if (i < results.length) {
            sql = `UPDATE cart
                    SET quantity = quantity+1
                    WHERE did = ?;`;
            con.query(sql, [did], (err, results) => {
              if (err) {
                console.log("SQL error in /addToCart.");
                console.log(err);
                res.redirect("/restaurant/"+req.session.restaurantName);
              }
              else {
                req.session.cart_num += 1;
                res.send({
                  'done' : 'done',
                  cart_num : req.session.cart_num
                });
              }
            });
          }
          else {
            sql = `INSERT INTO cart VALUES(?, ?, ?, 1);`;
            con.query(sql, [uid, rid, did], (err, results) => {
              if (err) {
                console.log("SQL error in /addToCart.");
                console.log(err);
                res.redirect("/restaurant/"+req.session.restaurantName);
              }
              else {
                req.session.cart_num += 1;
                res.send({
                  'done' : 'done',
                  cart_num : req.session.cart_num
                });
              }
            });
          }
        }
      }
      else {
        sql = `INSERT INTO cart VALUES(?, ?, ?, 1);`;
        con.query(sql, [uid, rid, did], (err, results) => {
          if (err) {
            console.log("SQL error in /addToCart.");
            console.log(err);
            res.redirect("/restaurant/"+req.session.restaurantName);
          }
          else {
            req.session.cart_num += 1;
            res.send({
              'done' : 'done',
              cart_num : req.session.cart_num
            });
          }
        });
      }
    }); 
	})
	.get(function(req,res) {
		res.redirect("/homepage");
	});

app.route('/viewCart')
	.get((req, res, next) => {
    if(!req.session.email) {
      req.session.redirectTo = '/viewCart';
      res.redirect('/user-signin');
    }
    else {
      next();
    }
  }, function(req, res) {
      var user = {userDetail: {}, signed_in: false};
      if(req.session.email){
        user.signed_in = true;
        user.userDetail = req.session.userDetail;
      }
      var a= async function() {
        var uid=store.userDetail['uid'];
        var c = await function(){
          console.log(uid+"in cart")
          let sql = `SELECT distinct c.name AS name, c.quantity, c.price, r.name as restaurantName,
                      r.rid as rid FROM cart c INNER JOIN 
          select distinct c.name as name, c.quantity, c.price, 
          r.name as restaurantName, r.rid as rid from cart c inner join restaurants r on c.rid=r.rid where uid=?;`	;			
          con.query(sql, [uid], function(err, results, fields) {
            console.log(results);
            if(results.length==0){
              res.render('cart-is-empty', {user: user});
            }
            else {
              console.log('hello');
              var cartTotal=0;
              for(var i=0; i<results.length; i++){
                cartTotal=cartTotal+results[i].price*results[i].quantity;
              }
              console.log('in cart');
              store['cartTotal']=cartTotal.toFixed(2);
              store['cartDetail']=results;
              store['rid']=results[0].rid;
              res.render('viewCart', {
                          user: user, 
                          cartDetail: results, 
                          cartTotal: cartTotal, 
                          mayOrder: store.mayOrder
                        }
              );
            }
          });
        }

        var b = await function() {
          let sql = `SELECT * FROM orders where uid=? and status='ongoing;`;
          con.query(sql, [uid], (err, results,) => {
            if(results.length >= 2) {
              store['mayOrder']=false;
            }
            else {
              store['mayOrder']=true;
            }
            console.log(results);
            console.log(store.mayOrder);
            c();
          });
        }
        await b();				
      }
      a();
    })

app.listen(8080, () => console.log(`App started on port 8080`)); 