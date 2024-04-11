const mongoose = require('mongoose');

const PostSchema = mongoose.Schema({
    username: {
        type: String
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    contentType: {
        type: String,
        enum: ['image', 'video'],
        required: true
    },
    imageUrl: {
        type: String
    },
    videoUrl: {
        type: String
    },
    postSong: {
        type: String
    },
    caption: {
        type: String
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Like' }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Post = mongoose.model('Post', PostSchema);
module.exports = Post;
