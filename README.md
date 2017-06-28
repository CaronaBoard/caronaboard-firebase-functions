# Caronaboard Firebase Functions

This repo holds the backend functions for caronaboard firebase, for triggering notifications for example

## Deploy and test

This sample comes with a web-based UI for testing the function. To test it out:

 1. You must have the Firebase CLI installed. If you don't have it install it with `npm install -g firebase-tools` and then configure it with `firebase login`.
 1. Configure the CLI locally by using `firebase use --add` and select the project in the list.
 1. Install dependencies locally by running: `cd functions; npm install; cd -`
 1. Test it locally with `firebase serve --only functions`
 1. Deploy your project using `firebase deploy`
 1. Open the app using `firebase open hosting:site`, this will open a browser.
 1. Start following a user, this will send a notification to him.
