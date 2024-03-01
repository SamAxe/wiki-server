/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
/*
 * Federated Wiki : Node Server
 *
 * Copyright Ward Cunningham and other contributors
 * Licensed under the MIT license.
 * https://github.com/fedwiki/wiki-server/blob/master/LICENSE.txt
*/

// **random_id.coffee**
// Simple random hex generator, takes an optional number of
// chars that defaults to 16 and returns a random id.

const random_id = function(chars) {
  if (chars == null) { chars = 16; }
  return __range__(0, chars, false).map( () => Math.floor(Math.random() * 16).toString(16)).join('');
};

module.exports = (random_id.random_id = random_id);

function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}