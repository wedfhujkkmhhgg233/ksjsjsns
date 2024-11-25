# Sim-Ph

**Sim-Ph** is a simple Node.js library that allows you to interact with the SimSimi API. It supports the primary SimSimi chat and teach functionalities, with a fallback to a backup API in case the primary API is unavailable.

---

## Features
- **Sim API**: Chat with SimSimi and get AI-generated responses.
- **Teach API**: Teach SimSimi custom responses for specific queries.
- **Backup API**: Automatically switches to a backup API if the primary API fails.

---

## Installation

You can install the package via npm:

```bash
npm install sim-ph
```

---

## Usage

### Importing the Library

To use the SimSimi functionality, require the `sim-ph` library in your project:

```javascript
const { sim, teach } = require('sim-ph');
```

### Sim API Example

Use the `sim` function to interact with the SimSimi chat API. The function takes a `query` string and returns SimSimi's response.

```javascript
const { sim } = require('sim-ph');

async function chatWithSim() {
  const query = 'hi';
  try {
    const response = await sim(query);
    console.log('SimSimi says:', response);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

chatWithSim();
```

**Output Example:**

```bash
SimSimi says: Hello! How can I assist you today?
```

### Teach API Example

Use the `teach` function to teach SimSimi custom responses. The function takes two parameters: `ask` (the question) and `ans` (the answer).

```javascript
const { teach } = require('sim-ph');

async function teachSim() {
  const ask = 'how are you?';
  const ans = 'I am doing great!';
  try {
    const response = await teach(ask, ans);
    console.log('Teach Response:', response);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

teachSim();
```

**Output Example:**

```bash
Teach Response: { status: 'success', message: 'Sim has learned a new response!' }
```

---

## Fallback API

Both the `sim` and `teach` functions use a backup API. If the primary SimSimi API (`https://simsimi-api-pro.onrender.com`) fails, the library will automatically switch to the backup API (`https://simsimi.gleeze.com`).

This ensures that your application continues working smoothly, even if the primary API is temporarily unavailable.

---

## Error Handling

If both the primary and backup APIs fail, an error will be thrown:

```javascript
const { sim } = require('sim-ph');

async function chatWithSim() {
  try {
    const response = await sim('hello');
    console.log(response);
  } catch (error) {
    console.error('Both primary and backup APIs failed:', error.message);
  }
}

chatWithSim();
```

**Output Example (if both APIs fail):**

```bash
Both primary and backup APIs failed: Both primary and backup APIs failed
```

---

## Contributing

Feel free to fork this repository and submit pull requests for improvements or new features.

---

## License

MIT License. See [LICENSE](LICENSE) for more information.

---

## Author

**Jerome Jamis**

[Twitter](https://twitter.com/jerome_jamis) | [GitHub](https://github.com/jeromejamis)
