require("dotenv").config();
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000 ;

app.use(express.json());
app.use(cors());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nor5r.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    const userCollection = client.db('TaskManagerDB').collection('users');
    const taskCollection = client.db('TaskManagerDB').collection('tasks')


    app.post('/users', async(req, res) => {
        const user = req.body;
        const result = await userCollection.insertOne(user);
        res.send(result);
    })

    app.get('/tasks', async(req, res) => {
        const {email} = req.query;
        const result =await taskCollection.find({userEmail: email}).toArray();
        res.json(result);
    })

    app.post('/tasks', async(req, res) => {
        const {title, description, category, userEmail} = req.body;
        const newTask = {
            title, description, category, userEmail, timeStamp: new Date()
        };

        const result = await taskCollection.insertOne(newTask);
        res.json({ success: true, task: { ...newTask, _id: result.insertedId } });
    })

    app.put('/tasks/:id', async(req, res) => {
        const {id} = req.params;
        const {title, description,category} = req.body;
        const result = await taskCollection.updateOne({_id: new ObjectId(id)}, {
            $set: {title, description,category}
        });
        res.json({success: true})
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


app.listen(port, () => {
    console.log(`server is running on port: ${port}`);
})