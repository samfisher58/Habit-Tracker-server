const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require("dotenv").config()
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.fielwth.mongodb.net/?appName=Cluster0`;

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
		// await client.connect();

		const db = client.db('habit_tracker_db');
		const habitCollection = db.collection('habits');
		const usersCollection = db.collection('users');
		const completionHistoryCollection = db.collection('completed task');

		app.post('/users', async (req, res) => {
			const newUser = req.body;

			const email = req.body.email;
			const query = { email: email };
			const existingUser = await usersCollection.findOne(query);
			if (existingUser) {
				res.send('user already exists, No need to add again');
			} else {
				const result = await usersCollection.insertOne(newUser);
				res.send(result);
			}
		});

		app.delete('/my-habit/:id', async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await habitCollection.deleteOne(query);
			res.send(result);
		});

		app.get('/my-habit', async (req, res) => {
			const email = req.query.email;
			const query = {};
			if (email) {
				query['user.email'] = email;
			}
			const cursor = habitCollection.find(query);
			const result = await cursor.toArray();
			res.send(result);
		});

		app.get('/latest-habits', async (req, res) => {
			const cursor = habitCollection.find().sort({ createdAt: -1 }).limit(6);
			const result = await cursor.toArray();
			res.send(result);
		});
		app.get('/publicHabits', async (req, res) => {
			const cursor = habitCollection.find();
			const result = await cursor.toArray();
			res.send(result);
		});
		app.put('/publicHabits/:id', async (req, res) => {
			const id = req.params.id;
			const data = req.body;
			const query = { _id: new ObjectId(id) };
			const filter = query;
			const update = {
				$set: data,
			};
			const result = await habitCollection.updateOne(filter, update);
			res.send(result);
		});
		app.get('/habits/:id', async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await habitCollection.findOne(query);
			res.send(result);
		});

		app.get('/publicHabits/:id', async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await habitCollection.findOne(query);

			if (!result) {
				return res.status(404).send({ error: 'Habit not found' });
			}

			res.send(result);
		});

		app.patch('/habits/:id/complete', async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };

			const habit = await habitCollection.findOne(query);
			if (!habit) {
				return res.status(404).send({ message: 'Habit not found' });
			}

			const today = new Date();
			const todayStr = today.toLocaleDateString('en-GB').split('/').join('-');

			const completionHistory = habit.progress?.completionHistory || [];

			if (completionHistory.includes(todayStr)) {
				return res.send({ message: 'Already completed for today' });
			}

			completionHistory.push(todayStr);

			const sortedDates = completionHistory.sort(
				(a, b) =>
					new Date(b.split('-').reverse().join('-')) -
					new Date(a.split('-').reverse().join('-'))
			);

			let currentStreak = 1;
			for (let i = 1; i < sortedDates.length; i++) {
				const prev = new Date(
					sortedDates[i - 1].split('-').reverse().join('-')
				);
				const curr = new Date(sortedDates[i].split('-').reverse().join('-'));
				const diffDays = Math.floor((prev - curr) / (1000 * 60 * 60 * 24));

				if (diffDays === 1) currentStreak++;
				else break;
			}

			const bestStreak = Math.max(
				currentStreak,
				habit.progress?.bestStreak || 0
			);

			const updateDoc = {
				$set: {
					'progress.completionHistory': completionHistory,
					'progress.currentStreak': currentStreak,
					'progress.bestStreak': bestStreak,
				},
			};

			const result = await habitCollection.updateOne(query, updateDoc);

			const completionRecord = {
				habitId: id,
				habitName: habit.user?.name,
				userEmail: habit.user?.email,
				date: todayStr,
				completedAt: new Date(),
			};

			await completionHistoryCollection.insertOne(completionRecord);

			res.send({
				message: 'Habit marked complete',
				currentStreak,
				bestStreak,
				completionHistory,
				result,
				savedTo: 'completionHistory collection',
			});
		});

		app.post('/publicHabits', async (req, res) => {
			const newHabit = req.body;
			const result = await habitCollection.insertOne(newHabit);
			res.send(result);
		});

		app.patch('/publicHabits/:id', async (req, res) => {
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


		// handle search
		app.get('/search',async(req,res)=>{
			const search_value = req.query.search
			const result = await habitCollection
				.find({ title: { $regex: search_value , $options: "i" } })
				.toArray();
			res.send(result)
		})


		// await client.db('admin').command({ ping: 1 });
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
