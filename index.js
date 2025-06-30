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
    app.post("/add-user", async (req, res) => {
      const user = req.body;
      const result = await allUsers.insertOne(user);
      res.send(result);
    });
    // app.get("/user", async (req,res)=>{
    //     const user = await
    // })

    //when a user add event form submit the user event information stored in the luxEvent database.
    app.post("/add-event", async (req, res) => {
      const event = req.body;
      const result = await allEvent.insertOne(event);
      res.send(result);
    });

    //show
    app.get("/all-event", async (req, res) => {
      const result = await allEvent.find().toArray();
      res.send(result);
    });
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("job-task is running");
});
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
