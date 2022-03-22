const { Schema, model, Types } = require('mongoose')

const LanguageSchema = new Schema({
  title: { type: String, required: true, lowercase: true, trim: true },
  wordsList: { type: String },
  words: [{ type: Types.ObjectId, required: true, ref: 'Word' }],
  wordsPacks: [{ type: Types.ObjectId, required: true, ref: 'WordsPack' }],
  creator: { type: Types.ObjectId, required: true, ref: 'User' },
  config: {
    lastWordsPackNumber: { type: Number }
  },
})

module.exports = model('Language', LanguageSchema)