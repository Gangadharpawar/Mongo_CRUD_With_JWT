const express = require("express");
const mongodb = require("mongodb");
const cors = require("cors");
const dotenv = require("dotenv");
const bcripjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
dotenv.config();

const httpError = require("./error");

const mongoClient = new mongodb.MongoClient(process.env.MONGO_CONNECTION);
var salt = bcripjs.genSaltSync(10);
const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const generateAccessToken = (user) => {
  return jwt.sign(user, process.env.JWT_SECRET_TOKEN, {
    expiresIn: "1h",
  });
};

const generateRefreshToken = (user) => {
  return jwt.sign(user, process.env.JWT_REFRESH_TOKEN, {
    expiresIn: "1h",
  });
};

app.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400);
    res.send("required data");
    return;
  }

  const hashedPassword = bcripjs.hashSync(password, salt);

  const user = {
    name: name,
    email: email,
    password: hashedPassword,
  };
  //mongo db insert
  const db = mongoClient.db("firstdb");
  const todoCollection = db.collection("users");
  todoCollection
    .insertOne(user)
    .then((data) => {
      console.log("inserted record", data.insertedId);

      //genereate jwt token
      const userDetailsFortoken = {
        userId: data.insertedId,
      };
      const accessToken = generateAccessToken(userDetailsFortoken);
      const refreshToken = generateRefreshToken(userDetailsFortoken);
      //return the jwt token
      const response = {
        status: "Success",
        userID: data.insertedId,
        accessToken: accessToken,
        refreshToken: refreshToken,
      };
      res.status(200);
      res.send(response);
    })
    .catch((e) => {
      console.log("error", e);
      res.status(500);
      res.send("Failed to create todo");
    });
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400);
    res.send("required data");
    return;
  }
  const db = mongoClient.db("firstdb");
  const todoCollection = db.collection("users");
  todoCollection
    .findOne({ email: email })
    .then((user) => {
      console.log("user", user);
      if (!user) {
        res.status(401);
        res.send("Invalid credentials");
        return;
      }
      //password verify
      const isPaswordMatch = bcripjs.compareSync(password, user.password);
      //jwt token

      if (isPaswordMatch) {
        const userDetailsFortoken = {
          userId: user._id,
        };
        const accessToken = generateAccessToken(userDetailsFortoken);
        const refreshToken = generateRefreshToken(userDetailsFortoken);
        const response = {
          status: "Success",
          accessToken: accessToken,
          refreshToken: refreshToken,
        };
        res.status(200);
        res.send(response);
      } else {
        res.status(401);
        res.send("Invalid credentials");
      }
    })
    .catch((e) => {
      console.log("failed to get data", e);
      res.status(500);
      res.send("something went wrong");
    });
});

app.post("/logout", (req, res) => {
  //Todo: logout user
  res.send("logout user");
});

app.post("/token", (req, res) => {
  const refreshToken = req.body.refreshToken;

  try {
    const decodedValue = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_TOKEN
    );
    console.log("decodedValue", decodedValue);
    const user = { userId: decodedValue.userId };
    const accessToken = generateAccessToken(user);
    res.status(200);
    res.send({
      accessToken: accessToken,
    });
  } catch (e) {
    console.log("error", e);
    res.status(403);
    res.send("Not Authorized");
  }
});

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401);
    res.send("Not Authenticated");
  }
  //verify
  const token = authHeader.split(" ")[1];
  try {
    const decodedValue = jwt.verify(token, process.env.JWT_SECRET_TOKEN);
    console.log("decodedvalue", decodedValue);
    next();
  } catch (e) {
    res.status(401);
    res.send("Not Authenticated");
  }
}

app.use(authMiddleware);

app.get("/todos/:todoID", (req, res) => {
  //verify token

  console.log("todopram", req.params);

  const db = mongoClient.db("firstdb");
  const todoCollection = db.collection("todos");

  todoCollection
    .findOne({ _id: new mongodb.ObjectId(req.params.todoID) })
    .then((data) => {
      console.log("data", data);
      res.send(data);
    })
    .catch((e) => {
      console.log("failed to get data", e);
    });
});

app.delete("/todos/:todoID", (req, res) => {
  console.log("todopram", req.params);

  const db = mongoClient.db("firstdb");
  const todoCollection = db.collection("todos");

  todoCollection
    .deleteOne({ _id: new mongodb.ObjectId(req.params.todoID) })
    .then((data) => {
      console.log("data", data);
      res.send(data);
    })
    .catch((e) => {
      console.log("failed to get data", e);
    });
});

app.get("/todos", (req, res) => {
  const db = mongoClient.db("firstdb");
  const todoCollection = db.collection("todos");
  todoCollection
    .find({})
    .toArray()
    .then((data) => {
      console.log("data", data);

      res.send(data);
    })
    .catch((e) => {
      console.log("failed to get data", e);
    });
});

app.post("/todos", (req, res) => {
  console.log("todobody", req.body);

  const db = mongoClient.db("firstdb");
  const todoCollection = db.collection("todos");
  todoCollection
    .insertOne({ description: req.body.description })
    .then((data) => {
      console.log("inserted record", data.insertedId);
      const response = {
        status: "Success",
        todoID: data.insertedId,
      };
      res.send(response);
    })
    .catch((e) => {
      console.log("error", e);
      res.send("Failed to create todo");
    });
});

app.patch("/todos/:todoID", (req, res) => {
  console.log("todopram", req.params);
  const todoID = req.params.todoID;
  const description = req.body.description;
  const db = mongoClient.db("firstdb");
  const todoCollection = db.collection("todos");

  todoCollection
    .updateOne(
      { _id: new mongodb.ObjectId(todoID) },
      { $set: { description: description } }
    )
    .then((data) => {
      console.log("data", data);
      res.send(data);
    })
    .catch((e) => {
      console.log("failed to get data", e);
      res.send("error in updating todo");
    });
});
const mongoPromise = mongoClient.connect();

mongoPromise
  .then(() => {
    const port = process.env.PORT || 3000;
    app.listen(port);
    console.log("Server started on port:", port);
  })
  .catch((e) => {
    console.log("mongo connection fail", e);
  });
