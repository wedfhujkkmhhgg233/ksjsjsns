
# ðŸ¥ **Sim-Ph**  

**Sim-Ph** is a powerful Node.js library for interacting with the SimSimi API. It provides seamless integration for chat and teach functionalities, complete with a backup API for enhanced reliability.  

[![Follow on Facebook](https://img.shields.io/badge/Follow-Facebook-blue?style=flat-square&logo=facebook)](https://www.facebook.com/JeromeExpertise)  

---

## âœ¨ **Features**  
- ðŸ”® **Sim API**: Chat with SimSimi to get AI-generated responses.  
- ðŸ“š **Teach API**: Teach SimSimi custom responses for specific queries.  
- ðŸ”„ **Backup API**: Automatically switches to a backup API if the primary API fails.  

---

## ðŸ“¥ **Installation**  

Install the package via npm:  

```bash  
npm install sim-ph  
```  

---

## ðŸš€ **Usage**  

### Importing the Library  

Require the `sim-ph` library in your project:  

```javascript  
const { sim, teach } = require('sim-ph');  
```  

### Sim API Example  

Interact with the SimSimi chat API using the `sim` function:  

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

Teach SimSimi custom responses using the `teach` function:  

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

## ðŸ”„ **Fallback API**  

If the primary API (`https://simsimi-api-pro.onrender.com`) fails, the library automatically switches to the backup API (`https://simsimi.gleeze.com`). This ensures smooth operation.  

---

## ðŸ›¡ï¸ **Error Handling**  

Handle errors gracefully when both APIs fail:  

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

## ðŸ¤ **Contributing**  

Feel free to fork this repository and submit pull requests for improvements or new features.  

---

## ðŸ“œ **License**  

MIT License. See [LICENSE](LICENSE) for details.  

---

## ðŸ‘¤ **Author**  

**Jerome Jamis**  
[![Facebook](https://img.shields.io/badge/Facebook-Jerome-blue?style=flat-square&logo=facebook)](https://www.facebook.com/JeromeExpertise)  
