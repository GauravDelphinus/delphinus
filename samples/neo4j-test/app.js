/**
 * Created by gaurav on 17/1/17.
 */

var express = require("express");

var app = express();

var request = require("request");
var neo4j = require("node-neo4j");

var dbhost = "localhost";
var dbport = 7474;
//var dbURL = "http://" + dbhost + ":" + dbport + "/db/data/transaction/commit"; //as per Neo4j docs


var port = process.env.PORT || 3000;

var router = express.Router();

router.route("/challenges")
    .get(function(req, res) {
        var responseJson = {hello: "This is my API"};

        res.json(responseJson);
    });
app.use("/api", router);

app.get("/", function(req, res) {
    res.send("Welcome to Gaurav's API");
});

app.listen(port, function() {
    console.log("Running on PORT: " + port);
});

//Neo4j testing code

var db = new neo4j("http://neo4j:Puzz1e$$@localhost:7474");

db.cypherQuery("MATCH (n:Movie) RETURN n LIMIT 25", function(err, result){
    if(err) throw err;

    console.log(result.data); // delivers an array of query results
    console.log(result.columns); // delivers an array of names of objects getting returned
});


db.readNode(95, function(err, node){
    if(err) throw err;

    // Output node properties.
    console.log(node.data);

    // Output node id.
    console.log(node._id);
});

db.insertNode({
    title: "Gaurav's own Movie",
    released: 2016
}, 'Movie',
function(err, node){
    if(err) throw err;

    // Output node properties.
    console.log(node.data);

    // Output node id.
    console.log(node._id);
});