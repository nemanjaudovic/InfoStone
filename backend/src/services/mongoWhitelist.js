// Provera upita koje generise Gemma (guide §7.2 i §13.10):
// dozvoljeni su SAMO whitelist operatori, zabranjeno izvrsavanje koda.
const ALLOWED_OPERATORS = new Set(['$eq', '$gt', '$lt', '$in', '$regex', '$and', '$or']);
// TODO (graph): dodati whitelist za aggregation stage-ove ($match, $group, $sort, $limit, $count)

function assertSafeQuery(value, path = 'query') {
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertSafeQuery(v, `${path}[${i}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, v] of Object.entries(value)) {
      if (key.startsWith('$') && !ALLOWED_OPERATORS.has(key)) {
        const err = new Error(`Nedozvoljen operator ${key} u ${path}`);
        err.status = 400;
        throw err;
      }
      assertSafeQuery(v, `${path}.${key}`);
    }
  }
}

module.exports = { ALLOWED_OPERATORS, assertSafeQuery };
