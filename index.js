const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();

require("dotenv").config();

const port = process.env.PORT || 5000;

app.use(express.json());

const corsOptions = {
  origin: ["http://localhost:5173"],
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
const uri = `mongodb+srv://${process.env.Events_USERS}:${process.env.Events_PASS}@cluster0.udh1k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const db = client.db("luxEventa-DB");
    const allEvent = db.collection("allEvent");
    const allUsers = db.collection("allUsers");

    //when a user sign up and after sign up the user data will be stored in the database
    // POST /add-user with duplicate email check
    app.post("/add-user", async (req, res) => {
      const user = req.body;

      // Check if user already exists by email
      const existingUser = await allUsers.findOne({ email: user.email });

      if (existingUser) {
        return res
          .status(409)
          .send({ success: false, message: "User already registered" });
      }

      // If not exists, insert
      const result = await allUsers.insertOne(user);
      res.send({
        success: true,
        message: "User registered successfully",
        result,
      });
    });

    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = await allUsers.findOne({ email });

      if (!user) {
        return res
          .status(404)
          .send({ success: false, message: "User not found" });
      }

      res.send({
        success: true,
        user: {
          name: user.name,
          email: user.email,
          photo: user.url,
        },
      });
    });

    // // speciphic user data
    // Backend login route
    app.post("/login-user", async (req, res) => {
      const { email, password } = req.body;
      const user = await allUsers.findOne({ email });
      console.log(user);
      if (!user) {
        return res
          .status(404)
          .send({ success: false, message: "User not found" });
      }

      if (user.password !== password) {
        return res
          .status(401)
          .send({ success: false, message: "Incorrect password" });
      }
      res.send({
        success: true,
        message: "Login successful",
        user: {
          name: user.name,
          email: user.email,
          photo: user.url,
        },
      });
    });

    //when a user add event form submit the user event information stored in the luxEvent database.
    app.post("/add-event", async (req, res) => {
      const event = req.body;
      const result = await allEvent.insertOne(event);
      res.send(result);
    });

    //show
    app.get("/all-events", async (req, res) => {
      const result = await allEvent.find().toArray();
      res.send(result);
    });
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send(`LuxEventa Server is running on port ${port}`);
});
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
