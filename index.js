const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

const uri =
	'mongodb+srv://habitTrackerUser:2q0amos7neAKAVKe@cluster0.fielwth.mongodb.net/?appName=Cluster0';

const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

app.get('/', (req, res) => {
	res.send('Hello from habit tracker server!');
});

async function run() {
	try {
		await client.connect();

		const db = client.db('habit_tracker_db');
		const habitCollection = db.collection('habits');

		app.get('/habits', async (req, res) => {
			const cursor = habitCollection.find();
			const result = await cursor.toArray();
			res.send(result);
		});
		app.get('/habits/:id', async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await habitCollection.findOne(query);
			res.send(result);
		});

		app.post('/habits', async (req, res) => {
			const newHabit = req.body;
			const result = await habitCollection.insertOne(newHabit);
			res.send(result);
		});

		app.patch('/habits/:id', async (req, res) => {
			const id = req.params.id;
			const updatedHabits = req.body;
			const query = { _id: new ObjectId(id) };
			const update = {
				$set: {
					title: updatedHabits.title,
					'user.name': updatedHabits.user?.name,
				},
			};

			const result = await habitCollection.updateOne(query, update);
			res.send(result);
		});

		app.delete('/habits/:id', async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await habitCollection.deleteOne(query);
			res.send(result);
		});

		await client.db('admin').command({ ping: 1 });
		console.log(
			'Pinged your deployment. You successfully connected to MongoDB!'
		);
	} finally {
		// await client.close();
	}
}
run().catch(console.dir);

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});
