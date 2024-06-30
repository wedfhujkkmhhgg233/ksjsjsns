const axios = require("axios");

module.exports.config = {
	name: "sim",
	version: "1",
	hasPermission: 0,
	credits: "https://sim-api-ctqz.onrender.com/",
	description: "sim",
	usages: "Message",
	commandCategory: "...",
	cooldowns: 0
};

module.exports.run = async ({ api, event, args }) => {
	try {
		let message = args.join(" ");
		if (!message) {
			return api.sendMessage(`Please put Message`, event.threadID, event.messageID);
		}

		const response = await axios.get(`https://sim-api-ctqz.onrender.com/sim?query=${message}`);
		const respond = response.data.respond;
		api.sendMessage(respond, event.threadID, event.messageID);
	} catch (error) {
		console.error("An error occurred:", error);
		api.sendMessage("Oops! Something went wrong.", event.threadID, event.messageID);
	}
};
