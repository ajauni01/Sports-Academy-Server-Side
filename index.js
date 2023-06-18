const express = require('express')
require('dotenv').config()
const cors = require('cors')
const app = express()
// create an instance of 'jsonwebtoken'
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

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
    client.connect();

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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

const usersCollection = client.db('powerPlaySports').collection('users');
const classesCollection = client.db('powerPlaySports').collection('allClasses');
const instructorCollection = client.db('powerPlaySports').collection('instructors');
const reviewsCollection = client.db('powerPlaySports').collection('reviews');
const addClassCollection = client.db('powerPlaySports').collection('addClass');

// new user registration related apis
// store or insert user name and password in the database // save the user name, and email to the database ONLY when he doesn't already exist

app.post('/users', async (req, res) => {
  const user = req.body;

  // Check whether the user already exists
  const query = { email: user.email };
  const existingUser = await usersCollection.findOne(query);
  if (existingUser) {
    return res.send({ message: 'User already exists' });
  }

  // Update the user object with the 'role' and 'userID' fields
  const newUser = {
    ...user,
    role: 'student' // Set the role to 'student' by default
  }

  const result = await usersCollection.insertOne(newUser);
  res.send(result);
});




// user authorization related apis
app.get('/userAuthorization', async (req, res) => {
  let query = {};
  if (req.query?.email) {
    query = { email: req.query.email };
  }
  // find the user based on the email
  const user = await usersCollection.findOne(query);
  // set condition to verify whether the user is an admin, student, or instructor
  if (user?.role === 'admin') {
    res.send({ role: 'admin' });
  } else if (user?.role === 'instructor') {
    res.send({ role: 'instructor' });
  } else {
    res.send({ role: 'student' });
  }
});

// find all the registered users
app.get('/allUsers', async (req, res) => {
  const cursor = usersCollection.find()
  const result = await cursor.toArray()
  res.send(result)
})

// update the user's role to an 'admin'
app.patch('/allUsers/admin/:id', async (req, res) => {
  const id = req.params.id;
  console.log('admin api is getting hit', id)
  const filter = { _id: new ObjectId(id) }
  const updateDoc = {
    $set: {
      role: 'admin'
    },
  }
  const result = await usersCollection.updateOne(filter, updateDoc)
  res.send(result)
})

// update the user's role to an 'instructor'
app.patch('/allUsers/instructor/:id', async (req, res) => {
  const id = req.params.id;
  console.log('instructor api is getting hit', id)
  const filter = { _id: new ObjectId(id) }
  const updateDoc = {
    $set: {
      role: 'instructor'
    },
  }
  const result = await usersCollection.updateOne(filter, updateDoc)
  res.send(result)
})


// jwt related apis
// jwt
app.post('/jwt', (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '5000h' })
  res.send({ token })
})

// verifyJWT
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  // revoke the user access if the user is not found
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' })
  }
  // find the token using the 'split' operation to exclude it from the bearer
  const token = authorization.split(' ')[1]
  // verify the token
  jwt.verify(token, process.env.ACCESS_TOKEN, (error, decoded) => {
    if (error) {
      res.status(403).send({ error: true, message: 'access revoked / unauthorized access' })
    }
    req.decoded = decoded;
    next()
  })
}

// verify admin
const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.email;
  //  set the query to find relevant user based on the decoded email
  const query = { email: email };
  // find the user based on the email
  const user = await usersCollection.findOne(query)
  // set condition to verify whether the user is an admin
  if (user?.role !== 'admin') {
    return res.status(403).send({ error: true, message: 'forbidden access' })
  }
  next()
}

//  final admin verification
app.get('/users/admin/:email', verifyJWT, async (req, res) => {
  const email = req.params.email;
  //  console.log('users/admin/:email is getting hit')
  // revoke the user access if the email does not match
  if (req.decoded.email !== email) {
    res.send({ admin: false })
  }
  const query = { email: email }
  // find the relevant user based on the given email
  const user = await usersCollection.findOne(query);
  const result = { admin: user?.role === 'admin' }
  res.send(result)
})

// add class api
app.post('/addClass', async (req, res) => {
  const newClass = req.body;
  newClass.status = 'pending';
  try {
    const result = await addClassCollection.insertOne(newClass);
    res.send(result);
  } catch (error) {
    console.error('Error inserting newClass into the database:', error);
    res.status(500).send('An error occurred while inserting newClass into the database');
  }
});

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

// reviews related apis
app.get('/reviews', async (req, res) => {
  const cursor = reviewsCollection.find()
  const result = await cursor.toArray()
  res.send(result)
})

// listen the server's response
app.listen(port, () => {
  console.log(`The powerPlay server is running on PORT: ${port}`)
})