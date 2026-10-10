// guide.md §5.5 (opciono)
const { Schema, model } = require('mongoose');

const searchHistorySchema = new Schema({
  componentId: { type: Schema.Types.ObjectId, ref: 'Component', index: true },
  prompt: String,
  results: [{ title: String, url: String, snippet: String }],
  searchedAt: { type: Date, default: Date.now },
});

module.exports = model('SearchHistory', searchHistorySchema, 'search_history');
