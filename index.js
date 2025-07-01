const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const moment = require("moment");
const app = express();

require("dotenv").config();

const port = process.env.PORT || 5000;

app.use(express.json());

const corsOptions = {
  origin: ["https://luxeventa.netlify.app"],
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
      if (!event?.organizerEmail) {
        return res.status(400).send({ error: "Organizer email is required." });
      }
      if (!event?.attendeeCount) {
        event.attendeeCount = 0;
      }
      try {
        const result = await allEvent.insertOne(event);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error adding event:", error);
        res.status(500).send({ error: "Failed to add event." });
      }
    });

    //show
    app.get("/all-events", async (req, res) => {
      const result = await allEvent.find().toArray();
      res.send(result);
    });

    // update count when click to the join button the count will be incremeant
    app.patch("/update-count/:id", async (req, res) => {
      const id = req.params.id;
      const { email } = req.body;
      // console.log(id, email);

      if (!email) {
        return res.status(400).send({ error: "Email is required" });
      }

      try {
        const event = await allEvent.findOne({ _id: new ObjectId(id) });
        if (!event) {
          return res.status(404).send({ error: "Event not found" });
        }

        if (event.participants && event.participants.includes(email)) {
          return res.status(400).send({ error: "User already joined" });
        }

        const result = await allEvent.updateOne(
          { _id: new ObjectId(id) },
          {
            $inc: { count: 1 },
            $push: { participants: email },
          }
        );

        if (result.modifiedCount === 1) {
          res.send({ message: "Join successful" });
        } else {
          res.status(500).send({ error: "Failed to update event" });
        }
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Internal server error" });
      }
    });

    // searching the title
    app.get("/events", async (req, res) => {
      try {
        const { title, filter, startDate, endDate } = req.query;
        const query = {};

        // Search by title (case-insensitive, supports partial matches)
        if (title && title.trim()) {
          query.title = { $regex: title.trim(), $options: "i" };
        }

        // Predefined date filters
        const filters = {
          today: [moment().startOf("day"), moment().endOf("day")],
          currentWeek: [moment().startOf("week"), moment().endOf("week")],
          lastWeek: [
            moment().subtract(1, "week").startOf("week"),
            moment().subtract(1, "week").endOf("week"),
          ],
          currentMonth: [moment().startOf("month"), moment().endOf("month")],
          lastMonth: [
            moment().subtract(1, "month").startOf("month"),
            moment().subtract(1, "month").endOf("month"),
          ],
        };

        // Apply predefined date filter
        if (filter && filters[filter]) {
          const [start, end] = filters[filter];
          query.datetime = {
            $gte: start.toDate(),
            $lte: end.toDate(),
          };
        }
        // Apply custom date range filter (takes precedence over predefined filters)
        else if (startDate && endDate) {
          const start = moment(startDate).startOf("day");
          const end = moment(endDate).endOf("day");

          // Validate dates
          if (!start.isValid() || !end.isValid()) {
            return res.status(400).send({
              error: "Invalid date format. Please use ISO date format.",
            });
          }

          if (start.isAfter(end)) {
            return res.status(400).send({
              error: "Start date cannot be after end date.",
            });
          }

          query.datetime = {
            $gte: start.toDate(),
            $lte: end.toDate(),
          };
        }

        // Execute query with sorting (newest events first)
        const events = await allEvent
          .find(query)
          .sort({ datetime: 1 }) // Sort by datetime ascending (earliest first)
          .toArray();

        // Add some metadata to the response
        const response = {
          events: events,
          total: events.length,
          filters: {
            title: title || null,
            dateFilter: filter || null,
            customRange: startDate && endDate ? { startDate, endDate } : null,
          },
        };

        res.status(200).json(response);
      } catch (err) {
        console.error("Error fetching events:", err);
        res.status(500).send({
          error: "Failed to fetch events",
          message: err.message,
        });
      }
    });

    // who is posting the Event on their event page
    app.get("/user-events", async (req, res) => {
      const { email } = req.query;
      if (!email) {
        return res.status(400).send({ error: "User email is required" });
      }
      try {
        const userEvents = await allEvent
          .find({ organizerEmail: email })
          .toArray();
        res.send(userEvents);
      } catch (err) {
        res.status(500).send({ error: "Failed to fetch user-specific events" });
      }
    });

    // user can update the event when he want.
    app.put("/update-event/:id", async (req, res) => {
      const { id } = req.params;
      const updatedData = req.body;

      try {
        const result = await allEvent.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData }
        );

        if (result.modifiedCount > 0) {
          res.send({ message: "Event updated successfully" });
        } else {
          res.status(404).send({ error: "No event found to update" });
        }
      } catch (error) {
        console.error("Update error:", error);
        res.status(500).send({ error: "Failed to update event" });
      }
    });

    app.delete("/delete-event/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const result = await allEvent.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount > 0) {
          res.send({ message: "Event deleted successfully" });
        } else {
          res.status(404).send({ error: "Event not found" });
        }
      } catch (error) {
        console.error("Delete error:", error);
        res.status(500).send({ error: "Failed to delete event" });
      }
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
