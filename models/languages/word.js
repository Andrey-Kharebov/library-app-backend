const { Schema, model, Types } = require('mongoose')

const WordSchema = new Schema({
  word: { type: String, required: true, lowercase: true, trim: true },
  translation: { type: String, required: true, lowercase: true, trim: true },
  example: { type: String, required: true, trim: true },
  language: { type: Types.ObjectId, required: true, ref: 'Language' }
})

module.exports = model('Word', WordSchema)
