const express = require("express");
const cors = require("cors");
const app = express();

const { MongoClient, ServerApiVersion } = require("mongodb");

require("dotenv").config();

const port = process.env.PORT || 5000;

app.use(express.json());

const uri = `mongodb+srv://${process.env.USERNAME}:${process.env.PASSWORD}@cluster0.udh1k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    console.log(
      `Event Management LuxEventa server running on this PORT ${port}`
    );
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
