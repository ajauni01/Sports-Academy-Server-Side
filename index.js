const express = require('express')
require('dotenv').config()
const cors = require('cors')
const app = express()
const { MongoClient, ServerApiVersion } = require('mongodb');

// PORT to listen to the response
const port = process.env.PORT || 5000;

// middleware
app.use(cors())
app.use(express.json())


// mongoDB full code
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.3vaow4q.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const registeredUsersCollection = client.db('powerPlaySports').collection('users');
    const classesCollection = client.db('powerPlaySports').collection('allClasses');
    const instructorCollection = client.db('powerPlaySports').collection('instructors');

    // new user registration related apis
    // store or insert user name and password in the database // save the user name, and email to the database ONLY when he doesn't already exist
    app.post('/users', async (req, res) => {
      console.log('registeredUsersCollection is getting hit')
      const user = req.body;
      const query = { email: user.email }
      // check whether the user already exists
      const existingUser = await registeredUsersCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }
      const result = await registeredUsersCollection.insertOne(user);
      res.send(result);
    })

    // popular class related apis
    app.get('/popularClasses', async (req, res) => {
      const query = {}
      // sort classes based on the number of students
      const options = {
        sort: { students: -1 }
      }
      const cursor = classesCollection.find(query, options)
      const result = await cursor.toArray()
      res.send(result)
    })

    // popular instructor related apis
    app.get('/instructors', async (req, res) => {
      const query = {}
      // sort instructors based on the number of students
      const options = {
        sort: { students: -1 }
      }
      const cursor = instructorCollection.find(query, options)
      const result = await cursor.toArray()
      res.send(result)
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
// mongoDB full code ends



// default route
app.get('/', (req, res) => {
  res.send('powerPlay server is running')
})

// listen the server's response
app.listen(port, () => {
  console.log(`The powerPlay server is running on PORT: ${port}`)
})