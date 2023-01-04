require('dotenv').config();

const express=require("express");
const app=express();
const bodyParser=require("body-parser");
const ejs=require("ejs");
const mongoose=require("mongoose");
const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const findOrCreate=require("mongoose-findorcreate");

var GoogleStrategy = require('passport-google-oauth20').Strategy;
// const encrypt=require("mongoose-encryption");
// var md5=require("md5");
// const bcrypt=require("bcrypt");
// const saltRounds=10;

mongoose.set('strictQuery',true);

app.use(session({
    secret:"Our little secret.",
    resave:false,
    saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());






mongoose.connect("mongodb://127.0.0.1/userDB");
app.use(bodyParser.urlencoded({extended:true}));
app.set("view engine","ejs");
app.use(express.static("public"));

const userSchema=new mongoose.Schema({
    email:String,
    password:String,
    googleId:String,
    secret:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
// userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:["password"]});
const User=mongoose.model("User",userSchema);
passport.use(User.createStrategy());
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
        
      return cb(err, user);
    });
  }
));

///////////////////////////////////Home///////////////////////////
app.get("/",function(req,res){
    res.render("home");
})
app.get("/auth/google",
    passport.authenticate('google', { scope: ["profile"] })
);
app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect Secrets.
    res.redirect('/secrets');
  });
//////////////////////////////////Login//////////////////////////

app.get("/login",function(req,res){
    res.render("login");
})

// app.post("/login",function(req,res){
//     User.findOne({email:req.body.username},function(err,foundOne){
//         if(foundOne){
//             bcrypt.compare(req.body.password,foundOne.password,function(err,result){ 
//                 if(result===true){
//             res.render("secrets");}
//             });}
//             });
        
//     });
app.post("/login",function(req,res){
    const user=new User({
        username:req.body.username,
        password:req.body.password
    });
    req.login(user,function(err){
        if(err){
            console.log(err);
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
               });
        }
    });
});
/////////////////////////////////////////////Logout//////////////////////////////////
app.get("/logout",function(req,res){
    req.logout(function(err){
        if(err){
            console.log(err);
        }
        else{
            res.redirect("/");
        }
    });
    
});
////////////////////////////////////////////Secretsss//////////////////////////////////
app.get("/secrets",function(req,res){
    User.find({secret:{$ne:null}},function(err,foundUsers){
        if(!err){
            if(foundUsers){
                res.render("secrets",{usersWithSecrets:foundUsers});
            }
        }
    });
});
app.get("/submit",function(req,res){
    if(req.isAuthenticated()){
        res.render("submit");
    }
    else{
        res.redirect("/login");
    }
})
app.post("/submit",function(req,res){
    const submittedSecret=req.body.secret;
    //passport already saves user data in req
    User.findById(req.user.id,function(err,foundUser){
        if(!err){
            if(foundUser){
                foundUser.secret=submittedSecret;
                foundUser.save(function(){
                    res.redirect("/secrets");
                });
            }
        }

    });
});

/////////////////////////////////Register///////////////////////////
app.get("/register",function(req,res){
   res.render("register");
    
})
// app.post("/register",function(req,res){
//    bcrypt.hash(req.body.password,saltRounds,function(err,hash){
//     const newUser= new User({
//         email:req.body.username,
//         password:hash
//     });
//     newUser.save(function(err){
//         if(err){
//             console.log(err);
//         }
//         else{
//             res.render("secrets");
//         }
//     });
//    });
app.post("/register",function(req,res){
User.register({username:req.body.username},req.body.password,function(err,user){
    if(err){
        console.log(err);
        res.redirect("/register");
    }
    else{
       passport.authenticate("local")(req,res,function(){
        res.redirect("/secrets");
       })
    }
})
})
    
// });










app.listen(3000,function(){
    console.log("Server has been started");
})
