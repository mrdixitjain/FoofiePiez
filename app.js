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
  if (!req.session.location || !req.session.city || req.session.location=="" || req.session.city=="") {
    res.sendFile(path.join(__dirname, '/views/firstpage.html'));
  }
  else {
    res.redirect("/homepage");
  }
});

app.route("/user-signin")
  .get((req, res) => {
    if (!req.session.usertype) {
      res.render("user_signin", {
        "attempt" : 0,
        "wrongField" : "",
      });
    }
    else if (req.session.usertype == 'restaurant') {
      res.redirect("/restaurant-homepage");
    }
    else {
      res.redirect("/homepage");
    }    
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
            req.session.usertype = 'user';
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
    if (!req.session.usertype) {
      res.render("user_signup", {
        "attempt" : 0,
        'signedup' : 0
      });
    }
    else if (req.session.usertype == 'restaurant') {
      res.redirect("/restaurant-homepage");
    }
    else {
      res.redirect("/homepage");
    }  
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
              console.log("SQL error in /user_signup")
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
  // res.redirect("/orders");
  req.session.location = 'malaviya nagar';
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

    let sql = `SELECT * FROM restaurant 
                WHERE city = ? 
                AND rid IN (SELECT rid FROM dish GROUP BY rid HAVING COUNT(rid) >= 1);`;
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
    if (!req.session.usertype) {
      res.render('restaurant_signup', {attempt: 0, signedup : 0});
    }
    else if (req.session.usertype == 'restaurant') {
      res.redirect("/restaurant-homepage");
    }
    else {
      res.redirect("/homepage");
    } 
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

    sql = `SELECT * FROM restaurant
      WHERE phone=? OR email=?;`;

    con.query(sql, [phone, email], (err, results)=>{
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
    if (!req.session.usertype) {
      res.render('restaurant_signin', {attempt: 0, wrongField: ""});
    }
    else if (req.session.usertype == 'restaurant') {
      res.redirect("/restaurant-homepage");
    }
    else {
      res.redirect("/homepage");
    }
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
        req.session.usertype = 'restaurant';
        req.session.rid = results[0].rid;
        req.session.rname = results[0].rname;
        req.session.email = results[0].email;
        req.session.phone = results[0].phone;
        req.session.password = results[0].password;
        res.redirect("/restaurant-homepage");
      }
      else {
        res.render("restaurant_signin", {attempt:1, wrongField:'Password'})
      }
    });
  });

app.route("/restaurant-homepage")
  .get((req, res) => {
    if (req.session.usertype != 'restaurant' || !req.session.rid) {
      res.redirect("/restaurant-signin");
    }
    else {
      let rid = req.session.rid;
      let rname = req.session.rname;
      let objects = {};
      let sql = `SELECT r.rname, r.rid, d.name, d.price, d.volume, d.did 
        FROM restaurant r LEFT JOIN dish d ON d.rid = r.rid 
        WHERE r.rid = ? AND d.deleted = 0 ;`;

      con.query(sql, [rid], (err, result) => {
        if (err) {
          console.log("MYSQL ERROR IN /restaurants-signin", err);
          res.render('restaurant_signin',{attempt: 0, "wrongField" : ""});
        }
        else {
          if(result.length === 0) {
            console.log("No dishes in this restaurant.");
            res.render('restaurant_homepage',{objects: {
                                                rid: rid,
                                                rname: rname,
                                                dishes: []
                                              }});
          }
          else {
            objects = {};
            objects.rid = rid;
            objects.rname = rname;
            let restaurant = {detail: {
                                    name : req.session.rname,
                                    phone : req.session.phone,
                                    email : req.session.email,
                                    password : req.session.password,
                                  }};
            objects.dishes = [];
            let arr = [];
            
            result.forEach((data)=>{
              arr.push({dish : data.name, price : data.price, volume : data.volume, did: data.did});
            });
            objects.dishes = arr;

            var send = async() => {
              let updateFailed = req.session.updateFailed;
              req.session.updateFailed = 2;
              res.render('restaurant_homepage', {objects: objects, 
                                                  restaurant: restaurant,
                                                  updateFailed: updateFailed
                                                });
            }
            send();
          }
        }
      });
    }
  });

app.route("/pending-orders")
  .post((req, res) => {
    if (req.session.usertype != 'restaurant' || !req.session.rid) {
      res.redirect("/restaurant-signin");
    }
    else {
      let rid = req.session.rid;
      let restaurant = {detail: {
        name : req.session.rname,
        phone : req.session.phone,
        email : req.session.email,
        password : req.session.password,
      }};

      let sql = `SELECT * FROM (SELECT o.*, r.rname FROM orders o LEFT JOIN restaurant r
        ON o.rid = r.rid where r.rid = ?) as tbl LEFT JOIN oitems on
        tbl.oid = oitems.oid LEFT JOIN dish on oitems.did = dish.did 
        WHERE tbl.status != 'delivered' 
          AND tbl.status != 'cancelled by restaurant' 
          AND tbl.status != 'cancelled by user' ORDER BY tbl.oid DESC;`;
      con.query(sql, [rid], (err, results) => {
        if (err) {
          console.log("MYSQL error in /pending-orders");
          console.log(err);
          res.redirect("/restaurant-homepage");
        }
        else if(results.length == 0) {
          res.render("no-pending-order", {restaurant: restaurant});
        }
        else {
          var i = 0;
          var j = 0;
          ans = []
          ans.push({
                    oid : results[i].oid,
                    rid : results[i].rid,
                    uid : results[i].uid,
                    status : results[i].status,
                    address : results[i].address,
                    paymentMethod : results[i].paymentMethod,
                    rname : results[i].rname
          });
          ans[j].orderDetail = {1: {
                                    dishName: results[i].name, 
                                    volume: results[i].volume, 
                                    quantity: results[i].quantity, 
                                    price: results[i].price,
                                    did : results[i].did
                                  }};
          ans[j].total = results[i].quantity * parseFloat(results[i].price);
          i += 1;
          while(i < results.length) {
            if (results[i].oid == ans[j].oid) {
              ans[j].orderDetail[Object.keys(ans[j].orderDetail).length + 1] = {
                                            dishName: results[i].name, 
                                            quantity: results[i].quantity, 
                                            price: results[i].price, 
                                            volume: results[i].volume,
                                            did : results[i].did
                                          };
              ans[j].total += results[i].quantity * parseFloat(results[i].price);
              i += 1;
            }
            else {
              ans[j].total = ans[j].total.toFixed(2);
              j += 1;
              ans.push({
                        oid : results[i].oid,
                        rid : results[i].rid,
                        uid : results[i].uid,
                        status : results[i].status,
                        address : results[i].address,
                        paymentMethod : results[i].paymentMethod,
                        rname : results[i].rname
              });
              ans[j].orderDetail = {1: {
                                        dishName: results[i].name, 
                                        volume: results[i].volume, 
                                        quantity: results[i].quantity, 
                                        price: results[i].price,
                                        did : results[i].did
                                      }};
              ans[j].total = results[i].quantity * parseFloat(results[i].price);
              i += 1;
            }
          }
          res.render("pending-orders", {results : ans, restaurant: restaurant, title: "Pending orders"});
        }
      });
    }
  });

  app.route("/all-orders")
  .get((req, res) => {
    if (req.session.usertype != 'restaurant' || !req.session.rid) {
      res.redirect("/restaurant-signin");
    }
    else {
      let rid = req.session.rid;
      let restaurant = {detail: {
        name : req.session.rname,
        phone : req.session.phone,
        email : req.session.email,
        password : req.session.password,
      }};

      let sql = `SELECT * FROM (SELECT o.*, r.rname FROM orders o LEFT JOIN restaurant r
        ON o.rid = r.rid where r.rid = ?) as tbl LEFT JOIN oitems on
        tbl.oid = oitems.oid LEFT JOIN dish on oitems.did = dish.did ORDER BY tbl.oid DESC`;
      con.query(sql, [rid], (err, results) => {
        if (err) {
          console.log("MYSQL error in /pending-orders");
          console.log(err);
          res.redirect("/restaurant-homepage");
        }
        else if(results.length == 0) {
          res.render("no-pending-order", {restaurant: restaurant});
        }
        else {
          var i = 0;
          var j = 0;
          ans = [];
          ans.push({
                    oid : results[i].oid,
                    rid : results[i].rid,
                    uid : results[i].uid,
                    status : results[i].status,
                    address : results[i].address,
                    paymentMethod : results[i].paymentMethod,
                    rname : results[i].rname
          });
          ans[j].orderDetail = {1: {
                                    dishName: results[i].name, 
                                    volume: results[i].volume, 
                                    quantity: results[i].quantity, 
                                    price: results[i].price,
                                    did : results[i].did
                                  }};
          ans[j].total = results[i].quantity * parseFloat(results[i].price);
          i += 1;
          while(i < results.length) {
            if (results[i].oid == ans[j].oid) {
              ans[j].orderDetail[Object.keys(ans[j].orderDetail).length + 1] = {
                                            dishName: results[i].name, 
                                            quantity: results[i].quantity, 
                                            price: results[i].price, 
                                            volume: results[i].volume,
                                            did : results[i].did
                                          };
              ans[j].total += results[i].quantity * parseFloat(results[i].price);
              i += 1;
            }
            else {
              ans[j].total = ans[j].total.toFixed(2);
              j += 1;
              ans.push({
                        oid : results[i].oid,
                        rid : results[i].rid,
                        uid : results[i].uid,
                        status : results[i].status,
                        address : results[i].address,
                        paymentMethod : results[i].paymentMethod,
                        rname : results[i].rname
              });
              ans[j].orderDetail = {1: {
                                        dishName: results[i].name, 
                                        volume: results[i].volume, 
                                        quantity: results[i].quantity, 
                                        price: results[i].price,
                                        did : results[i].did
                                      }};
              ans[j].total = results[i].quantity * parseFloat(results[i].price);
              i += 1;
            }
          }
          res.render("pending-orders", {results : ans, restaurant: restaurant, title: "All orders"});
        }
      });
    }
  });

app.post("/accept-order", (req, res)=>{
  con.query("UPDATE orders SET status='preparing' WHERE oid=?", [req.body.oid], (err, results) => {
    if (err) { 
      console.log(err);
      res.send('not done');
    }
    else{
      res.send('done');
    }
  });
});

app.post("/order-picked", (req, res)=>{
	con.query("UPDATE orders SET status='Out For Delivery' WHERE oid=?", [req.body.oid], (err, results) => {
		if (err) { 
      console.log(err);
			res.send('not done');
		}
		else{
			res.send('done');
		}
	});
});

app.post("/cancel-order", (req, res)=>{
  let status = 'cancelled by ' + req.session.usertype;
	con.query("UPDATE orders SET status=? WHERE oid=?", [status, req.body.oid], (err, results) => {
		if (err) { 
      console.log(err);
			res.send('not done');
		}
		else{
			res.send('done');
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
  sql = "SELECT MAX(did) as did FROM dish;";
  con.query(sql, (err, results) => {
    if (err) {
      console.log("MYSQL ERROR IN /add/dish", err);
      res.send("not-inserted in dish table");
    }
    else {
      var did = results[0].did + 1;
      var dish = data.dish.toLowerCase();
      var quantity = data.quantity.toLowerCase();
      var price = data.price;
      let sql = "INSERT INTO dish VALUES(?, ?, ?, ?, ?, 0)"
      let query = con.query(sql,[did, data.rid, dish, quantity, price],(err,results,fields)=>{
        if(err){
          console.log("MYSQL ERROR", err);
          res.send('not-inserted in dish table');
        }
        else{
          res.send('done');
        }
      });
    }
  });
});

app.post('/remove/dish',(req,res) => {
	let dish_data = req.body.obj;
	let sql = "DELETE FROM cart WHERE did = ?;";
	con.query(sql, [dish_data.did, dish_data.did], (err,results) => {
		if(err){
			console.log("MYSQL ERROR in /remove/dish");
      console.log(err);
			res.send('not-done in cart table');
		}
		else{
      sql = "UPDATE dish SET deleted = true WHERE did = ?;";
      con.query(sql, [dish_data.did, dish_data.did], (err,results) => {
        if(err){
          console.log("MYSQL ERROR in /remove/dish");
          console.log(err);
          res.send('not-done in dish table');
        }
        else {
          res.send('done');
        }
      });
		}
	});
});

app.post('/update/dish',(req,res)=>{
	let dish_data = req.body.obj;
  let did = dish_data.did;
  let price = dish_data.price;
  let volume = dish_data.volume;

	res.set('Access-Control-Allow-Origin','*');
  let sql = 'UPDATE dish SET dish.price = ?, dish.volume = ? WHERE did = ?;';
	let query = con.query(sql, [price, volume, did],(err, results, fields) => {
		if(err){
			console.log("MYSQL ERROR",err);
			res.send('not-updated in dishes table');
			//throw err;
		}
		else{
			res.send('done');
		}
	})
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
  let id;
  let sql;
  let str;
  if (req.session.usertype == 'restaurant') {
    sql = `UPDATE restaurant SET email=?, password=?, phone=? WHERE rid=?;`;
    id = req.session.rid;
    str = "/restaurant-homepage";
  }
  else {
    sql = 'UPDATE user SET email=?, password=?, phone=? WHERE uid=?;';
    id = req.session.uid;
    str = "/homepage"
  }

	con.query(sql, [email, pass, phone, id], (err, results)=>{
		if(err){
			console.log('Error while updating');
      console.log(err);
			req.session.updateFailed = 1;
			res.redirect(str);
		}
		else{
			req.session.updateFailed = 0;
      req.session.phone = phone;
      req.session.email = email;
      req.session.password = pass;
			res.redirect(str);
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
	var sql="SELECT * FROM dish WHERE rid in (SELECT rid FROM restaurant WHERE rname = ?) AND deleted != true;";
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

app.route('/orders')
	.get((req, res, next) => {
    if(req.session.usertype=='restaurant') {
      res.redirect("/restaurant-homepage");
    }

    if(!req.session.email) {
      req.session.redirectTo = '/orders';
      res.redirect('/user-signin');
    }
    else {
      next();
    }
  }, function(req, res, next) {
      var email = req.session.email;
      var user={userDetail: req.session.userDetail, signed_in: true, search: false};      
      var uid = req.session.uid;
      var ans="";
      let sql = `SELECT * FROM (SELECT o.*, r.rname FROM orders o LEFT JOIN restaurant r
                  ON o.rid = r.rid where o.uid = ?) as tbl LEFT JOIN oitems on
                  tbl.oid = oitems.oid LEFT JOIN dish on oitems.did = dish.did ORDER BY tbl.oid DESC;`;
      con.query(sql, [uid], (err, results) => {
        if (err) {
          console.log("SQL error in /orders");
          console.log(err);
          res.redirect("/homepage");
        }
        else if(results.length==0) {
          console.log('no previous orders')
          res.render('no-orders', {user: user})
        }
        else {
          var i = 0;
          var j = 0;
          ans = []
          ans.push({
                    oid : results[i].oid,
                    rid : results[i].rid,
                    uid : results[i].uid,
                    status : results[i].status,
                    address : results[i].address,
                    paymentMethod : results[i].paymentMethod,
                    rname : results[i].rname
          });
          ans[j].orderDetail = {1: {
                                    dishName: results[i].name, 
                                    volume: results[i].volume, 
                                    quantity: results[i].quantity, 
                                    price: results[i].price,
                                    did : results[i].did
                                  }};
          ans[j].total = results[i].quantity * parseFloat(results[i].price);
          i += 1;
          while(i < results.length) {
            if (results[i].oid == ans[j].oid) {
              ans[j].orderDetail[Object.keys(ans[j].orderDetail).length + 1] = {
                                            dishName: results[i].name, 
                                            quantity: results[i].quantity, 
                                            price: results[i].price, 
                                            volume: results[i].volume,
                                            did : results[i].did
                                          };
              ans[j].total += results[i].quantity * parseFloat(results[i].price);
              i += 1;
            }
            else {
              ans[j].total = ans[j].total.toFixed(2);
              j += 1;
              ans.push({
                        oid : results[i].oid,
                        rid : results[i].rid,
                        uid : results[i].uid,
                        status : results[i].status,
                        address : results[i].address,
                        paymentMethod : results[i].paymentMethod,
                        rname : results[i].rname
              });
              ans[j].orderDetail = {1: {
                                        dishName: results[i].name, 
                                        volume: results[i].volume, 
                                        quantity: results[i].quantity, 
                                        price: results[i].price,
                                        did : results[i].did
                                      }};
              ans[j].total = results[i].quantity * parseFloat(results[i].price);
              i += 1;
            }
          }
          res.render('prev-orders', {results: ans, user: user, cart_num: req.session.cart_num, updateFailed: 2});
          }
        }
      )
    }
	);

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
      var a = async function() {
        var uid = req.session.uid;
        var c = await function() {
          let sql = `SELECT * FROM restaurant r left join dish d 
                    on r.rid = d.rid LEFT JOIN cart c 
                    on c.rid = r.rid 
                    where d.did = c.did;`;          		
          con.query(sql, [uid], function(err, results, fields) {
            if(results.length==0){
              res.render('cart-is-empty', {user: user});
            }
            else {
              var cartTotal = 0;
              for(var i = 0; i < results.length; i++){
                cartTotal = cartTotal + parseFloat(results[i].price) * results[i].quantity;
              }
              req.session.cartTotal = cartTotal.toFixed(2);
              req.session.cartDetail = results;
              req.session.rid = results[0].rid;
              res.render('view_cart', {
                          user: user, 
                          cartDetail: results, 
                          cartTotal: cartTotal, 
                          mayOrder: req.session.mayOrder
                        }
              );
            }
          });
        }
        var b = await function() {
          let sql = `SELECT * FROM orders 
              WHERE uid = ? AND 
              status != 'delivered' AND status != 'cancelled by user' AND status != 'cancelled by restaurant';`;
          con.query(sql, [uid], (err, results) => {
            if(results.length >= 2) {
              req.session.mayOrder = false;
            }
            else {
              req.session.mayOrder = true;
            }
            c();
          });
        }
        await b();				
      }
      a();
    });

app.route("/cart-increment")
  .post((req, res) => {
    var did = req.body.id;
    var uid = req.session.uid;
    let sql = `UPDATE cart
              SET quantity = quantity + 1
              WHERE uid = ? AND did = ?;`;
    con.query(sql, [uid, did], (err, results) => {
      if (err) {
        console.log("SQL error in /cart-increment");
        console.log(err);
        res.send("error");
      }
      else {
            req.session.cart_num += 1;
            res.send("done");
      }
    });
  });

app.route("/cart-decrement")
  .post((req, res) => {
    var did = req.body.id;
    var uid = req.session.uid;
    let sql = `SELECT quantity FROM cart
              WHERE uid = ? AND did = ?;`;
    con.query(sql, [uid, did], (err, results) => {
      if (err) {
        console.log("SQL error in /cart-increment");
        console.log(err);
        res.send("error");
      }
      else if (results[0].quantity == 1) {
        sql = `DELETE FROM cart
              WHERE uid = ? AND did = ?;`;
        con.query(sql, [uid, did], (err, results) => {
          if (err) {
            console.log("SQL error in /cart-increment2");
            console.log(err);
            res.send("error");
          }
          else {
            req.session.cart_num -= 1;
            res.send("done");
          }
        });
      }
      else {
        sql = `UPDATE cart
              SET quantity = quantity - 1
              WHERE uid = ? AND did = ?;`;
        con.query(sql, [uid, did], (err, results) => {
          if (err) {
            console.log("SQL error in /cart-increment3");
            console.log(err);
            res.send("error");
          }
          else {
            req.session.cart_num -= 1;
            res.send("done");
          }
        });
      }
    });
  });

app.route("/cart-deletion")
  .post((req, res) => {
    var did = req.body.id;
    var uid = req.session.uid;
    let sql = `SELECT quantity FROM cart
              WHERE uid = ? AND did = ?;`;
    con.query(sql, [uid, did], (err, results) => {
      if (err) {
        console.log("SQL error in /cart-deletion");
        console.log(err);
        res.send("error");
      }
      else {
        sql = `DELETE FROM cart
              WHERE uid = ? AND did = ?;`;
        con.query(sql, [uid, did], (err, result) => {
          if (err) {
            console.log("SQL error in /cart-deletion2");
            console.log(err);
            res.send("error");
          }
          else {
            req.session.cart_num -= results[0].quantity;
            res.send("done");
          }
        });
      }
    });
  });

app.route("/checkout")
	.get((req, res, next)=>{
		if(!('cartTotal' in req.session) || !req.session.email) {
			req.session.redirectTo="/viewCart";
			res.redirect("/user-signin");
			res.end();
		}
		else{
			next();
		}
	}, (req, res) => {
		res.render("checkout", {cartTotal: req.session.cartTotal*1.12+30})
	});

  app.route("/placeorder")
	.get((req, res)=>{
		if(! req.session.email){
			res.redirect("/user-signin")
		}
		else{
			res.redirect("/viewCart")
		}
	})
	.post((req, res) => {
		var address = req.body.address.toLowerCase();
		var city = req.body.city.toLowerCase();
		var zip = req.body.zip;
    address = address + ", " + city + ", " + zip;
		var uid = req.session.uid;
    let cartDetail = req.session.cartDetail;
		var oid = 0;
		var d = async function(){
			var c = await function(){
				var sql = "INSERT INTO oitems(oid, did, quantity) values \n"
				for(var i = 0; i < req.session.cartDetail.length - 1; i++){
					sql = sql + "( " + oid + ", '" + cartDetail[i].did + "', " + cartDetail[i].quantity + "),";
				}
				var j = req.session.cartDetail.length-1;
				sql = sql + "( " + oid + ", '" + cartDetail[j].did + "', " + cartDetail[j].quantity + ");";
				con.query(sql, (err, results)=>{
					if (err) {
            console.log("SQL error in /placeorder 4");
            res.redirect("/checkout");
          }
					console.log('order placed successfully');
          req.session.cart_num = 0;
					res.render('thanksPage');
				})

			}
			var e = await function(){
				con.query("DELETE FROM cart WHERE uid = ?;", [uid], (err, results)=>{
					if (err) {
            console.log("SQL error in /placeorder 3");
            res.redirect("/checkout");
          }
					c();
				})
			}
			var b = await function(){
				var sql2 = "INSERT INTO orders VALUES(?, ?, ?, ?, ?, ?);";
				con.query(sql2, [oid, uid, req.session.rid, 'waiting for confirmation', address, "COD"], (err, results)=>{
					if (err) {
            console.log("SQL error in /placeorder 2");
            res.redirect("/checkout");
          }
					console.log('order place query 2 done');
					e();
				})
			}
			var a= await function(){
				var sql = "SELECT MAX(oid) as oid FROM orders;";
				con.query(sql, (err, results)=>{
					if (err) {
            console.log("SQL error in /placeorder 1");
            res.redirect("/checkout");
          }
					oid = parseInt(results[0].oid)+1;
					console.log('order place query1 done');
					b();
				});
			}
			await a();
		}
		d();
	});

app.route('/searchRestaurant')
	.get((req, res) => {
    if (req.session.usertype == 'restaurant') {
      res.redirect("/restaurant-homepage");
    }
    else {
      res.redirect("/homepage");
    }
	})
	.post((req, res) => {
    var user={userDetail: {}, signed_in: false, search: false};
    if(req.session.email){
      user.signed_in = true;
      user.userDetail = req.session.userDetail;
    }
    if(req.body.restaurantName == "") {
      res.redirect('/homepage');
    }
    else {
      let restaurantName = req.body.restaurantName;
      var sql = `SELECT * FROM restaurant WHERE rname RLIKE ?
                  OR rid IN (SELECT rid FROM dish WHERE name RLIKE ? AND deleted != true);`;
      var a = async function(){
        con.query(sql, [restaurantName, restaurantName], function(err, results, fields) {
          if (err) {
            console.log("SQL error in /searchRestaurant");
            console.log(err);
            res.redirect("/homepage");
          }
          else if (results.length == 0) {
            res.render("sorry-page", {user: user, 
                                      cart_num: req.session.cart_num,
                                      location : req.session.location,
                                      updateFailed: 2});
          }
          else {
            res.render("homepage", {
                                  user:user, 
                                  searchDetail:results, 
                                  location: req.session.location,
                                  cart_num: req.session.cart_num,
                                  updateFailed: 2
                                });
          }          
        });
      }
      a();
    }
  });

app.listen(8080, () => console.log(`App started on port 8080`)); 