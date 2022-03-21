const { Schema, model, Types } = require('mongoose')

const UserSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true, minlength: 5 },
  languages: [{ type: Types.ObjectId, required: true, ref: 'Language' }]
})

module.exports = model('User', UserSchema)



// added remove wordspacks functionality when removes language