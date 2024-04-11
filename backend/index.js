const express = require('express')
const multer = require('multer')
const path = require('path');
const connectDb = require('./config/db')
const app = express()
const cors = require('cors')
const bcrypt = require("bcryptjs")
const User = require('./Model/UserSchema')
const Post = require('./Model/PostSchema')
const session = require("express-session")

connectDb()

const corsOptions = {
  origin: "http://localhost:3000",
  credentials: true, // Allow cookies and credentials
};
app.use(cors(corsOptions));
app.use(express.json())
app.use(
  session({
    secret: "qw1er2ty3ui4op5", // Replace with a secure secret key
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false, // Set to true for HTTPS
    },
  })
);
const storage = multer.diskStorage({
  destination: '../frontend/public/uploads/',
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Upload endpoint
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const imageUrl = req.file.path; // Get the path of the uploaded image
    const userId = req.session.userId; // Get the ID of the current user (assuming u1\-ser is authenticated)
    console.log(userId);
    const contentType = req.body.contentType; // Extract contentType from request body

    // Save the imageUrl, userId, and contentType in the database
    const user = await User.findById({_id:userId})
    console.log(user,user.username);
    const post = new Post({ username: user.username,userId: userId, imageUrl: imageUrl, contentType: contentType });
    await post.save();
    await User.findByIdAndUpdate(userId, { $push: { posts: post._id } });
    res.status(201).json({ imageUrl: imageUrl });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});
app.post("/signup", async function (req, res) {
  try {
    const { name, email, password,username } = req.body;
    if(email && password) {

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name: name,
      email: email,
      password: hashedPassword,
      username: username 
    });

    const registeredUser = await User.findOne({ email: email });
    if (registeredUser) {
      res.status(400).json({ errorMessage: "User already registered!" });
    } else {
      newUser.save();
      req.session.userId = newUser._id; // Store user ID in the session
      res.status(200).json({message: "User registered successfully" });
      console.log("User registered successfully");
    }
  }
  else{
    res.status(400).json({ errorMessage: "Email and Password Required!" });
  }
  } catch (error) {
    console.error(error);
    res.status(500).json({ errorMessage: "Error registering user." });
  }
});
app.post("/signin", async function (req, res) {
  try {
    const { email, password } = req.body;
    const registeredUser = await User.findOne({ email: email });
    if (registeredUser) {
      const isPasswordValid = await bcrypt.compare(password, registeredUser.password);
      if (isPasswordValid === true) {
        req.session.userId = registeredUser._id; // Store user ID in the session
        res.status(200).json({message: "User logged in successfully" });
        console.log("User logged in successfully");
      } else {
        res.status(400).json({ errorMessage: "Invalid email or password" });
      }
    } else {
      res.status(400).json({ errorMessage: "User not registered" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ errorMessage: "Error logging in user." });
  }
});
app.get("/get-user",async function(req,res) {
  try {
    const user = await User.findOne({_id: req.session.userId});
    res.status(200).json({user: user});
  } catch (error) {
    console.error(error);
    res.status(500).json({errorMessage: "Error getting user details."});
  }
})
app.get("/get-profile", async function(req, res) {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ errorMessage: "Username parameter is required." });
    }

    const user = await User.findOne({ username: username });
    if (!user) {
      return res.status(404).json({ errorMessage: "User not found." });
    }

    res.status(200).json({ user: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ errorMessage: "Error getting user details." });
  }
});

app.get("/search", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ errorMessage: "Search query is required." });
    }

    const regex = new RegExp(query, "i"); // Case-insensitive search
    const searchResults = await User.find({
      $or: [
        { name: { $regex: regex } },
        { email: { $regex: regex } },
        { username: { $regex: regex } }
      ]
    });
    res.status(200).json({ searchResults });
  } catch (error) {
    console.error(error);
    res.status(500).json({ errorMessage: "Error performing search!" });
  }
});
app.get('/fetch-posts', async (req, res) => {
  try {
    const userId = req.session.userId;
    const posts = await Post.find({ userId: { $ne: userId } });
    res.status(200).json({ posts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ errorMessage: "Error fetching posts!" });
  }
});
app.post('/like-post/:postId', async (req, res) => {
  const { postId } = req.params;
  const userId = req.session.userId;
  console.log(postId,userId);

  try {
      // Check if the post exists
      const post = await Post.findById(postId);
      if (!post) {
          return res.status(404).json({ error: 'Post not found' });
      }

      // Check if the user has already liked the post
      const alreadyLiked = post.likes.includes(userId);
      if (alreadyLiked) {
          return res.status(400).json({ error: 'You have already liked this post' });
      }

      // Add user's like to the post
      post.likes.push(userId);
      await post.save();

      res.status(200).json({ message: 'Post liked successfully' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
  }
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});