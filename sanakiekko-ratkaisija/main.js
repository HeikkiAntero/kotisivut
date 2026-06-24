import { KOTUS } from "./cleaned_words.js";

let kotus = filterWords(KOTUS)

/**
 * @param {string[]} words 
 */
function filterWords(words) {
  let arr = []
  for (const w of words) {
    if (w.length > 9 || w.length < 5) continue
    arr.push(w.toUpperCase())
  }
  return arr
}

/**
 * @param {string[]} words 
 */
function inAlphabeth(words) {
  let arr = []
  for (const w of words) {
    let word = w.split('')
    .map(c => c.toUpperCase())
    .sort((a, b) => {
      if (a > b) return 1
      else return -1
    })
    arr.push(word.join(''))
  }
  return arr
}

/**
 * @param {string} elements 
 * @param {number} min 
 * @param {number} max 
 * @returns 
 */
function combinations(elements, min, max) {
  elements = elements.split('')
  const results = [];

  function backtrack(start, current) {
    if (current.length >= min) {
      results.push([...current].join(''));
    }

    if (current.length === max) return;

    for (let i = start; i < elements.length; i++) {
      current.push(elements[i]);
      backtrack(i + 1, current);
      current.pop(); // peruuta valinta
    }
  }

  backtrack(0, []);
  return results;
}

/**
 * @param {string[]} possible 
 * @param {string[]} words 
 */
function findWords(possible, words) {
  let arr = []
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w.length > 9 || w.length < 5) continue
    let found = false
    for (let p of possible) {
      if (p === w) {
        arr.push(i)
        break
      }
    }
  }
  return arr
}
/**
 * @param {number[]} indexes 
 */
function showWords(indexes) {
  let arr = indexes.map(i => KOTUS[i])
  // poista duplikaatit, koska niitä voi olla jostakin syystä kielitoimiston listassa
  return (new Set(arr)).values()
}

const paramsString = window.location.search;
const searchParams = new URLSearchParams(paramsString);
const letters = searchParams.get("letters")
const visibleLetters = letters ? letters.toUpperCase() : ""

const app = document.createElement("main");
const title = document.createElement("h1");
title.textContent = "Löydetyt sanat";
app.appendChild(title);

const lettersLabel = document.createElement("p");
lettersLabel.textContent = `Käytetyt kirjaimet: ${visibleLetters || "-"}`;
app.appendChild(lettersLabel);

if (!letters || letters.length !== 9) {
  const message = document.createElement("p");
  message.textContent = "Lisää osoitteeseen ?letters=... 9 kirjainta, jotta sanat voidaan hakea.";
  app.appendChild(message);
  document.body.appendChild(app);
} else {
  let possiblities = combinations(letters, 5, letters.length);
  const kotusSanat = inAlphabeth(KOTUS)

  possiblities = inAlphabeth(possiblities)
  const ww = findWords(possiblities, kotusSanat)

  const foundWords = showWords(ww)

  const list = document.createElement("ol");
  for (const word of foundWords) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = `https://www.kielitoimistonsanakirja.fi/#/${encodeURIComponent(word)}`;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = word;
    item.appendChild(link);
    list.appendChild(item);
  }

  app.appendChild(list);
  document.body.appendChild(app);
}
