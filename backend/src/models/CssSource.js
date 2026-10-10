// guide.md §5.3 — uploadovan CSS organizacije (sirov). Stilizovan rezultat je u Component.styledHtml
const { Schema, model } = require('mongoose');

const cssSourceSchema = new Schema({
  owner: { type: String, required: true, index: true },
  originalFilename: String,
  rawCss: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = model('CssSource', cssSourceSchema, 'css_sources');
