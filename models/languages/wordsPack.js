const { Schema, model, Types } = require('mongoose')

const WordsPackSchema = new Schema({
  title: { type: String, required: true, lowercase: true, trim: true },
  words: [{ 
    word: { type: String, required: true, lowercase: true, trim: true },
    translation: { type: String, required: true, lowercase: true, trim: true },
    example: { type: String, required: true, trim: true },
    level: { type: Number, required: true }
  }],
  language: { type: Types.ObjectId, required: true, ref: 'Language' },
})

module.exports = model('WordsPack', WordsPackSchema)
