const { Schema, model, Types } = require('mongoose')

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 5 },
  languages: [ String ]
})

module.exports = model('User', UserSchema)