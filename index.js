const request = require('request');
const say = require('say');
const cron = require("node-cron");

var requestData = {
    "operationName": "MessageBufferChatHistory",
    "variables": {
        "channelLogin": "nemdanada"
    },
    "extensions": {
        "persistedQuery": {
            "version": 1,
            "sha256Hash": "323028b2fa8f8b5717dfdc5069b3880a2ad4105b168773c3048275b79ab81e2f"
        }
    }
};

function getCallback(message) {
    return (error) => {
        if (error) {
            return console.error(error)
        }
        console.log(message);
        say.speak(message);
    };
}

async function speak(messages) {
    if (messages !== undefined && messages !== null && messages.length) {
        if (messages.length > 1) {
            const firstMessage = messages.shift();
            let lastSpeak = null;

            for (let index = messages.length; index >= 0; index--) {
                const message = messages[index];
                if (message !== undefined) {
                    let nextCallback = getCallback(message);
                    if (lastSpeak == null) {
                        lastSpeak = nextCallback;
                    } else {
                        let children = lastSpeak;
                        let callback = (error) => {
                            if (error) {
                                return console.error(error)
                            }
                            console.log(message);
                            say.speak(message, undefined, 1, children);
                        };
                        lastSpeak = null;
                        lastSpeak = callback;
                    }
                }
            }
            say.speak(firstMessage, undefined, 1, lastSpeak);
            console.log(firstMessage);
        } else {
            say.speak(messages[0]);
            console.log(messages[0]);
        }
    }
}


async function read(twitchMessages) {
    const messages = [];
    for await (twitchMessage of twitchMessages) {
        var message = twitchMessage.content.text;
        var sender = twitchMessage.sender.displayName;
        var sentAt = twitchMessage.sentAt;
        var dateSent = new Date(sentAt);
        var dateLimitToRead = new Date(Date.now() - 5000);
      
        const readMessage = /^\!botfala/.test(message);
        if (readMessage && dateSent > dateLimitToRead) {
            message = message.replace("!botfala", "");
            messages.push(sender + " falou " + message);
        }
    }
    console.log(messages);
    await speak(messages);
}

function getMessages() {
    return new Promise(function (resolve, reject) {
        request({
            method: 'POST',
            url: 'https://gql.twitch.tv/gql',
            json: requestData,
            headers: {
                'Content-Type': 'application/json',
                'Client-Id': 'kimne78kx3ncx6brgo4mv6wki5h1ko',
                'X-Device-Id': 'KqAmlrqmxMG6TNxyd80phfrvAHFp230J',
                'Authorization': 'OAuth d548p0tlcro75i9coadiworzr32bm8',
                'Accept': '*/*',
                'Origin': 'https://www.twitch.tv'
            },
        }, (err, res, body) => {
            if (err) return reject(e);
            try {
                let twitchMessages = body.data.channel.recentChatMessages;
                resolve(twitchMessages)
            } catch (e) {
                reject(e);
            }
        });
    });
}

async function main() {
    getMessages().then(result => read(result));

}

cron.schedule("*/5 * * * * *", () => {
    console.log("Initializing capture");
    main();
});