export function normalizeMedicineName(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

// These keys are for searching only. Similar names remain separate medicines.
function searchKey(value: string) {
  return value
    .replace(/th|dh/g, "t")
    .replace(/ch/g, "s")
    .replace(/d/g, "t")
    .replace(/b/g, "p")
    .replace(/([aeiou])\1+/g, "$1");
}

function hasCloseSubstring(name: string, query: string, maxEdits: number) {
  if (query.length > name.length + maxEdits) return false;
  let previous = Array.from({ length: query.length + 1 }, (_, i) => i);
  let beforePrevious = previous;
  for (let position = 0; position < name.length; position++) {
    const letter = name[position];
    // A zero start cost allows the query to match anywhere in a longer name.
    const current = [0];
    for (let i = 1; i <= query.length; i++) {
      current[i] = Math.min(
        previous[i] + 1,
        current[i - 1] + 1,
        previous[i - 1] + Number(query[i - 1] !== letter),
      );
      if (
        position > 0 &&
        i > 1 &&
        letter === query[i - 2] &&
        name[position - 1] === query[i - 1]
      ) {
        current[i] = Math.min(current[i], beforePrevious[i - 2] + 1);
      }
    }
    if (current[query.length] <= maxEdits) return true;
    beforePrevious = previous;
    previous = current;
  }
  return false;
}

export function medicineNameMatches(name: string, query: string) {
  const normalizedQuery = normalizeMedicineName(query);
  if (normalizedQuery.length < 2) return false;
  const normalizedName = normalizeMedicineName(name);
  if (normalizedName.includes(normalizedQuery)) return true;

  const queryNumbers = normalizedQuery.match(/\p{N}+/gu) ?? [];
  const nameNumbers = normalizedName.match(/\p{N}+/gu) ?? [];
  if (
    queryNumbers.length > 0 &&
    (queryNumbers.length !== nameNumbers.length ||
      queryNumbers.some((number, i) => number !== nameNumbers[i]))
  ) {
    return false;
  }

  const queryLetters = normalizedQuery.replace(/\p{N}/gu, "");
  if (!/^[a-z]+$/.test(queryLetters)) return false;
  const needle = searchKey(queryLetters);
  const haystack = searchKey(normalizedName.replace(/\p{N}/gu, ""));
  if (needle.length < 3) return false;
  if (haystack.includes(needle)) return true;
  if (needle.length < 5) return false;
  return hasCloseSubstring(haystack, needle, needle.length < 9 ? 1 : 2);
}
