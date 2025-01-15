const mongoose = require('mongoose');


const commentSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post', // Reference to the post model
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the user model
        required: true
    },
    rating: { type: Number, min: 1, max: 5 }, // Rating between 1 and 5
});
module.exports = mongoose.model('Comment', commentSchema);