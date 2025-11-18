// Generate and display Fibonacci numbers up to 100
console.log("Hi this is my first AI code  - Fibonacci sequence up to 100:");

let fib = [0, 1];
while (true) {
    let next = fib[fib.length - 1] + fib[fib.length - 2];
    if (next > 10000) break;
    fib.push(next);
}
console.log(fib);