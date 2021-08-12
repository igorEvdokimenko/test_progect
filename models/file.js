const mongoose = require('mongoose');
const FileSchema = new mongoose.Schema({
    name: String,
    url: String,
    size: Number,
    type: String
})

module.exports = mongoose.model('File', FileSchema);