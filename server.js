var http = require('http');
var url = require('url');
var fs = require('fs');
var express = require('express');
var body_parser = require('body-parser');
var session = require('client-sessions');
var mongoose = require('mongoose');
var colors = require('./colors');
var mongoose_codes = require('./mongoose_codes');
var server;

COLOR = colors.SCHEME1;

var app = express();

app.use(session({
    cookieName: 'session',
    secret: 'gPYeO1LwyEBj5FpS4LSH',
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000,
    httpOnly: true,
    ephemeral: true
}));

function prep_css(base, file)
{
    src = __dirname+"/"+base+"/"+file;
    dst = __dirname+"/"+base+"/"+"pp_"+file;
    fs.readFile(src, 'utf8', function (err,data) 
    {
        if (err) 
        {
            return console.log(err);
        }

        for (var color in COLOR) 
        {
            if (COLOR.hasOwnProperty(color)) 
            {
                var regex = new RegExp(color, 'g');
                data = data.replace(regex, COLOR[color]);
            }
        }

        fs.writeFile(dst, data, 'utf8', function (err) 
        {
            if (err) return console.log(err);
        });
    });
}


/* Start connection to mongodb */
mongoose.connect('mongodb://localhost/lucx_info');

/* Define schemas */
var UserSchema = mongoose.Schema(
{
    firstname: String,
    lastname: String,
    email: String,
    username: {type: String, required: true, unique: true},
    password: {type: String, required: true}
});

UserSchema.methods.login = function(req, res)
{
    User.findOne({username: this.username, password: this.password}, function(err, user) 
    {
        if (!user) 
        {
            console.log("Invalid username password combination.");
            res.send("1"); 
        } 
        else 
        {
            console.log("User authenticated!");
            req.session.user = user;
            /* Return user to homepage */
            res.send("0");
        }
    });  
};

UserSchema.methods.register = function(req, res)
{
    this.save(function(err)
    {
        if (err) 
        {
            if (err.code == mongoose_codes.USER.REGISTER.ERROR.DUP_KEY)
            {
                console.log("User.save(): DUPLICATE KEY ERROR\n");
                res.send("This username has already been taken!"); 
            }
            else if (err.name == mongoose_codes.USER.REGISTER.ERROR.VALIDATION)
            {
                console.log("User.register(): VALIDATION ERROR\n");
                res.send("Username and password fields must not be empty!"); 
            }
            else
            {
                console.log("User.register(): UNKNOWN ERROR: "+err+"\n");
                res.send("Registration failure."); 
            }
        }
        else
        {
            console.log("User saved successfully!\n");
            res.send("Successful registration!"); 
        }
    });
};

var User = mongoose.model('User', UserSchema);

/* Process style sheets */
prep_css("home", "home.css");
prep_css("catan", "lobby.css");

/* Middleware */
app.use(function(req, res, next) 
{
    if (req.session && req.session.user) 
    {
        User.findOne({ username: req.session.user.username }, function(err, user) 
        {
            if (user) 
            {
                req.user = user;
                delete req.user.password; // delete the password from the session
                req.session.user = user;  //refresh the session value
                res.locals.user = user;
            }
            // finishing processing the middleware and run the route
            next();
        });
    } 
    else 
    {
        next();
    }
});

/*****************************
** Process all home requests **
*****************************/

/* GET requests */
app.get('/utils/jquery-1.11.3.min.js', function (req, res) 
{
    res.sendFile( __dirname + "/utils/" + "jquery-1.11.3.min.js" );
});

app.get('/home/pp_home.css', function (req, res) 
{
    res.sendFile( __dirname + "/home/" + "pp_home.css" );
});

app.get('/', function (req, res) 
{
    res.sendFile( __dirname + "/home/" + "index.html" );
});

app.get('/index.html', function (req, res) 
{
    res.sendFile( __dirname + "/home/" + "index.html" );
});

app.get('/home/index.html', function (req, res) 
{
    res.sendFile( __dirname + "/home/" + "index.html" );
});

app.get('/home/games.html', function (req, res) 
{
    res.sendFile( __dirname + "/home/" + "games.html" );
});

app.get('/home/register.html', function (req, res) 
{
    res.sendFile( __dirname + "/home/" + "register.html" );
});

app.get('/home/login.html', function (req, res) 
{
    res.sendFile( __dirname + "/home/" + "login.html" );
});

app.get('/home/facebook.html', function (req, res) 
{
    res.sendFile( __dirname + "/home/" + "facebook.html" );
});


app.get('/logout', function (req, res) 
{
    console.log("Logging out...");
    /* Logout of session */
    req.session.reset(); 
    /* Return user to homepage */
    res.redirect("/");
});

/* POST requests */
var urlencoded_parser = body_parser.urlencoded({ extended: false })

app.post('/login', urlencoded_parser, function (req, res) 
{
    var user = new User(
    {
        username: req.body.username,
        password: req.body.password
    });
    user.login(req, res);
});

app.post('/register', urlencoded_parser, function (req, res) 
{
    var user = new User(
    {
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        email: req.body.email,
        username: req.body.username,
        password: req.body.password
    });
    user.register(req, res);
});

app.post('/session', urlencoded_parser, function (req, res) 
{
    if (req.session && req.session.user) 
    {   // Check if session exists
        // lookup the user in the DB by pulling their email from the session
        User.findOne({ username: req.session.user.username }, function (err, user) 
        {
            if (!user) 
            {
                // if the user isn't found in the DB, reset the session info and
                // redirect the user to the login page
                req.session.reset();
                res.send('GUEST'.toJSON());
            } 
            else 
            {
                // expose the user to the template
                ///res.locals.user = user;
                // render the dashboard page
                res.send(user.username);
            }
        });
    } 
    else 
    {
        //res.redirect('/login');
    }
});


/******************************
** Process all snake requests **
******************************/

/* Snake schema */
var SnakeSchema = mongoose.Schema(
{
    username: String,
    score: Number
});

var Snake = mongoose.model('Snake', SnakeSchema);

/* GET requests */
app.get('/snake/snake.html', function (req, res) 
{
    res.sendFile( __dirname + "/snake/" + "snake.html" );
});

/* POST requests */
app.post('/snake', urlencoded_parser, function (req, res) 
{
    action = req.body.action;
    if (action == "WRITE")
    {
        var username;
        if (req.session && req.session.user) 
            username = req.session.user.username;
        else 
            username = "guest";

        var snake = new Snake(
        {
            username: username,
            score: req.body.score
        });
        
        snake.save(function(err)
        {
            if (err)
                console.log(err);
        });
    }
    else if (action == "READ")
    {
        Snake.find({}, function(err, snakes)
        {
            if (!err)
                res.send(snakes);
            else
                console.log(err);
        });
    }
    else
    {
        console.log("Impossible snake action.");
    }
});


/******************************
** Process all snake requests **
******************************/

/* GET requests */
app.get('/catan/index.html', function (req, res) 
{
    res.sendFile( __dirname + "/catan/" + "index.html" );
});

app.get('/catan/setup.html', function (req, res) 
{
    res.sendFile( __dirname + "/catan/" + "setup.html" );
});

app.get('/catan/game.html', function (req, res) 
{
    res.sendFile( __dirname + "/catan/" + "game.html" );
});

app.get('/catan/pp_lobby.css', function (req, res) 
{
    res.sendFile( __dirname + "/catan/" + "pp_lobby.css" );
});


/******************************
** Process Goldberg requests **
******************************/

/* GET requests */
app.get('/goldberg/index.html', function (req, res) 
{
    res.sendFile( __dirname + "/goldberg/" + "index.html" );
});

app.get('/goldberg/oindex.html', function (req, res) 
{
    res.sendFile( __dirname + "/goldberg/" + "oindex.html" );
});

app.get('/goldberg/verts.js', function (req, res) 
{
    res.sendFile( __dirname + "/goldberg/" + "verts.js" );
});

app.get('/goldberg/shader.js', function (req, res) 
{
    res.sendFile( __dirname + "/goldberg/" + "shader.js" );
});

app.get('/goldberg/cursor.js', function (req, res) 
{
    res.sendFile( __dirname + "/goldberg/" + "cursor.js" );
});

app.get('/goldberg/webgl-utils.js', function (req, res) 
{
    res.sendFile( __dirname + "/goldberg/" + "webgl-utils.js" );
});

app.get('/goldberg/gl-matrix.js', function (req, res) 
{
    res.sendFile( __dirname + "/goldberg/" + "gl-matrix.js" );
});

/***************************
** Process Chess requests **
***************************/

/* GET requests */
app.get('/chess/index.html', function (req, res) 
{
    res.sendFile( __dirname + "/chess/" + "index.html" );
});

app.get('/chess/verts.js', function (req, res) 
{
    res.sendFile( __dirname + "/chess/" + "verts.js" );
});

app.get('/chess/utils.js', function (req, res) 
{
    res.sendFile( __dirname + "/chess/" + "utils.js" );
});

app.get('/chess/game.js', function (req, res) 
{
    res.sendFile( __dirname + "/chess/" + "game.js" );
});

app.get('/chess/view.js', function (req, res) 
{
    res.sendFile( __dirname + "/chess/" + "view.js" );
});

app.get('/chess/config.js', function (req, res) 
{
    res.sendFile( __dirname + "/chess/" + "config.js" );
});

app.get('/chess/world.js', function (req, res) 
{
    res.sendFile( __dirname + "/chess/" + "world.js" );
});

app.get('/chess/camera.js', function (req, res) 
{
    res.sendFile( __dirname + "/chess/" + "camera.js" );
});

app.get('/chess/board.js', function (req, res) 
{
    res.sendFile( __dirname + "/chess/" + "board.js" );
});

app.get('/chess/piece.js', function (req, res) 
{
    res.sendFile( __dirname + "/chess/" + "piece.js" );
});

app.get('/chess/shader.js', function (req, res) 
{
    res.sendFile( __dirname + "/chess/" + "shader.js" );
});

app.get('/chess/cursor.js', function (req, res) 
{
    res.sendFile( __dirname + "/chess/" + "cursor.js" );
});

app.get('/chess/webgl-utils.js', function (req, res) 
{
    res.sendFile( __dirname + "/chess/" + "webgl-utils.js" );
});

app.get('/chess/gl-matrix.js', function (req, res) 
{
    res.sendFile( __dirname + "/chess/" + "gl-matrix.js" );
});


/**************
 * Lighting Demo
 * *************/

/* GET requests */
app.get('/lighting/index.html', function (req, res) 
{
    res.sendFile( __dirname + "/lighting/" + "index.html" );
});

app.get('/lighting/webgl-utils.js', function (req, res) 
{
    res.sendFile( __dirname + "/lighting/" + "webgl-utils.js" );
});

app.get('/lighting/glMatrix-0.9.5.min.js', function (req, res) 
{
    res.sendFile( __dirname + "/lighting/" + "glMatrix-0.9.5.min.js" );
});

app.get('/lighting/crate.gif', function (req, res) 
{
    res.sendFile( __dirname + "/lighting/" + "crate.gif" );
});


/******************
** Set up server **
******************/
var server = app.listen(80, function () {

  var host = server.address().address
  var port = server.address().port

  console.log("Example app listening at http://%s:%s", host, port)

})

/* Catan player schema */
var CatanPlayerSchema = mongoose.Schema(
{
    username: {type: String, required: true, unique: true},
    color: String
});

var CatanPlayer = mongoose.model('CatanPlayer', CatanPlayerSchema);

/* Catan game schema */
var CatanGameSchema = mongoose.Schema(
{
    host: {type: String, required: true, unique: true},
    num_players: {type: Number, required: true},
    max_players: {type: Number, required: true},
    started: {type: Boolean, required: true},
    players: [CatanPlayerSchema],
    id: Number
});

CatanGameSchema.methods.create = function(socket)
{
    game = this;

    CatanGame.find().distinct('id', function(err, ids) 
    {
        ids = ids.sort(function (a, b) 
        { 
            return a - b;
        });
        console.log(ids);
        if (ids.length > 0)
        {
            max = Math.max.apply(null, ids);
            if (ids.length < max+1)
            {
                for (var i = 0; i < max; i++)
                {
                    if (ids.indexOf(i) == -1)
                    {
                        game.id = i;     
                        break;
                    }
                }
            }
            else
            {
                game.id = max+1;
            }
        }
        else
        {
            game.id = 0;
        }

        game.save( function(err)
        {
            if (err)
                if (err.code == 11000)
                    socket.emit('new_game_failure', {msg: "This host has already created a game."}); 
                else
                    console.log(err);
            else
            {
                console.log("Creating Game"+game.id);

                // Broadcast message to update
                io.sockets.emit('new_game_success');

                // Host automatically joins this game
                join_game(socket, game.id, game.host);
            }    
        });
    });  
};

var CatanGame = mongoose.model('CatanGame', CatanGameSchema);


function join_game(socket, id, username)
{
    var catan_player = new CatanPlayer(
    {
        username: username
    });

    // Make sure user has not joined any other games
    CatanGame.find({'players.username': username},
    function(err, games)
    {
        if (games.length < 1)
        {
            // Make sure user has not joined this game
            CatanGame.findOneAndUpdate(
            {id: id, 'players.username': {$ne: username}}, 
            {$push: {players: catan_player}, $inc: {num_players: 1}}, 
            function(err, game)
            {
                if (game !== null)
                {
                    socket.emit("join_game_success");
                }
                else
                    socket.emit("join_game_failure", {msg: "User has already joined this game."});
            });
        }
        if (games.length == 1)
        {
            if (games[0].id == id)
            {
                socket.emit("join_game_success");
            }   
            else
            {
                socket.emit("join_game_failure", {msg: "User has alread joined another game: Game "+games[0].id});
            }
        }
        else if (games.length > 1)
        {
            console.log("ERROR: user cannot join multiple games");
        }
    });
}

/* Set up socket.io */
var io = require('socket.io').listen(server);

/* define interactions with client */
io.sockets.on('connection', function(socket)
{
    // Catan lobby
    socket.on('new_game', function(data)
    {
        // Make sure the host has not joined any other games
        CatanGame.find({'players.username': data.host},
        function(err, games)
        {
            if (games.length == 0)
            {
                console.log("Starting new game...");

                var catan_game = new CatanGame(
                {
                    host: data.host,
                    num_players: 0,
                    max_players: data.max_players,
                    started: false
                });

                catan_game.create(socket);
            }
            else
            {
                socket.emit('new_game_failure', {msg: "This host has already created a different game: Game "+games[0].id}); 
            }
        });
    });

    socket.on('get_games', function(data)
    {
        CatanGame.find(null, null, {sort: {'id': -1}}, function(err, games)
        {
            socket.emit('game_data', {'games': games});
        });
    });

    socket.on('join_game', function(data)
    {
        join_game(socket, data.id, data.username);
    });

    socket.on('get_users', function(data)
    {
        console.log("Find game for user: "+data.username);
        CatanGame.findOne({'players.username': data.username}, function(err, game) 
        {
            if (game)
                socket.emit('user_data', {'users': game.players});
            else
                console.log("No matching game found for this user.");
        });
    });

    /*
    // Login message 
    socket.on('login_data', function(data)
    {
        var user = new User(
        {
            username: data.username,
            password: data.password
        });

        user.login(socket);
    });

    // Register message
    socket.on('register_data', function(data)
    {
        var user = new User(
        {
            firstname: data.firstname,
            lastname: data.lastname,
            email: data.email,
            username: data.username,
            password: data.password
        });

        user.register(socket);
    });
    */
});
