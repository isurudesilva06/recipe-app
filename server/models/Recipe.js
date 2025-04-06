const mongoose = require('mongoose');

const RecipeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
  },
  ingredients: {
    type: [String],
    required: [true, 'Please add ingredients'],
  },
  instructions: {
    type: [String],
    required: [true, 'Please add instructions'],
  },
  imageUrl: {
    type: String,
    default: 'https://via.placeholder.com/150',
  },
  servings: {
    type: Number,
    required: [true, 'Please add number of servings'],
  },
  prepTime: {
    type: Number,
    required: [true, 'Please add preparation time'],
  },
  cookTime: {
    type: Number,
    required: [true, 'Please add cooking time'],
  },
  totalTime: {
    type: Number,
    required: [true, 'Please add total time'],
  },
  cuisine: {
    type: String,
    default: 'Mixed',
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium',


  },
  // In models/Recipe.js
imageUrl: {
  type: String,
  required: false, // Not required to avoid validation issues
  default: 'https://picsum.photos/600/400',
},
  nutritionalInfo: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fats: Number,
    fiber: Number,
  },
  ratings: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    value: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    comment: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  averageRating: {
    type: Number,
    default: 0,
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Calculate average rating when a new rating is added
RecipeSchema.pre('save', function(next) {
  if (this.ratings.length > 0) {
    this.averageRating = this.ratings.reduce((acc, item) => acc + item.value, 0) / this.ratings.length;
  }
  next();
});

module.exports = mongoose.model('Recipe', RecipeSchema);