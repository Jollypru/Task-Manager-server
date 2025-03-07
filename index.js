require("dotenv").config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const WebSocket = require("ws");
const http = require('http');
const app = express();
const port = process.env.PORT || 5000 ;

app.use(express.json());
app.use(cors({
    origin: ['http://localhost:5175','https://task-manager-client-two.vercel.app', 'https://task-manager-client-ptdh5dkwz-jolly181s-projects.vercel.app']
}));

const server = http.createServer(app);

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
    // await client.connect();
    const userCollection = client.db('TaskManagerDB').collection('users');
    const taskCollection = client.db('TaskManagerDB').collection('tasks');

    const wss = new WebSocket.Server({server});
    wss.on("connection", (ws) => {
        // console.log('Client connected to websocket');
        ws.send(JSON.stringify({type: 'connection', message: 'connected'}))
    })

    const changeStream = taskCollection.watch();
    changeStream.on("change", (change) => {
        // console.log('db change detected', change);
        wss.clients.forEach(client => {
            if(client.readyState === WebSocket.OPEN){
                client.send(JSON.stringify({type: 'update', change}))
            }
        })
    })

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

    app.post('/tasks/reorder', async(req, res) => {
        const {tasks} = req.body;
        try{
            for (let task of tasks){
                await taskCollection.updateOne(
                    { _id: new ObjectId(task._id) },
                    {$set: {category: task.category}}
                )
            }
            res.json({success: true})
        }catch(error){
            console.log('Error reordering task', error);
            res.status(500).send('Internal Server Error');
        }
    })

    app.put('/tasks/:id', async(req, res) => {
        const {id} = req.params;
        const {title, description,category} = req.body;
        const result = await taskCollection.updateOne({_id: new ObjectId(id)}, {
            $set: {title, description,category}
        });
        res.json({success: true})
    })

    app.delete('/tasks/:id', async(req, res) => {
        const {id} = req.params;
        const result = await taskCollection.deleteOne({_id: new ObjectId(id)});
        res.json({ message: "Task deleted successfully" });
    })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    server.listen(port, () => {
        console.log(`server is running on port: ${port}`);
    })
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


