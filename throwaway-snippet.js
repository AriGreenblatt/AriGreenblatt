// Throwaway scratch file — not wired into the build. Safe to delete.

/** Memoized Fibonacci using a closure-scoped cache. */
function makeFib() {
  const cache = new Map([[0, 0n], [1, 1n]]);
  return function fib(n) {
    if (cache.has(n)) return cache.get(n);
    const value = fib(n - 1) + fib(n - 2);
    cache.set(n, value);
    return value;
  };
}

/** Trailing-edge debounce. */
function debounce(fn, waitMs) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
}

/** Group an array by the key a selector returns. */
const groupBy = (items, keyOf) =>
  items.reduce((acc, item) => {
    const key = keyOf(item);
    // ??= assigns only when the slot is null/undefined, so the first item
    // for a key creates its array and every later one reuses it.
    (acc[key] ??= []).push(item);
    return acc;
  }, {});

const fib = makeFib();
console.log('fib(90) =', fib(90).toString());
console.log(groupBy(['apple', 'avocado', 'banana', 'blueberry'], w => w[0]));

// All three calls land inside the same 100ms window, so only the last
// one ('c') ever fires — that's the point of a trailing-edge debounce.
const logOnce = debounce(msg => console.log('debounced:', msg), 100);
['a', 'b', 'c'].forEach(logOnce);
