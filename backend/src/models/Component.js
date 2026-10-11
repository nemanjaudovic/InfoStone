// guide.md §5.2
const { Schema, model } = require('mongoose');

const componentSchema = new Schema({
  owner: { type: String, required: true, index: true },
  type: { type: String, enum: ['form', 'tableview', 'search', 'graph', 'chatbot'], required: true },
  index: { type: Number, required: true },
  collectionName: { type: String, required: true, unique: true }, // {owner}_{type}_{index}
  title: { type: String, default: '' },
  schema: { type: Schema.Types.Mixed, default: {} }, // polja forme / kolone / config grafikona
  sensitive: { type: Boolean, default: false },
  passwordHash: { type: String, default: null },
  promptEnabled: { type: Boolean, default: false },
  cssSourceId: { type: Schema.Types.ObjectId, ref: 'CssSource', default: null },
  // Rezultat "Primeni stil": Gemma spoji HTML komponente + CSS organizacije u jedan stilizovan HTML.
  // Cuva se jednom (na klik), embed ruta ga samo servira. Prazno = stil jos nije primenjen.
  styledHtml: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = model('Component', componentSchema, 'components');
