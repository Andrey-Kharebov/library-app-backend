const { Schema, model, Types } = require('mongoose')

const LanguageSchema = new Schema({
  title: { type: String, required: true, lowercase: true, trim: true },
  wordsList: { type: String },
  creator: { type: Types.ObjectId, required: true, ref: 'User' }
})

module.exports = model('Language', LanguageSchema)